/**
 * Schema introspector — reads Prisma DMMF to return typed model metadata.
 *
 * Returns model-level information (fields, relations, enum values) for any
 * Prisma model without running database queries. Uses the same DMMF source
 * as columnMeta.ts but produces the richer ModelSchema shape needed by
 * builder mode (US-204 AC-1).
 *
 * Results are cached per model name (AC-3 — schema is immutable at runtime).
 *
 * Implements US-204.
 */

import { Prisma } from '@prisma/client';

// ─── Output types ────────────────────────────────────────────────────────────

/**
 * The simplified scalar/enum type label exposed by the introspection API.
 * Matches the ColumnMeta type union from US-202 for consistency.
 */
export type FieldType = 'String' | 'Int' | 'Float' | 'DateTime' | 'Boolean' | 'Enum';

/**
 * Relation cardinality — hasOne when the relation stores a single record,
 * hasMany when it can store multiple records.
 */
export type RelationType = 'hasOne' | 'hasMany';

/**
 * Metadata for a single scalar or enum field on a Prisma model.
 * Corresponds to US-204 AC-1 field shape.
 */
export interface FieldMeta {
  /** Field name as declared in the Prisma schema. */
  name: string;
  /** Simplified type label. */
  type: FieldType;
  /** True when the field is not optional (required in Prisma schema). */
  isRequired: boolean;
  /** True when this field is the model's @id. */
  isId: boolean;
  /** True when this field is a foreign key scalar (listed in @relation's fields). */
  isForeignKey: boolean;
  /**
   * When isForeignKey is true: the Prisma model name of the related model.
   * Undefined for non-FK fields.
   */
  relatedModel?: string;
  /**
   * When type is 'Enum': the list of allowed string values.
   * Undefined for non-enum fields.
   */
  enumValues?: string[];
}

/**
 * Metadata for a single relation field on a Prisma model.
 * Corresponds to US-204 AC-1 relation shape.
 */
export interface RelationMeta {
  /** Relation field name as declared in the Prisma schema. */
  name: string;
  /** hasOne = singular reference, hasMany = list reference. */
  type: RelationType;
  /** Prisma model name of the related model. */
  relatedModel: string;
  /**
   * The scalar foreign-key field name(s) on *this* model that back the relation.
   * Empty array for virtual back-relations (hasMany without a FK on this side).
   */
  foreignKey: string[];
}

/**
 * Complete introspected schema for a single Prisma model.
 * Returned by getModelSchema() and by the /api/workspace/data/schema route.
 */
export interface ModelSchema {
  /** Prisma model name (e.g. "User", "ApiKey"). */
  name: string;
  /** All scalar and enum fields (relation object fields excluded). */
  fields: FieldMeta[];
  /** All relation fields declared on the model. */
  relations: RelationMeta[];
}

// ─── Internal DMMF shape (minimal) ───────────────────────────────────────────

/** Minimal typing for a DMMF field entry. */
interface DmmfField {
  name: string;
  kind: 'scalar' | 'object' | 'enum' | 'unsupported';
  type: string;
  isRequired: boolean;
  isId: boolean | undefined;
  isList: boolean;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
}

/** Minimal typing for a DMMF enum entry. */
interface DmmfEnum {
  name: string;
  values: Array<{ name: string }>;
}

/** Minimal typing for a DMMF model entry. */
interface DmmfModel {
  name: string;
  fields: DmmfField[];
}

// ─── Scalar type map ─────────────────────────────────────────────────────────

/** Map from Prisma scalar type names to the simplified FieldType enum. */
const SCALAR_TYPE_MAP: Record<string, FieldType> = {
  String: 'String',
  Int: 'Int',
  Float: 'Float',
  BigInt: 'Int',    // treat BigInt as Int for display purposes
  Decimal: 'Float', // treat Decimal as Float for display purposes
  DateTime: 'DateTime',
  Boolean: 'Boolean',
};

// ─── Cache ────────────────────────────────────────────────────────────────────

/** In-memory cache: model name → ModelSchema. */
const schemaCache = new Map<string, ModelSchema>();

// ─── Enum value lookup ────────────────────────────────────────────────────────

/** Lazy-built enum value map: enum type name → string values. */
let enumValueMap: Map<string, string[]> | null = null;

function getEnumValues(enumName: string): string[] {
  if (!enumValueMap) {
    enumValueMap = new Map<string, string[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enums = (Prisma.dmmf.datamodel.enums as any[]) as DmmfEnum[];
    for (const e of enums) {
      enumValueMap.set(e.name, e.values.map((v) => v.name));
    }
  }
  return enumValueMap.get(enumName) ?? [];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all Prisma model names available in the DMMF.
 *
 * Used by the /models route and for table name validation.
 */
export function getModelList(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Prisma.dmmf.datamodel.models as any[]).map((m: { name: string }) => m.name as string);
}

/**
 * Returns the full ModelSchema for the given Prisma model name.
 *
 * Results are cached after the first call (AC-3).
 *
 * @param modelName - Case-sensitive Prisma model name (e.g. "User").
 * @returns ModelSchema with fields and relations.
 * @throws If the model name is not found in the DMMF.
 */
export function getModelSchema(modelName: string): ModelSchema {
  const cached = schemaCache.get(modelName);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (Prisma.dmmf.datamodel.models as any[]).find(
    (m: { name: string }) => m.name === modelName,
  ) as DmmfModel | undefined;

  if (!model) {
    throw new Error(`Unknown Prisma model: "${modelName}"`);
  }

  // Pass 1: collect FK scalar field names and their related models from relation fields
  const fkFields = new Map<string, string>(); // scalar field name → related model name
  for (const field of model.fields) {
    if (field.kind === 'object' && field.relationName && field.relationFromFields) {
      for (const fromField of field.relationFromFields) {
        fkFields.set(fromField, field.type);
      }
    }
  }

  // Pass 2: build FieldMeta[] from scalar/enum fields
  const fields: FieldMeta[] = [];
  for (const field of model.fields) {
    if (field.kind === 'object') continue; // relation object fields handled separately

    const isEnum = field.kind === 'enum';
    const mappedType = isEnum ? 'Enum' : SCALAR_TYPE_MAP[field.type];

    // Skip unknown scalar types (e.g. 'Unsupported') gracefully
    if (!mappedType) continue;

    const fieldMeta: FieldMeta = {
      name: field.name,
      type: mappedType,
      isRequired: field.isRequired,
      isId: field.isId ?? false,
      isForeignKey: fkFields.has(field.name),
      relatedModel: fkFields.get(field.name),
    };

    if (isEnum) {
      fieldMeta.enumValues = getEnumValues(field.type);
    }

    fields.push(fieldMeta);
  }

  // Pass 3: build RelationMeta[] from object fields
  const relations: RelationMeta[] = [];
  for (const field of model.fields) {
    if (field.kind !== 'object') continue;
    // Only include named relations (back-reference virtual fields also included)
    relations.push({
      name: field.name,
      type: field.isList ? 'hasMany' : 'hasOne',
      relatedModel: field.type,
      foreignKey: field.relationFromFields ?? [],
    });
  }

  const schema: ModelSchema = { name: model.name, fields, relations };
  schemaCache.set(modelName, schema);
  return schema;
}

/**
 * Returns only the scalar fields for a model — excludes relation metadata.
 * Convenience wrapper used when only field names are needed.
 *
 * @param modelName - Case-sensitive Prisma model name.
 */
export function getModelFields(modelName: string): FieldMeta[] {
  return getModelSchema(modelName).fields;
}

/**
 * Returns only the relation metadata for a model.
 *
 * @param modelName - Case-sensitive Prisma model name.
 */
export function getModelRelations(modelName: string): RelationMeta[] {
  return getModelSchema(modelName).relations;
}

/**
 * Clear the schema cache. Intended for use in tests only.
 * @internal
 */
export function _clearSchemaCache(): void {
  schemaCache.clear();
  enumValueMap = null;
}

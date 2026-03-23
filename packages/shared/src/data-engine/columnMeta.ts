/**
 * Column metadata extractor — reads Prisma DMMF to build ColumnMeta[].
 *
 * DMMF (Data Model Meta Format) is Prisma's introspected schema representation,
 * available at runtime via `import { Prisma } from '@prisma/client'`.
 *
 * The result is cached per model name (schema doesn't change at runtime).
 *
 * Implements US-202 AC-7.
 */

import { Prisma } from '@prisma/client';
import type { ColumnMeta } from './types';

/** In-memory cache: model name → ColumnMeta[]. */
const cache = new Map<string, ColumnMeta[]>();

/** Prisma scalar types we can map to ColumnMeta.type. */
const SCALAR_TYPE_MAP: Record<string, ColumnMeta['type']> = {
  String: 'String',
  Int: 'Int',
  Float: 'Float',
  BigInt: 'Int', // treat BigInt as Int for display purposes
  Decimal: 'Float', // treat Decimal as Float for display purposes
  DateTime: 'DateTime',
  Boolean: 'Boolean',
};

/**
 * Returns ColumnMeta[] for the given Prisma model name.
 * Results are cached after first call.
 *
 * Only scalar fields are included; pure relation fields (object references)
 * are omitted — the FK scalar field carries `isForeignKey: true` instead.
 *
 * @param modelName - Case-sensitive Prisma model name (e.g. "User", "ApiKey").
 * @returns Array of ColumnMeta for all scalar fields on the model.
 * @throws If the model name is not found in the DMMF.
 */
export function getColumnMeta(modelName: string): ColumnMeta[] {
  const cached = cache.get(modelName);
  if (cached) return cached;

  // Prisma.dmmf is typed only after `prisma generate`. Cast to avoid noImplicitAny
  // on the callback parameter — the runtime type is DMMF.Model.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (Prisma.dmmf.datamodel.models as any[]).find((m: { name: string }) => m.name === modelName) as
    | {
        name: string;
        fields: Array<{
          name: string;
          kind: string;
          type: string;
          isRequired: boolean;
          isId: boolean | undefined;
          relationName?: string;
          relationFromFields?: string[];
        }>;
      }
    | undefined;
  if (!model) {
    throw new Error(`Unknown Prisma model: "${modelName}"`);
  }

  // Collect the set of FK scalar field names from relation fields
  const fkFields = new Set<string>();
  const fkRelatedModel = new Map<string, string>();

  for (const field of model.fields) {
    if (field.relationName && field.relationFromFields) {
      for (const fromField of field.relationFromFields) {
        fkFields.add(fromField);
        fkRelatedModel.set(fromField, field.type);
      }
    }
  }

  const metas: ColumnMeta[] = [];

  for (const field of model.fields) {
    // Skip relation object fields (non-scalar)
    if (field.kind === 'object') continue;

    const isEnum = field.kind === 'enum';
    const mappedType = isEnum ? 'Enum' : SCALAR_TYPE_MAP[field.type];

    // Skip unknown scalar types gracefully
    if (!mappedType) continue;

    metas.push({
      name: field.name,
      type: mappedType,
      nullable: !field.isRequired,
      isPrimaryKey: field.isId ?? false,
      isForeignKey: fkFields.has(field.name),
      relatedModel: fkFields.has(field.name)
        ? fkRelatedModel.get(field.name)
        : undefined,
    });
  }

  cache.set(modelName, metas);
  return metas;
}

/**
 * Returns all Prisma model names from the DMMF.
 * Used for table name validation in the query route.
 */
export function getModelNames(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Prisma.dmmf.datamodel.models as any[]).map((m: { name: string }) => m.name as string);
}

/**
 * Returns only the String-typed column names for a model.
 * Used by the search translator to build OR clauses.
 */
export function getStringColumns(modelName: string): string[] {
  const metas = getColumnMeta(modelName);
  return metas.filter((c) => c.type === 'String').map((c) => c.name);
}

/**
 * Clear the column meta cache. Intended for use in tests only.
 * @internal
 */
export function _clearCache(): void {
  cache.clear();
}

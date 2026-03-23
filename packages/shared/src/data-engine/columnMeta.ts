/**
 * columnMeta — extract ColumnMeta from Prisma DMMF.
 *
 * Uses the Prisma DMMF (Data Model Meta Format) to introspect the schema
 * at runtime. This avoids hard-coding column lists for each model.
 *
 * Implements VASTU-2A-202d.
 */

import { Prisma } from '@prisma/client';
import type { ColumnMeta } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract ColumnMeta for all fields of a given Prisma model name.
 *
 * @param modelName  The Prisma model name (PascalCase, e.g. "Driver", "Race").
 * @returns Array of ColumnMeta — one per field (including relation fields).
 *   Returns an empty array when the model is not found in the DMMF.
 */
export function extractColumnMeta(modelName: string): ColumnMeta[] {
  const model = Prisma.dmmf.datamodel.models.find(
    (m) => m.name === modelName,
  );

  if (!model) return [];

  return model.fields.map((field): ColumnMeta => {
    const isForeignKey = isForeignKeyField(field, model);
    const relatedModel = field.relationName
      ? (field.type as string)
      : isForeignKey
        ? getRelatedModelForFk(field, model)
        : undefined;

    return {
      name: field.name,
      type: field.relationName ? 'relation' : (field.type as string),
      nullable: !field.isRequired,
      isPrimaryKey: field.isId ?? false,
      isForeignKey,
      relatedModel,
    };
  });
}

/**
 * Get all Prisma model names known to the DMMF.
 * Used to build the allowed-table whitelist in the API route.
 */
export function getAllModelNames(): string[] {
  return Prisma.dmmf.datamodel.models.map((m) => m.name);
}

/**
 * Find a model name by its lowercased/camelCase variant.
 * Handles: "driver" → "Driver", "raceResult" → "RaceResult".
 */
export function resolveModelName(tableParam: string): string | null {
  // Exact match first
  const exact = Prisma.dmmf.datamodel.models.find((m) => m.name === tableParam);
  if (exact) return exact.name;

  // Case-insensitive match
  const lower = tableParam.toLowerCase();
  const insensitive = Prisma.dmmf.datamodel.models.find(
    (m) => m.name.toLowerCase() === lower,
  );
  return insensitive?.name ?? null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type DmmfField = (typeof Prisma.dmmf.datamodel.models)[number]['fields'][number];
type DmmfModel = (typeof Prisma.dmmf.datamodel.models)[number];

/**
 * A field is considered a foreign key when it is a scalar that is referenced
 * by a relation field's `relationFromFields`.
 */
function isForeignKeyField(field: DmmfField, model: DmmfModel): boolean {
  if (field.relationName) return false; // relation fields themselves are not FKs

  return model.fields.some(
    (f) =>
      f.relationName !== undefined &&
      Array.isArray(f.relationFromFields) &&
      f.relationFromFields.includes(field.name),
  );
}

/**
 * For a scalar FK field, find the related model by looking at the relation
 * field that references it.
 */
function getRelatedModelForFk(
  field: DmmfField,
  model: DmmfModel,
): string | undefined {
  const relationField = model.fields.find(
    (f) =>
      f.relationName !== undefined &&
      Array.isArray(f.relationFromFields) &&
      f.relationFromFields.includes(field.name),
  );
  return relationField?.type as string | undefined;
}

/**
 * searchTranslator — pure function: (searchTerm, stringColumns) → Prisma where OR clause.
 *
 * Global text search is implemented as an OR condition across all string-type
 * columns using case-insensitive contains (Prisma mode: 'insensitive').
 *
 * Example:
 *   translateSearch('hamilton', ['firstName', 'lastName', 'nationality'])
 *   →
 *   {
 *     OR: [
 *       { firstName: { contains: 'hamilton', mode: 'insensitive' } },
 *       { lastName: { contains: 'hamilton', mode: 'insensitive' } },
 *       { nationality: { contains: 'hamilton', mode: 'insensitive' } },
 *     ]
 *   }
 *
 * No database access. Pure function. Unit-testable without any DB connection.
 *
 * Implements VASTU-2A-202c.
 */

import type { PrismaWhere } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Translate a global search term into a Prisma `where` OR clause across
 * all provided string columns.
 *
 * @param search        The search term. Returns `{}` when empty/null.
 * @param stringColumns Column names that should be searched.
 *   Only String-type scalar columns should be included; passing numeric or
 *   boolean columns here will produce invalid Prisma queries.
 * @returns Prisma `where` object, or `{}` when search is empty.
 */
export function translateSearch(
  search: string | null | undefined,
  stringColumns: string[],
): PrismaWhere {
  if (!search || search.trim() === '') return {};
  if (stringColumns.length === 0) return {};

  const term = search.trim();

  const conditions = stringColumns.map((column) => ({
    [column]: { contains: term, mode: 'insensitive' as const },
  }));

  if (conditions.length === 1) return conditions[0];

  return { OR: conditions };
}

// ---------------------------------------------------------------------------
// Helper: extract string column names from ColumnMeta array
// ---------------------------------------------------------------------------

/**
 * Extract names of String-type, non-nullable or nullable scalar columns
 * from a ColumnMeta array. Relation columns and non-string columns are excluded.
 *
 * Use this with the output of `extractColumnMeta` to build the stringColumns
 * argument for `translateSearch`.
 */
export function getStringColumnNames(
  columns: Array<{ name: string; type: string; isForeignKey: boolean }>,
): string[] {
  return columns
    .filter((col) => col.type === 'String' && !col.isForeignKey)
    .map((col) => col.name);
}

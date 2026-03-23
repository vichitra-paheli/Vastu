/**
 * sortTranslator — pure function: SortConfig[] → Prisma orderBy array.
 *
 * Supports:
 *   - Simple column sort: { column: 'name', direction: 'asc' }
 *     → { name: 'asc' }
 *
 *   - Nested relation sort via dot-path: { column: 'driver.lastName', direction: 'asc' }
 *     → { driver: { lastName: 'asc' } }
 *
 *   - Multi-level nesting: { column: 'race.circuit.name', direction: 'desc' }
 *     → { race: { circuit: { name: 'desc' } } }
 *
 * No database access. Pure function. Unit-testable without any DB connection.
 *
 * Implements VASTU-2A-202c.
 */

import type { SortConfig, SortDirection, PrismaOrderBy } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Translate an array of SortConfig entries into a Prisma `orderBy` array.
 *
 * @param sorts   Multi-column sort specification (order matters).
 * @param allowedColumns  Allowlist of top-level column names (dot-paths allowed).
 *   Any sort entry whose top-level column is NOT in this set is skipped.
 *   Pass an empty array to skip validation.
 * @returns Prisma `orderBy` array (empty array when no valid sorts).
 */
export function translateSort(
  sorts: SortConfig[],
  allowedColumns: string[] = [],
): PrismaOrderBy[] {
  const allowSet = allowedColumns.length > 0 ? new Set(allowedColumns) : null;

  return sorts
    .filter((s) => isValidSort(s, allowSet))
    .map((s) => buildOrderByEntry(s.column, s.direction));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isValidSort(sort: SortConfig, allowSet: Set<string> | null): boolean {
  if (!sort.column || typeof sort.column !== 'string') return false;
  if (sort.direction !== 'asc' && sort.direction !== 'desc') return false;

  if (allowSet !== null) {
    // For dot-paths, validate against the top-level segment
    const topLevel = sort.column.split('.')[0];
    if (!allowSet.has(topLevel) && !allowSet.has(sort.column)) return false;
  }

  return true;
}

/**
 * Build a single Prisma orderBy entry from a column path and direction.
 *
 * Dot-paths are converted to nested objects:
 *   "driver.lastName" → { driver: { lastName: 'asc' } }
 */
function buildOrderByEntry(column: string, direction: SortDirection): PrismaOrderBy {
  const segments = column.split('.');

  if (segments.length === 1) {
    return { [column]: direction };
  }

  // Build nested object from right to left
  let nested: Record<string, unknown> = { [segments[segments.length - 1]]: direction };
  for (let i = segments.length - 2; i >= 0; i--) {
    nested = { [segments[i]]: nested };
  }
  return nested as PrismaOrderBy;
}

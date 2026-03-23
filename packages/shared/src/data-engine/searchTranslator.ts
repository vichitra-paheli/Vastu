/**
 * Global search translator — builds an OR clause across all string columns.
 *
 * Pure function — no I/O, no side effects.
 *
 * Implements US-202 AC-5.
 *
 * Example:
 *   buildSearchWhere('hamilton', ['firstName', 'lastName', 'nationality'])
 *   → {
 *       OR: [
 *         { firstName: { contains: 'hamilton', mode: 'insensitive' } },
 *         { lastName:  { contains: 'hamilton', mode: 'insensitive' } },
 *         { nationality: { contains: 'hamilton', mode: 'insensitive' } },
 *       ]
 *     }
 */

import type { PrismaWhere } from './filterTranslator';

/**
 * Build a Prisma where clause that matches `term` against all `stringColumns`.
 *
 * @param term - The search term. Empty or whitespace-only returns `{}`.
 * @param stringColumns - Column names to search across. Empty returns `{}`.
 * @returns Prisma-compatible where object with OR clauses, or `{}` when no-op.
 */
export function buildSearchWhere(
  term: string | null | undefined,
  stringColumns: string[],
): PrismaWhere {
  if (!term || term.trim().length === 0) return {};
  if (stringColumns.length === 0) return {};

  const trimmed = term.trim();

  const clauses = stringColumns.map((col) => ({
    [col]: { contains: trimmed, mode: 'insensitive' },
  }));

  if (clauses.length === 1) return clauses[0];

  return { OR: clauses };
}

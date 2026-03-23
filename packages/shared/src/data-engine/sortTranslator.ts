/**
 * Sort translator — converts SortSpec[] to Prisma `orderBy`.
 *
 * Pure function — no I/O, no side effects.
 *
 * Implements US-202 AC-3.
 *
 * Examples:
 *   [{ column: 'name', direction: 'asc' }]
 *     → [{ name: 'asc' }]
 *
 *   [{ column: 'driver.name', direction: 'desc' }]
 *     → [{ driver: { name: 'desc' } }]
 *
 *   [{ column: 'points', direction: 'desc' }, { column: 'driver.name', direction: 'asc' }]
 *     → [{ points: 'desc' }, { driver: { name: 'asc' } }]
 */

import type { SortSpec } from './types';

/** Opaque Prisma orderBy element. */
export type PrismaOrderByItem = Record<string, unknown>;

/**
 * Translate an array of SortSpec into a Prisma orderBy array.
 *
 * @param specs - Sort specifications. Empty array returns `[]`.
 * @returns Prisma-compatible orderBy array.
 */
export function translateSort(specs: SortSpec[]): PrismaOrderByItem[] {
  if (!specs || specs.length === 0) return [];
  return specs.map(translateSortSpec);
}

function translateSortSpec(spec: SortSpec): PrismaOrderByItem {
  const parts = spec.column.split('.');

  // Build from innermost out: "driver.name" → { driver: { name: 'asc' } }
  let nested: unknown = spec.direction;
  for (let i = parts.length - 1; i >= 0; i--) {
    nested = { [parts[i]]: nested };
  }
  return nested as PrismaOrderByItem;
}

/**
 * FilterNode → Prisma `where` translator.
 *
 * Pure function — no I/O, no side effects. Takes a FilterNode tree and
 * returns a Prisma-compatible where object.
 *
 * Implements US-202 AC-2.
 *
 * Supported modes per AC-2:
 *   Include (text/enum)  → { column: { in: values } }
 *   Exclude (text/enum)  → { NOT: { column: { in: values } } }
 *   Regex                → { column: { contains: pattern, mode: 'insensitive' } }
 *   AND group            → { AND: [...] }
 *   OR  group            → { OR: [...] }
 *   Number range         → { column: { gte: min, lte: max } }
 *   Date range           → { column: { gte: start, lte: end } }
 *   Boolean              → { column: value }
 *
 * Dot-notation columns (e.g. "driver.name") are automatically nested:
 *   "driver.name" include ["Hamilton"] → { driver: { name: { in: ["Hamilton"] } } }
 */

import type {
  FilterNode,
  FilterCondition,
  FilterGroup,
  FilterValue,
  NumberRangeValue,
  DateRangeValue,
} from './filterTypes';

/** Opaque Prisma where object — avoids `any` while remaining flexible. */
export type PrismaWhere = Record<string, unknown>;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Translate a FilterNode tree into a Prisma where object.
 *
 * @param node - The filter tree root. Null/undefined returns `{}`.
 * @returns A Prisma-compatible where object.
 * @throws If a regex mode filter contains an invalid pattern.
 */
export function translateFilter(node: FilterNode | null | undefined): PrismaWhere {
  if (!node) return {};
  if (node.type === 'group') return translateGroup(node);
  return translateCondition(node);
}

// ─── Group translation ────────────────────────────────────────────────────────

function translateGroup(group: FilterGroup): PrismaWhere {
  if (group.children.length === 0) return {};

  const clauses = group.children
    .map((child) => translateFilter(child))
    .filter((clause) => Object.keys(clause).length > 0);

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];

  return { [group.connector]: clauses };
}

// ─── Condition translation ────────────────────────────────────────────────────

function translateCondition(condition: FilterCondition): PrismaWhere {
  const { column, mode, dataType, value } = condition;

  // Skip conditions with null/undefined/empty values
  if (!hasValue(value)) return {};

  const clause = buildClause(mode, dataType, value);
  // clause can be `false` (boolean) — only skip on null
  if (clause === null) return {};

  return nestColumn(column, clause);
}

/**
 * Build the inner Prisma clause for the column (without column nesting).
 * Returns null when the condition should be skipped.
 */
function buildClause(
  mode: FilterCondition['mode'],
  dataType: FilterCondition['dataType'],
  value: FilterValue,
): Record<string, unknown> | boolean | null {
  // Regex mode — applies to text/enum columns
  if (mode === 'regex') {
    const pattern = typeof value === 'string' ? value : null;
    if (!pattern) return null;
    // Validate the regex pattern — throw early rather than letting Postgres fail
    try {
      new RegExp(pattern);
    } catch {
      throw new Error(`Invalid regex pattern: ${pattern}`);
    }
    return { contains: pattern, mode: 'insensitive' };
  }

  // Boolean — no range or multi-value logic
  if (dataType === 'boolean') {
    if (typeof value !== 'boolean') return null;
    return value;
  }

  // Number range
  if (dataType === 'number') {
    const range = value as NumberRangeValue;
    const clause: Record<string, unknown> = {};
    if (range.min !== undefined) clause.gte = range.min;
    if (range.max !== undefined) clause.lte = range.max;
    if (Object.keys(clause).length === 0) return null;
    if (mode === 'exclude') return { NOT: clause };
    return clause;
  }

  // Date range
  if (dataType === 'date') {
    const range = value as DateRangeValue;
    const clause: Record<string, unknown> = {};
    if (range.start !== undefined) clause.gte = new Date(range.start);
    if (range.end !== undefined) clause.lte = new Date(range.end);
    if (Object.keys(clause).length === 0) return null;
    if (mode === 'exclude') return { NOT: clause };
    return clause;
  }

  // Text / enum — include or exclude with `in` operator
  if (dataType === 'text' || dataType === 'enum') {
    const values = normaliseStringValues(value);
    if (values.length === 0) return null;
    const inClause = { in: values };
    return mode === 'exclude' ? { NOT: inClause } : inClause;
  }

  return null;
}

// ─── Column nesting ───────────────────────────────────────────────────────────

/**
 * Nest a clause under a potentially dotted column path.
 *
 * "name"        → { name: clause }
 * "driver.name" → { driver: { name: clause } }
 * "a.b.c"       → { a: { b: { c: clause } } }
 */
function nestColumn(
  column: string,
  clause: Record<string, unknown> | boolean,
): PrismaWhere {
  const parts = column.split('.');
  // Build from the innermost part outward
  let nested: unknown = clause;
  for (let i = parts.length - 1; i >= 0; i--) {
    nested = { [parts[i]]: nested };
  }
  return nested as PrismaWhere;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when a filter value is non-empty (not null/undefined/empty array). */
function hasValue(value: FilterValue): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') {
    // NumberRangeValue or DateRangeValue — valid if at least one bound is set
    return (
      ('min' in value && value.min !== undefined) ||
      ('max' in value && value.max !== undefined) ||
      ('start' in value && value.start !== undefined) ||
      ('end' in value && value.end !== undefined)
    );
  }
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'boolean') return true;
  return false;
}

/** Normalise a filter value to an array of strings. */
function normaliseStringValues(value: FilterValue): string[] {
  if (typeof value === 'string') return value ? [value] : [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.length > 0);
  return [];
}

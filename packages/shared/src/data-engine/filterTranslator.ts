/**
 * filterTranslator — pure function: FilterNode → Prisma where clause.
 *
 * No database access. No side effects. Unit-testable without any DB connection.
 *
 * Supports all filter modes:
 *   - include   → { column: { in: values } }  (or equality for single value)
 *   - exclude   → { NOT: { column: { in: values } } }
 *   - regex     → { column: { contains: pattern, mode: 'insensitive' } }
 *   - number range → { column: { gte: min, lte: max } }
 *   - date range   → { column: { gte: startDate, lte: endDate } }
 *   - boolean   → { column: value }
 *   - AND group → { AND: [...children] }
 *   - OR group  → { OR: [...children] }
 *
 * Implements VASTU-2A-202b.
 */

import type { FilterNode, FilterCondition, FilterValue } from './types';
import type { PrismaWhere } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Translate a FilterNode tree into a Prisma-compatible `where` clause.
 *
 * @param filter  The root FilterNode from view state (may be null/undefined).
 * @param allowedColumns  Allowlist of column names. Any condition whose column
 *   is NOT in this set is silently skipped (prevents column-name injection).
 *   Pass an empty array or omit to skip allowlist validation (use only in
 *   trusted contexts such as unit tests).
 * @returns A Prisma `where` object, or `{}` when the filter is null/empty.
 */
export function translateFilter(
  filter: FilterNode | null | undefined,
  allowedColumns: string[] = [],
): PrismaWhere {
  if (!filter) return {};

  const allowSet = allowedColumns.length > 0 ? new Set(allowedColumns) : null;

  const result = translateNode(filter, allowSet);
  // If translation produced nothing (e.g., all conditions were invalid), return {}
  return result ?? {};
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function translateNode(
  node: FilterNode,
  allowSet: Set<string> | null,
): PrismaWhere | null {
  if (node.type === 'group') {
    return translateGroup(node.connector, node.children, allowSet);
  }
  return translateCondition(node, allowSet);
}

function translateGroup(
  connector: 'AND' | 'OR',
  children: FilterNode[],
  allowSet: Set<string> | null,
): PrismaWhere | null {
  if (children.length === 0) return null;

  const translated = children
    .map((child) => translateNode(child, allowSet))
    .filter((w): w is PrismaWhere => w !== null);

  if (translated.length === 0) return null;
  if (translated.length === 1) return translated[0];

  return { [connector]: translated };
}

function translateCondition(
  condition: FilterCondition,
  allowSet: Set<string> | null,
): PrismaWhere | null {
  const { column, mode, dataType, value } = condition;

  // Column allowlist validation
  if (allowSet !== null && !allowSet.has(column)) {
    return null;
  }

  // Dispatch by data type first, then mode
  switch (dataType) {
    case 'number':
      return translateNumberCondition(column, mode, value);
    case 'date':
      return translateDateCondition(column, mode, value);
    case 'boolean':
      return translateBooleanCondition(column, value);
    default:
      // text, enum — handled by mode
      return translateTextCondition(column, mode, value);
  }
}

// ---------------------------------------------------------------------------
// Type-specific translators
// ---------------------------------------------------------------------------

function translateTextCondition(
  column: string,
  mode: 'include' | 'exclude' | 'regex',
  value: FilterValue,
): PrismaWhere | null {
  switch (mode) {
    case 'include':
      return translateInclude(column, value);
    case 'exclude':
      return translateExclude(column, value);
    case 'regex':
      return translateRegex(column, value);
    default:
      return null;
  }
}

function translateInclude(column: string, value: FilterValue): PrismaWhere | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.length === 1) return { [column]: { equals: value[0] } };
    return { [column]: { in: value } };
  }

  if (typeof value === 'string') {
    if (value === '') return null;
    return { [column]: { equals: value } };
  }

  // Scalar number (view.ts FilterValue includes `number`)
  if (typeof value === 'number') {
    return { [column]: { equals: value } };
  }

  return null;
}

function translateExclude(column: string, value: FilterValue): PrismaWhere | null {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.length === 1) return { NOT: { [column]: { equals: value[0] } } };
    return { NOT: { [column]: { in: value } } };
  }

  if (typeof value === 'string') {
    if (value === '') return null;
    return { NOT: { [column]: { equals: value } } };
  }

  if (typeof value === 'number') {
    return { NOT: { [column]: { equals: value } } };
  }

  return null;
}

function translateRegex(column: string, value: FilterValue): PrismaWhere | null {
  if (typeof value !== 'string' || value === '') return null;

  // Escape special regex characters that Prisma doesn't need but prevent
  // SQL LIKE injection. Prisma uses DB-native regex (PostgreSQL `~` operator)
  // when mode: 'insensitive' is specified with contains. The pattern is passed
  // as-is to allow real regex patterns.
  return { [column]: { contains: value, mode: 'insensitive' } };
}

function translateNumberCondition(
  column: string,
  mode: 'include' | 'exclude' | 'regex',
  value: FilterValue,
): PrismaWhere | null {
  // Tuple [min, max] — view.ts representation
  if (Array.isArray(value) && value.length === 2) {
    const [min, max] = value as [number, number];
    const clause: Record<string, unknown> = {};
    if (typeof min === 'number') clause.gte = min;
    if (typeof max === 'number') clause.lte = max;
    if (Object.keys(clause).length === 0) return null;
    const where = { [column]: clause };
    return mode === 'exclude' ? { NOT: where } : where;
  }

  // Object {min?, max?} — FilterSystem/workspace representation
  if (isNumberRangeObject(value)) {
    const clause: Record<string, unknown> = {};
    if (typeof value.min === 'number') clause.gte = value.min;
    if (typeof value.max === 'number') clause.lte = value.max;
    if (Object.keys(clause).length === 0) return null;
    const where = { [column]: clause };
    return mode === 'exclude' ? { NOT: where } : where;
  }

  // Scalar number — treat as equality
  if (typeof value === 'number') {
    const where = { [column]: { equals: value } };
    return mode === 'exclude' ? { NOT: where } : where;
  }

  return null;
}

function translateDateCondition(
  column: string,
  mode: 'include' | 'exclude' | 'regex',
  value: FilterValue,
): PrismaWhere | null {
  // Object {start?, end?} — FilterSystem representation
  if (isDateRangeObject(value)) {
    const clause: Record<string, unknown> = {};
    if (typeof value.start === 'string' && value.start !== '') {
      clause.gte = new Date(value.start);
    }
    if (typeof value.end === 'string' && value.end !== '') {
      clause.lte = new Date(value.end);
    }
    if (Object.keys(clause).length === 0) return null;
    const where = { [column]: clause };
    return mode === 'exclude' ? { NOT: where } : where;
  }

  // ISO date string — treat as equality (exact match)
  if (typeof value === 'string' && value !== '') {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    const where = { [column]: { equals: date } };
    return mode === 'exclude' ? { NOT: where } : where;
  }

  return null;
}

function translateBooleanCondition(
  column: string,
  value: FilterValue,
): PrismaWhere | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'boolean') return null;
  return { [column]: value };
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** NumberRange object: { min?: number; max?: number } */
function isNumberRangeObject(
  value: unknown,
): value is { min?: number; max?: number } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    ('min' in v || 'max' in v) &&
    (v.min === undefined || typeof v.min === 'number') &&
    (v.max === undefined || typeof v.max === 'number')
  );
}

/** DateRange object: { start?: string; end?: string } */
function isDateRangeObject(
  value: unknown,
): value is { start?: string; end?: string } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    ('start' in v || 'end' in v) &&
    (v.start === undefined || typeof v.start === 'string') &&
    (v.end === undefined || typeof v.end === 'string')
  );
}

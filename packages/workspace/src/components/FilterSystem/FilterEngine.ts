/**
 * FilterEngine — evaluates filter trees against data rows.
 *
 * Implements US-114 (AC-1, AC-2, AC-3).
 *
 * Handles all 5 data types (text, number, date, enum, boolean) × 3 modes
 * (include, exclude, regex) including nested AND/OR groups.
 *
 * All functions are pure — no side effects.
 * Regex evaluation catches invalid patterns and defaults to "no match."
 */

import type {
  FilterCondition,
  FilterGroup,
  FilterNode,
  FilterValue,
  NumberRangeValue,
  DateRangeValue,
} from './types';

/**
 * Evaluate a single filter condition against a row.
 *
 * @param condition - The leaf condition to evaluate.
 * @param row - A plain object representing a data row.
 * @returns true if the row matches the condition.
 */
export function evaluateCondition(
  condition: FilterCondition,
  row: Record<string, unknown>,
): boolean {
  const rawValue = row[condition.column];

  switch (condition.dataType) {
    case 'text':
      return evaluateTextCondition(condition.mode, condition.value, rawValue);
    case 'enum':
      return evaluateEnumCondition(condition.mode, condition.value, rawValue);
    case 'number':
      return evaluateNumberCondition(condition.mode, condition.value, rawValue);
    case 'date':
      return evaluateDateCondition(condition.mode, condition.value, rawValue);
    case 'boolean':
      return evaluateBooleanCondition(condition.mode, condition.value, rawValue);
    default:
      return true;
  }
}

/**
 * Evaluate a group node against a row.
 * Applies AND or OR logic recursively across all children.
 *
 * @param group - The group node to evaluate.
 * @param row - A plain object representing a data row.
 * @returns true if the row satisfies the group's logic.
 */
export function evaluateGroup(
  group: FilterGroup,
  row: Record<string, unknown>,
): boolean {
  if (group.children.length === 0) return true;

  if (group.connector === 'AND') {
    return group.children.every((child) => evaluateFilter(child, row));
  }
  // OR
  return group.children.some((child) => evaluateFilter(child, row));
}

/**
 * Evaluate any FilterNode (condition or group) against a row.
 * This is the entry point for recursive evaluation.
 *
 * @param node - The filter node to evaluate.
 * @param row - A plain object representing a data row.
 * @returns true if the row passes the filter node.
 */
export function evaluateFilter(
  node: FilterNode,
  row: Record<string, unknown>,
): boolean {
  if (node.type === 'condition') {
    return evaluateCondition(node, row);
  }
  return evaluateGroup(node, row);
}

/**
 * Apply a root FilterGroup (or null) to an array of data rows.
 *
 * @param rows - Array of plain objects.
 * @param root - The root filter group, or null for no filtering.
 * @returns Filtered array of rows.
 */
export function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  root: FilterGroup | null,
): T[] {
  if (!root || root.children.length === 0) return rows;
  return rows.filter((row) => evaluateGroup(root, row));
}

// ─────────────────────────────────────────────
// Type-specific evaluators
// ─────────────────────────────────────────────

function evaluateTextCondition(
  mode: FilterCondition['mode'],
  filterValue: FilterValue,
  cellValue: unknown,
): boolean {
  const cell = normalizeToString(cellValue);

  if (mode === 'regex') {
    return matchRegex(filterValue as string, cell);
  }

  const terms = normalizeToStringArray(filterValue);
  if (terms.length === 0) return true; // no filter terms → show everything

  const matches = terms.some((term) =>
    cell.toLowerCase().includes(term.toLowerCase()),
  );
  return mode === 'include' ? matches : !matches;
}

function evaluateEnumCondition(
  mode: FilterCondition['mode'],
  filterValue: FilterValue,
  cellValue: unknown,
): boolean {
  const cell = normalizeToString(cellValue);

  if (mode === 'regex') {
    return matchRegex(filterValue as string, cell);
  }

  const selected = normalizeToStringArray(filterValue);
  if (selected.length === 0) return true;

  const matches = selected.includes(cell);
  return mode === 'include' ? matches : !matches;
}

function evaluateNumberCondition(
  mode: FilterCondition['mode'],
  filterValue: FilterValue,
  cellValue: unknown,
): boolean {
  // Regex is not applicable for numbers — skip filter
  if (mode === 'regex') return true;

  const range = filterValue as NumberRangeValue;
  const num = toNumber(cellValue);

  if (num === null) {
    // Null values are excluded by include filter, included by exclude filter
    return mode === 'exclude';
  }

  const inRange =
    (range.min === undefined || num >= range.min) &&
    (range.max === undefined || num <= range.max);

  // If both bounds are unset, treat as no filter
  if (range.min === undefined && range.max === undefined) return true;

  return mode === 'include' ? inRange : !inRange;
}

function evaluateDateCondition(
  mode: FilterCondition['mode'],
  filterValue: FilterValue,
  cellValue: unknown,
): boolean {
  // Regex is not applicable for dates — skip filter
  if (mode === 'regex') return true;

  const range = filterValue as DateRangeValue;
  const dateStr = normalizeToString(cellValue);
  const date = dateStr ? new Date(dateStr) : null;

  if (!date || isNaN(date.getTime())) {
    return mode === 'exclude';
  }

  const startDate = range.start ? new Date(range.start) : null;
  const endDate = range.end ? new Date(range.end) : null;

  // If neither bound is set, treat as no filter
  if (!startDate && !endDate) return true;

  const afterStart = !startDate || date >= startDate;
  const beforeEnd = !endDate || date <= endDate;
  const inRange = afterStart && beforeEnd;

  return mode === 'include' ? inRange : !inRange;
}

function evaluateBooleanCondition(
  mode: FilterCondition['mode'],
  filterValue: FilterValue,
  cellValue: unknown,
): boolean {
  // Regex is not applicable for booleans — skip filter
  if (mode === 'regex') return true;

  // null = "any" — no filtering
  if (filterValue === null) return true;

  const target = filterValue as boolean;
  const cell = toBoolean(cellValue);

  const matches = cell === target;

  if (mode === 'include') return matches;
  // exclude: hide rows where the boolean matches the target
  return !matches;
}

// ─────────────────────────────────────────────
// Shared utilities
// ─────────────────────────────────────────────

function normalizeToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeToStringArray(value: FilterValue): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return value.length > 0 ? [value] : [];
  return [];
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function toBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return null;
}

/**
 * Match a string against a regex pattern.
 * Returns false (no match) if the pattern is invalid, rather than throwing.
 */
function matchRegex(pattern: string, target: string): boolean {
  if (!pattern) return true; // empty pattern → no filter
  try {
    const re = new RegExp(pattern, 'i');
    return re.test(target);
  } catch {
    // Invalid regex — treat as no match
    return false;
  }
}

/**
 * Validate a regex pattern string.
 * Returns null if valid, or an error message if invalid.
 */
export function validateRegex(pattern: string): string | null {
  if (!pattern) return null;
  try {
    new RegExp(pattern);
    return null;
  } catch (e) {
    if (e instanceof SyntaxError) return e.message;
    return 'Invalid regular expression';
  }
}

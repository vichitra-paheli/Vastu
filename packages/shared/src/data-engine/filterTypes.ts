/**
 * FilterNode types — canonical definitions for the composable filter tree.
 *
 * These types live in @vastu/shared so both the data engine (server-side
 * Prisma translation) and the workspace filter UI (client-side) share a
 * single definition without `shared` depending on `workspace`.
 *
 * The workspace FilterSystem re-exports from here for backward compatibility.
 *
 * Implements US-202 (AC-2) — type foundation for FilterNode-to-Prisma translator.
 */

/**
 * The three filter modes.
 *
 * - include: Show only rows matching the value(s). Default mode.
 * - exclude: Hide rows matching the value(s).
 * - regex:   Match rows against a regular expression pattern.
 */
export type FilterMode = 'include' | 'exclude' | 'regex';

/**
 * Data types that the filter system handles.
 * Determines which Prisma where clause shape is generated.
 */
export type DataType = 'text' | 'number' | 'date' | 'enum' | 'boolean';

/** Min/max range for number and currency filters. */
export interface NumberRangeValue {
  min?: number;
  max?: number;
}

/** ISO 8601 date range for date/datetime filters. */
export interface DateRangeValue {
  start?: string;
  end?: string;
}

/**
 * Possible value shapes for a FilterCondition.
 * Typed as a union to remain serializable over JSON.
 */
export type FilterValue =
  | string
  | string[]
  | NumberRangeValue
  | DateRangeValue
  | boolean
  | null;

/**
 * A leaf-level filter condition: one column, one mode, one value.
 * Corresponds to a single filter pill in the filter bar.
 */
export interface FilterCondition {
  type: 'condition';
  /** Column/field name to filter on. Dot-notation for relations (e.g. "driver.name"). */
  column: string;
  /** Filter mode. */
  mode: FilterMode;
  /** The filter value — shape depends on mode and dataType. */
  value: FilterValue;
  /** Data type of the column — drives Prisma clause selection. */
  dataType: DataType;
}

/**
 * A group of conditions and/or nested groups connected by AND or OR logic.
 */
export interface FilterGroup {
  type: 'group';
  /** Logical connector applied between all direct children. */
  connector: 'AND' | 'OR';
  /** Child nodes (conditions or sub-groups). */
  children: FilterNode[];
}

/**
 * Discriminated union of all filter node types.
 * The root of the filter JSON tree.
 */
export type FilterNode = FilterCondition | FilterGroup;

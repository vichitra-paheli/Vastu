/**
 * FilterSystem types — composable filter system for VastuTable and future components.
 *
 * Implements US-114 (AC-1, AC-2, AC-3, AC-7).
 *
 * FilterNode is a recursive JSON tree serialized into the view state (AC-9).
 * The same structure is accepted by MCP tools (Patterns Library §2.4).
 *
 * Core FilterNode types are re-exported from @vastu/shared/data-engine so the
 * server-side Prisma translator and the client-side UI share a single definition.
 * Workspace-specific types (FilterDimension, FilterState) and helper functions
 * remain here.
 */

// Re-export canonical type definitions from shared — backward-compat shim.
// Consumers of this file continue to work without changes.
import type {
  FilterMode,
  DataType,
  NumberRangeValue,
  DateRangeValue,
  FilterValue,
  FilterCondition,
  FilterGroup,
  FilterNode,
} from '@vastu/shared/data-engine';

export type {
  FilterMode,
  DataType,
  NumberRangeValue,
  DateRangeValue,
  FilterValue,
  FilterCondition,
  FilterGroup,
  FilterNode,
};

// ─── Workspace-specific types ─────────────────────────────────────────────────

/**
 * A column/dimension available for filtering.
 * Used by DimensionPicker to list available filter targets.
 */
export interface FilterDimension {
  /** Column identifier (matches FilterCondition.column). */
  column: string;
  /** Human-readable label. */
  label: string;
  /** Data type — used to select the right input and filter logic. */
  dataType: DataType;
  /**
   * For enum columns: list of all unique values with optional counts.
   * Provided externally (e.g., from the table data or server).
   */
  enumOptions?: EnumOption[];
  /** For number columns: the min value in the dataset. */
  numberMin?: number;
  /** For number columns: the max value in the dataset. */
  numberMax?: number;
}

/** A single enum option with optional row count. */
export interface EnumOption {
  value: string;
  label?: string;
  count?: number;
}

/**
 * The serializable filter state stored in the view.
 * AC-9: Part of serializable view state.
 */
export interface FilterState {
  /** The root filter node (a group wrapping all active filters). */
  root: FilterGroup | null;
  /** Whether the advanced composite builder is open. */
  advanced: boolean;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Helper: create an empty AND root group. */
export function createRootGroup(): FilterGroup {
  return { type: 'group', connector: 'AND', children: [] };
}

/** Helper: create a new condition with sensible defaults. */
export function createCondition(
  column: string,
  dataType: DataType,
  mode: FilterMode = 'include',
): FilterCondition {
  const defaultValue = getDefaultValue(dataType, mode);
  return { type: 'condition', column, mode, value: defaultValue, dataType };
}

function getDefaultValue(dataType: DataType, mode: FilterMode): FilterValue {
  if (mode === 'regex') return '';
  switch (dataType) {
    case 'text':
    case 'enum':
      return [];
    case 'number':
      return {};
    case 'date':
      return {};
    case 'boolean':
      return null;
    default:
      return null;
  }
}

/**
 * Returns true when the filter tree is "flat":
 * - The root is an AND group with only direct conditions (no nested groups).
 * Used to determine when "Convert to simple" is available (AC-8).
 */
export function isFilterFlat(root: FilterGroup | null): boolean {
  if (!root) return true;
  return root.children.every((node) => node.type === 'condition');
}

/** Returns the total count of leaf conditions in a FilterNode tree. */
export function countConditions(node: FilterNode | null): number {
  if (!node) return 0;
  if (node.type === 'condition') return 1;
  return node.children.reduce((sum, child) => sum + countConditions(child), 0);
}

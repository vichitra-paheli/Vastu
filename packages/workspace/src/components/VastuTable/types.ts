/**
 * VastuTable types — column definitions and component props.
 *
 * Implements US-112 (AC-1 through AC-12).
 */

import type { SortingState, ColumnSizingState, ColumnOrderState, VisibilityState } from '@tanstack/react-table';
import type { FilterGroup } from '../FilterSystem/types';

// Re-export TanStack types used by consumers
export type { SortingState, ColumnSizingState, ColumnOrderState, VisibilityState };

/**
 * Supported cell data types for type-aware formatting.
 */
export type CellDataType = 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'badge' | 'custom';

/**
 * Column definition for VastuTable.
 *
 * Wraps TanStack Table column definition with Vastu-specific metadata.
 */
export interface VastuColumn<TData extends Record<string, unknown>> {
  /** Unique column identifier. */
  id: string;
  /** Human-readable column header label. */
  label: string;
  /** Data type — drives cell formatting and filter input rendering. */
  dataType?: CellDataType;
  /**
   * Accessor key (field name in TData) or accessor function.
   * When omitted, uses `id` as the accessor key.
   */
  accessorKey?: keyof TData & string;
  /** Custom cell renderer. When provided, takes precedence over type-aware formatting. */
  renderCell?: (value: unknown, row: TData) => React.ReactNode;
  /** Custom header renderer. */
  renderHeader?: (column: { id: string; label: string }) => React.ReactNode;
  /** Minimum column width in pixels. Default: 80. */
  minWidth?: number;
  /** Maximum column width in pixels. */
  maxWidth?: number;
  /** Initial column width in pixels. Default: 160. */
  width?: number;
  /** Whether the column can be sorted. Default: true. */
  sortable?: boolean;
  /** Whether the column can be resized. Default: true. */
  resizable?: boolean;
  /** Whether the column can be hidden. Default: true. */
  hideable?: boolean;
  /** Whether the column can be reordered. Default: true. */
  reorderable?: boolean;
  /**
   * Pin the column to left or right.
   * Pinned columns are not included in the virtual scroll window.
   */
  pin?: 'left' | 'right';
}

/**
 * Props for the VastuTable component.
 */
export interface VastuTableProps<TData extends Record<string, unknown>> {
  /** Array of data rows to render. */
  data: TData[];
  /** Column definitions. */
  columns: VastuColumn<TData>[];
  /**
   * View ID used to key filter/view store state.
   * Required for per-view state isolation.
   */
  viewId?: string;
  /**
   * Active filter group (from viewFilterStore or viewStore).
   * When provided, rows are filtered client-side using FilterEngine.
   */
  filterRoot?: FilterGroup | null;
  /** Whether the table is in a loading state — shows skeleton rows. */
  loading?: boolean;
  /** Error to display in the error state. */
  error?: Error | null;
  /**
   * Called when the user changes the sort state.
   * Parent can persist to viewStore.
   */
  onSortChange?: (sort: SortingState) => void;
  /**
   * Called when column sizes change after a resize drag.
   */
  onColumnSizingChange?: (sizing: ColumnSizingState) => void;
  /**
   * Called when column order changes after a drag-reorder.
   */
  onColumnOrderChange?: (order: ColumnOrderState) => void;
  /**
   * Called when column visibility changes (hide/show toggle).
   */
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  /**
   * Called when row selection changes.
   * Provides the set of selected row IDs.
   * Use this for multi-select tracking only — do NOT use it to trigger navigation.
   */
  onRowSelectionChange?: (selectedIds: Set<string>) => void;
  /**
   * Called when a row is clicked without a modifier key (plain single click).
   * Use this for row-level navigation (e.g. opening the record drawer).
   * Shift+click and Ctrl+click for multi-select do NOT trigger this callback.
   */
  onRowClick?: (rowId: string) => void;
  /**
   * Called when the user right-clicks a cell and selects "Copy value".
   */
  onCopyCellValue?: (value: unknown, columnId: string) => void;
  /**
   * Called when the user right-clicks a cell and selects include/exclude filter.
   * The mode parameter distinguishes between "Include filter" and "Exclude filter".
   */
  onFilterToValue?: (value: unknown, columnId: string, mode: 'include' | 'exclude') => void;
  /**
   * Row key accessor — determines the unique key per row.
   * Default: uses the row index.
   */
  getRowId?: (row: TData) => string;
  /**
   * Override height of the table container.
   * Default: fills the available space via flex:1.
   */
  height?: number | string;
  /**
   * Row height in pixels for virtual scroll calculations.
   * Default: 36.
   */
  rowHeight?: number;
  /**
   * Number of rows to render outside the visible window (overscan).
   * Default: 5.
   */
  overscan?: number;
  /**
   * Controlled column visibility state.
   * When provided, component is fully controlled for visibility.
   */
  columnVisibility?: VisibilityState;
  /**
   * Controlled sort state.
   */
  sorting?: SortingState;
  /**
   * Controlled column sizing state.
   */
  columnSizing?: ColumnSizingState;
  /**
   * Controlled column order state.
   */
  columnOrder?: ColumnOrderState;
  /** Additional CSS class name on the root element. */
  className?: string;
  /** aria-label for the table element. */
  ariaLabel?: string;
}

/**
 * Context data passed to the header context menu handler.
 */
export interface HeaderContextData {
  columnId: string;
  label: string;
}

/**
 * Context data passed to the cell context menu handler.
 */
export interface CellContextData {
  columnId: string;
  rowId: string;
  value: unknown;
}

/**
 * Internal drag state for column reordering.
 */
export interface DragColumnState {
  dragColumnId: string;
  overColumnId: string | null;
}

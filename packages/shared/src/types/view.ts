/**
 * View types — saved view state snapshots.
 *
 * A View persists the state of a page's data presentation (filters, sort,
 * columns, pagination) so users can save and share different perspectives.
 */

/** Filter mode: include matches, exclude matches, or regex match. */
export type FilterMode = 'include' | 'exclude' | 'regex';

/** Supported data types for filter inputs. */
export type DataType = 'text' | 'number' | 'date' | 'enum' | 'boolean';

/** Concrete value types for filter conditions. */
export type FilterValue =
  | string
  | string[]
  | number
  | [number, number]
  | boolean
  | null;

/**
 * A single filter condition on one column.
 * Aligned to Patterns Library §2.4 spec.
 * Uses `column` (not `field`) to match FilterSystem component types.
 */
export interface FilterCondition {
  type: 'condition';
  /** Column identifier — matches FilterDimension.column. */
  column: string;
  mode: FilterMode;
  dataType: DataType;
  value: FilterValue;
}

/**
 * A group of filter conditions combined with AND or OR.
 * Aligned to Patterns Library §2.4 spec.
 * Uses `connector: 'AND' | 'OR'` (not `operator: 'and' | 'or'`).
 */
export interface FilterGroup {
  type: 'group';
  /** Logical connector applied between all direct children. */
  connector: 'AND' | 'OR';
  children: FilterNode[];
}

/** Recursive filter tree node — either a condition or a group. */
export type FilterNode = FilterCondition | FilterGroup;

/** Sort direction for a column. */
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

/** Column visibility and sizing state. */
export interface ColumnState {
  id: string;
  visible: boolean;
  width?: number;
  order: number;
}

/** Pagination state. */
export interface PaginationState {
  page: number;
  pageSize: number;
}

/** Complete view state — everything needed to restore a view. */
export interface ViewState {
  filters: FilterNode | null;
  sort: SortState[];
  columns: ColumnState[];
  pagination: PaginationState;
  scrollPosition: { x: number; y: number };
  /**
   * Optional dashboard card layout — only present when this view is for a
   * dashboard template. Stored as a plain serializable array so it survives
   * JSON round-trips through the view store.
   */
  dashboardCards?: unknown[];
}

/** Persisted view record from the database. */
export interface View {
  id: string;
  name: string;
  pageId: string;
  stateJson: ViewState;
  createdBy: string;
  isShared: boolean;
  colorDot: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Data engine types — used by the query API and workspace components.
 *
 * These types flow between:
 *   FilterSystem (workspace) → API route (shell) → filterTranslator (shared) → Prisma
 *
 * Implements VASTU-2A-202a.
 */

// Re-export FilterNode types from the shared view types so callers can import
// everything needed for the data engine from a single entry point.
export type {
  FilterNode,
  FilterCondition,
  FilterGroup,
  FilterMode,
  FilterValue,
  DataType,
} from '../types/view';

// ---------------------------------------------------------------------------
// Extended filter value shapes (superset of FilterValue for richer inputs)
// ---------------------------------------------------------------------------

/** Min/max range for number filters. */
export interface NumberRangeValue {
  min?: number;
  max?: number;
}

/** ISO 8601 date range for date/datetime filters. */
export interface DateRangeValue {
  start?: string;
  end?: string;
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

/** Direction for a single sort column. */
export type SortDirection = 'asc' | 'desc';

/** One column in a multi-column sort specification. */
export interface SortConfig {
  /** Column name. May be a dot-path for relation traversal, e.g. "driver.lastName". */
  column: string;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Page-based pagination configuration. */
export interface PaginationConfig {
  /** 1-based page number. */
  page: number;
  /** Rows per page. Max enforced by the API (default 100). */
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Column metadata
// ---------------------------------------------------------------------------

/** Metadata for a single column/field derived from the Prisma DMMF. */
export interface ColumnMeta {
  /** Field name (camelCase, matches Prisma model field). */
  name: string;
  /**
   * Prisma scalar type string (e.g., "String", "Int", "DateTime", "Boolean").
   * "relation" for relation/object fields.
   */
  type: string;
  /** Whether the field is nullable (optional in Prisma). */
  nullable: boolean;
  /** Whether this field is the model's primary key. */
  isPrimaryKey: boolean;
  /** Whether this field is a foreign key referencing another model. */
  isForeignKey: boolean;
  /** The related model name, present when isForeignKey is true. */
  relatedModel?: string;
}

// ---------------------------------------------------------------------------
// Query response
// ---------------------------------------------------------------------------

/** Response shape for GET /api/workspace/data/query. */
export interface QueryResponse {
  /** Array of row objects. Keys are camelCase field names. */
  rows: Record<string, unknown>[];
  /** Total number of rows matching the filter (before pagination). */
  total: number;
  /** Current page (1-based). */
  page: number;
  /** Rows per page. */
  pageSize: number;
  /** Column metadata for the queried model. */
  columns: ColumnMeta[];
}

// ---------------------------------------------------------------------------
// Aggregate response
// ---------------------------------------------------------------------------

/** A single bucket from an aggregate query. */
export interface AggregateGroup {
  /** Group key (value of the groupBy column). */
  key: string | number | null;
  /** Computed metric value. */
  value: number;
}

/** Response shape for GET /api/workspace/data/aggregate. */
export interface AggregateResponse {
  groups: AggregateGroup[];
}

// ---------------------------------------------------------------------------
// Prisma where / orderBy shapes (internal, no Prisma import needed)
// ---------------------------------------------------------------------------

/**
 * Recursive Prisma-compatible `where` clause.
 * Typed loosely here because Prisma generates per-model types that cannot
 * be shared without importing generated client types — which would force a
 * Prisma client dependency in every consumer of this file.
 */
export type PrismaWhere = Record<string, unknown>;

/**
 * Prisma-compatible `orderBy` clause (single entry or array).
 * Nested objects represent relation traversal, e.g. `{ driver: { lastName: 'asc' } }`.
 */
export type PrismaOrderBy = Record<string, unknown>;

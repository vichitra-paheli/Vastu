/**
 * Data engine types — request/response shapes for the generic query API.
 *
 * These types are shared between the API route (shell) and any client
 * consuming the data query endpoint.
 *
 * Implements US-202 AC-6, AC-7.
 */

import type { FilterNode } from './filterTypes';

// ─── Sort spec ────────────────────────────────────────────────────────────────

/**
 * A single sort specification.
 * Column supports dot-notation for relation fields (e.g. "driver.name").
 */
export interface SortSpec {
  column: string;
  direction: 'asc' | 'desc';
}

// ─── Column metadata ──────────────────────────────────────────────────────────

/**
 * Metadata about a single column returned by the data query API.
 * Derived from Prisma DMMF at query time.
 *
 * AC-7: name, type, nullable, isPrimaryKey, isForeignKey, relatedModel.
 */
export interface ColumnMeta {
  /** The field name as it appears in the Prisma model. */
  name: string;
  /**
   * The Prisma scalar type mapped to a simplified enum.
   * Enum fields map to 'Enum'. Relation fields are excluded from ColumnMeta
   * (they appear via `relatedModel` on the FK field instead).
   */
  type: 'String' | 'Int' | 'Float' | 'DateTime' | 'Boolean' | 'Enum';
  /** True when the field is optional (nullable in the database). */
  nullable: boolean;
  /** True when this field is the model's `@id`. */
  isPrimaryKey: boolean;
  /** True when this field is a foreign key (`@relation` scalar). */
  isForeignKey: boolean;
  /** When `isForeignKey` is true: the name of the related Prisma model. */
  relatedModel?: string;
}

// ─── Request ──────────────────────────────────────────────────────────────────

/**
 * Parsed parameters for `GET /api/workspace/data/query`.
 * All optional except `table` — defaults applied in the route handler.
 *
 * AC-1: table, columns, filters, sort, pagination, search, include.
 */
export interface DataQueryRequest {
  /** Prisma model name (case-sensitive, validated against DMMF). */
  table: string;
  /**
   * Fields to include in the SELECT. Supports dot-notation for relations
   * (e.g. "driver.name"). Empty array → select all scalar fields.
   */
  columns?: string[];
  /** Composable filter tree. Null/omitted → no filter. */
  filters?: FilterNode | null;
  /** Multi-column sort specification. Empty array → no sort. */
  sort?: SortSpec[];
  /** Pagination. Defaults: page=1, pageSize=50. */
  pagination?: {
    page: number;
    pageSize: number;
  };
  /** Global text search term applied across all string columns. */
  search?: string;
  /** Relation names to eager-load (Prisma `include`). */
  include?: string[];
}

// ─── Response ─────────────────────────────────────────────────────────────────

/**
 * Response shape for `GET /api/workspace/data/query`.
 *
 * AC-6: rows, total, page, pageSize, columns.
 */
export interface DataQueryResponse<T = Record<string, unknown>> {
  /** The fetched rows for the current page. */
  rows: T[];
  /** Total matching row count (used for pagination UI). */
  total: number;
  /** Current page number (1-indexed). */
  page: number;
  /** Number of rows per page. */
  pageSize: number;
  /** Metadata for all scalar columns on the queried model. */
  columns: ColumnMeta[];
}

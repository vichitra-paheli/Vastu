/**
 * Aggregate types — request/response shapes for the generic aggregate API.
 *
 * These types are shared between the API route (shell) and any client
 * consuming the data aggregate endpoint.
 *
 * Implements US-203 AC-1, AC-3, AC-4, AC-5.
 */

import type { FilterNode } from './filterTypes';

// ─── Metric ───────────────────────────────────────────────────────────────────

/**
 * Aggregate function to apply.
 *
 * - count: Count of rows (field not required)
 * - sum:   Sum of numeric field values
 * - avg:   Average of numeric field values
 * - min:   Minimum value in field
 * - max:   Maximum value in field
 */
export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';

/**
 * Time resolution for bucketing a date/datetime column.
 * Maps to Postgres `date_trunc` granularity values.
 */
export type TimeResolution = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

// ─── Request ──────────────────────────────────────────────────────────────────

/**
 * Parsed parameters for `GET /api/workspace/data/aggregate`.
 *
 * AC-1: table, metric, field, groupBy, timeField, timeResolution, filters, timeRange.
 */
export interface AggregateRequest {
  /** Prisma model name (case-sensitive, validated against DMMF). */
  table: string;
  /** Aggregate function to apply. */
  metric: AggregateFunction;
  /**
   * Column to aggregate. Required for sum/avg/min/max.
   * Omitted for count (counts rows, not a specific field).
   */
  field?: string;
  /** Column to group results by. Produces one row per distinct value. */
  groupBy?: string;
  /**
   * Date/datetime column used for time bucketing.
   * When provided, `timeResolution` is also required.
   */
  timeField?: string;
  /**
   * Granularity for the time bucket. Required when `timeField` is set.
   * Maps to Postgres date_trunc granularity.
   */
  timeResolution?: TimeResolution;
  /** Composable filter tree applied before aggregation. */
  filters?: FilterNode | null;
  /**
   * Optional time range filter applied to the `timeField` column.
   * ISO 8601 date strings.
   */
  timeRange?: {
    start?: string;
    end?: string;
  };
  /**
   * When true, also compute the prior period's aggregate for delta display.
   * Prior period is the same duration immediately before `timeRange`.
   *
   * AC-5.
   */
  comparePrevious?: boolean;
}

// ─── Data point ───────────────────────────────────────────────────────────────

/**
 * A single labeled data point in an aggregate result.
 *
 * AC-3: { label: string, value: number }
 */
export interface AggregateDataPoint {
  /** Human-readable label (group value, time bucket string, or "total"). */
  label: string;
  /** The aggregated numeric value. */
  value: number;
}

// ─── Response ─────────────────────────────────────────────────────────────────

/**
 * Response for a simple aggregate or single-dimension group-by.
 *
 * AC-3: { data, total }
 */
export interface SimpleAggregateResponse {
  kind: 'simple';
  /** The aggregate data points. */
  data: AggregateDataPoint[];
  /** Total of all data point values (or total row count for count metric). */
  total: number;
  /** Prior period data when `comparePrevious: true` was requested. AC-5. */
  previous?: AggregateDataPoint[];
  /** Prior period total when `comparePrevious: true` was requested. AC-5. */
  previousTotal?: number;
}

/**
 * A named data series for multi-dimension aggregates.
 *
 * AC-4: { name: string, data: AggregateDataPoint[] }
 */
export interface AggregateSeries {
  /** Series name (the distinct groupBy value). */
  name: string;
  /** Data points for this series. */
  data: AggregateDataPoint[];
}

/**
 * Response for a multi-series aggregate (groupBy + timeField combination).
 *
 * AC-4: { series: AggregateSeries[] }
 */
export interface MultiSeriesAggregateResponse {
  kind: 'multi-series';
  /** The series array. */
  series: AggregateSeries[];
}

/**
 * Union response type for the aggregate API.
 */
export type AggregateResponse = SimpleAggregateResponse | MultiSeriesAggregateResponse;

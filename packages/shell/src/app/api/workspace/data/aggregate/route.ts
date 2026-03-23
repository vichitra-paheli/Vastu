/**
 * GET /api/workspace/data/aggregate
 *
 * Generic aggregate route that works with any Prisma model.
 * Returns aggregate results (count, sum, avg, min, max) with optional
 * group-by and time-bucketing for charts and KPI displays.
 *
 * Implements US-203 AC-1, AC-2, AC-3, AC-4, AC-5, AC-6.
 *
 * Query parameters:
 *   table           string   Prisma model name (required)
 *   metric          string   'count' | 'sum' | 'avg' | 'min' | 'max' (required)
 *   field           string   Column to aggregate (required for sum/avg/min/max)
 *   groupBy         string   Column to group results by
 *   timeField       string   Date column for time bucketing
 *   timeResolution  string   'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
 *   filters         JSON     FilterNode tree
 *   timeRange       JSON     { start?: string, end?: string } ISO 8601
 *   comparePrevious boolean  Include prior period data for delta calculation
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import {
  getModelNames,
  getColumnMeta,
} from '@vastu/shared/data-engine';
import type { FilterNode } from '@vastu/shared/data-engine';
import { runAggregate, AggregateValidationError } from '@vastu/shared/data-engine/aggregateBuilder';
import type { AggregateRequest, AggregateFunction, TimeResolution } from '@vastu/shared/data-engine/aggregateTypes';
import { getSessionWithAbility } from '@/lib/session';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Query timeout in milliseconds (AC-6). */
const QUERY_TIMEOUT_MS = 10_000;

const VALID_METRICS = new Set<string>(['count', 'sum', 'avg', 'min', 'max']);
const VALID_RESOLUTIONS = new Set<string>(['hourly', 'daily', 'weekly', 'monthly', 'yearly']);

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const { session, ability } = await getSessionWithAbility();
  if (!session || !ability) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url);

  const table = searchParams.get('table');
  if (!table) {
    return NextResponse.json({ error: '"table" query parameter is required' }, { status: 400 });
  }

  // 3. Validate table name against DMMF
  const knownModels = getModelNames();
  if (!knownModels.includes(table)) {
    return NextResponse.json(
      { error: `Unknown table: "${table}". Valid tables: ${knownModels.join(', ')}` },
      { status: 400 },
    );
  }

  // 4. Parse metric (required)
  const metricRaw = searchParams.get('metric');
  if (!metricRaw) {
    return NextResponse.json(
      { error: '"metric" query parameter is required' },
      { status: 400 },
    );
  }
  if (!VALID_METRICS.has(metricRaw)) {
    return NextResponse.json(
      { error: `Invalid metric "${metricRaw}". Valid values: ${Array.from(VALID_METRICS).join(', ')}` },
      { status: 400 },
    );
  }
  const metric = metricRaw as AggregateFunction;

  // 5. Parse optional parameters
  let field: string | undefined;
  let groupBy: string | undefined;
  let timeField: string | undefined;
  let timeResolution: TimeResolution | undefined;
  let filters: FilterNode | null = null;
  let timeRange: AggregateRequest['timeRange'];
  let comparePrevious = false;

  try {
    const fieldRaw = searchParams.get('field');
    if (fieldRaw) field = fieldRaw;

    const groupByRaw = searchParams.get('groupBy');
    if (groupByRaw) groupBy = groupByRaw;

    const timeFieldRaw = searchParams.get('timeField');
    if (timeFieldRaw) timeField = timeFieldRaw;

    const timeResolutionRaw = searchParams.get('timeResolution');
    if (timeResolutionRaw) {
      if (!VALID_RESOLUTIONS.has(timeResolutionRaw)) {
        throw new Error(
          `Invalid timeResolution "${timeResolutionRaw}". Valid values: ${Array.from(VALID_RESOLUTIONS).join(', ')}`,
        );
      }
      timeResolution = timeResolutionRaw as TimeResolution;
    }

    const filtersRaw = searchParams.get('filters');
    if (filtersRaw) filters = parseJSON<FilterNode>(filtersRaw, 'filters');

    const timeRangeRaw = searchParams.get('timeRange');
    if (timeRangeRaw) timeRange = parseJSON<AggregateRequest['timeRange']>(timeRangeRaw, 'timeRange');

    const comparePreviousRaw = searchParams.get('comparePrevious');
    if (comparePreviousRaw === 'true') comparePrevious = true;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid query parameters' },
      { status: 400 },
    );
  }

  // 6. Validate field exists on model (for non-count metrics)
  if (metric !== 'count' && field) {
    const columnMetas = getColumnMeta(table);
    const col = columnMetas.find((c) => c.name === field);
    if (!col) {
      return NextResponse.json(
        { error: `Column "${field}" does not exist on table "${table}"` },
        { status: 400 },
      );
    }
  }

  // 7. Validate timeField exists if provided
  if (timeField) {
    const columnMetas = getColumnMeta(table);
    const col = columnMetas.find((c) => c.name === timeField);
    if (!col) {
      return NextResponse.json(
        { error: `timeField column "${timeField}" does not exist on table "${table}"` },
        { status: 400 },
      );
    }
  }

  // 8. Validate groupBy column exists if provided
  if (groupBy) {
    const columnMetas = getColumnMeta(table);
    const col = columnMetas.find((c) => c.name === groupBy);
    if (!col) {
      return NextResponse.json(
        { error: `groupBy column "${groupBy}" does not exist on table "${table}"` },
        { status: 400 },
      );
    }
  }

  // 9. Tenant scoping — inject organizationId if model has that field (AC-6)
  const tenantWhere = buildTenantWhere(table, session.user.organizationId);

  // 10. Build aggregate request
  const aggregateReq: AggregateRequest = {
    table,
    metric,
    field,
    groupBy,
    timeField,
    timeResolution,
    filters,
    timeRange,
    comparePrevious,
  };

  // 11. Execute with timeout
  try {
    const result = await withTimeout(
      runAggregate(prisma, aggregateReq, tenantWhere),
      QUERY_TIMEOUT_MS,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AggregateValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof QueryTimeoutError) {
      return NextResponse.json(
        { error: 'Query timeout exceeded (10s). Try narrowing your filters or time range.' },
        { status: 504 },
      );
    }
    console.error('[data/aggregate GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a JSON string parameter or throw with a descriptive message. */
function parseJSON<T>(raw: string, paramName: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid JSON for "${paramName}" parameter`);
  }
}

/**
 * Build the tenant-scoping where clause.
 * Same logic as the query route — inject organizationId if the model has that field.
 */
function buildTenantWhere(
  modelName: string,
  organizationId: string,
): Record<string, unknown> {
  const columnMetas = getColumnMeta(modelName);
  const hasOrgId = columnMetas.some((c) => c.name === 'organizationId');
  if (hasOrgId) {
    return { organizationId };
  }
  return {};
}

// ─── Timeout ──────────────────────────────────────────────────────────────────

class QueryTimeoutError extends Error {
  constructor() {
    super('Query timeout');
    this.name = 'QueryTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new QueryTimeoutError());
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Aggregate builder — translates AggregateRequest into Prisma aggregate/groupBy
 * calls or raw SQL time-bucket queries.
 *
 * Pure function where possible. The only I/O dependency is `prisma` which is
 * passed in as an argument to keep the module unit-testable.
 *
 * Implements US-203 AC-1 through AC-6.
 *
 * Design decisions:
 * - Simple aggregates (no groupBy, no timeField): Prisma `aggregate()`.
 * - Grouped aggregates (groupBy, no timeField): Prisma `groupBy()`.
 * - Time-bucketed (timeField + timeResolution): raw Prisma SQL via $queryRawUnsafe.
 *   This is the ONE sanctioned raw SQL exception per requirements AC-2.
 * - Multi-series (groupBy + timeField): raw SQL with additional GROUP BY.
 */

import type { PrismaClient } from '@prisma/client';
import { translateFilter } from './filterTranslator';
import { getColumnMeta } from './columnMeta';
import type {
  AggregateRequest,
  AggregateResponse,
  SimpleAggregateResponse,
  MultiSeriesAggregateResponse,
  AggregateDataPoint,
  AggregateSeries,
  AggregateFunction,
  TimeResolution,
} from './aggregateTypes';
import type { PrismaWhere } from './filterTranslator';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Execute an aggregate query and return a typed response.
 *
 * @param prisma - Prisma client instance.
 * @param req    - Parsed aggregate request.
 * @param extraWhere - Additional where conditions (e.g. tenant scoping).
 * @returns AggregateResponse (simple or multi-series).
 * @throws {AggregateValidationError} on invalid input parameters.
 */
export async function runAggregate(
  prisma: PrismaClient,
  req: AggregateRequest,
  extraWhere: PrismaWhere = {},
): Promise<AggregateResponse> {
  validateRequest(req);

  const where = buildWhere(req, extraWhere);

  const isMultiSeries = Boolean(req.groupBy && req.timeField);
  const isTimeBucketed = Boolean(req.timeField && req.timeResolution);

  if (isMultiSeries && req.timeField && req.timeResolution && req.groupBy) {
    return runMultiSeriesQuery(prisma, req, where);
  }

  if (isTimeBucketed && req.timeField && req.timeResolution) {
    return runTimeBucketQuery(prisma, req, where);
  }

  if (req.groupBy) {
    return runGroupByQuery(prisma, req, where);
  }

  return runSimpleQuery(prisma, req, where);
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Error thrown for invalid aggregate request parameters. */
export class AggregateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AggregateValidationError';
  }
}

function validateRequest(req: AggregateRequest): void {
  // field required for non-count aggregates
  if (req.metric !== 'count' && !req.field) {
    throw new AggregateValidationError(
      `"field" is required when metric is "${req.metric}"`,
    );
  }

  // timeResolution required when timeField is provided
  if (req.timeField && !req.timeResolution) {
    throw new AggregateValidationError(
      '"timeResolution" is required when "timeField" is provided',
    );
  }

  // Validate that the field is numeric for sum/avg
  if ((req.metric === 'sum' || req.metric === 'avg') && req.field && req.table) {
    const cols = getColumnMeta(req.table);
    const col = cols.find((c) => c.name === req.field);
    if (col && col.type !== 'Int' && col.type !== 'Float') {
      throw new AggregateValidationError(
        `"field" must be a numeric column for metric "${req.metric}", got type "${col.type}"`,
      );
    }
  }

  // Validate that groupBy column exists on the model
  if (req.groupBy && req.table) {
    const cols = getColumnMeta(req.table);
    const col = cols.find((c) => c.name === req.groupBy);
    if (!col) {
      throw new AggregateValidationError(
        `groupBy column "${req.groupBy}" does not exist on table "${req.table}"`,
      );
    }
  }
}

// ─── Where clause ─────────────────────────────────────────────────────────────

/**
 * Build the combined Prisma where clause from filter tree, time range, and
 * extra conditions (tenant scoping etc.).
 */
function buildWhere(req: AggregateRequest, extraWhere: PrismaWhere): PrismaWhere {
  const filterWhere = translateFilter(req.filters);

  const timeRangeWhere = buildTimeRangeWhere(req);
  const previousTimeRangeWhere = req.comparePrevious
    ? buildPreviousTimeRangeWhere(req)
    : {};

  const clauses: PrismaWhere[] = [filterWhere, timeRangeWhere, extraWhere].filter(
    (c) => Object.keys(c).length > 0,
  );
  // previousTimeRangeWhere is only used in delta calculation — not in primary where
  void previousTimeRangeWhere; // suppress unused variable lint

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

/**
 * Build a where clause that also applies the prior period's time range.
 * Used for delta calculation (comparePrevious: true).
 */
function buildWhereForPrevious(req: AggregateRequest, extraWhere: PrismaWhere): PrismaWhere {
  const filterWhere = translateFilter(req.filters);
  const previousTimeRangeWhere = buildPreviousTimeRangeWhere(req);

  const clauses: PrismaWhere[] = [filterWhere, previousTimeRangeWhere, extraWhere].filter(
    (c) => Object.keys(c).length > 0,
  );

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { AND: clauses };
}

/** Build a where clause for the current timeRange. */
function buildTimeRangeWhere(req: AggregateRequest): PrismaWhere {
  if (!req.timeField || !req.timeRange) return {};

  const clause: Record<string, unknown> = {};
  if (req.timeRange.start) clause.gte = new Date(req.timeRange.start);
  if (req.timeRange.end) clause.lte = new Date(req.timeRange.end);
  if (Object.keys(clause).length === 0) return {};

  return { [req.timeField]: clause };
}

/**
 * Compute and build the where clause for the prior period.
 *
 * Prior period = same duration immediately before the current timeRange.
 * If no timeRange is provided, returns {}.
 */
function buildPreviousTimeRangeWhere(req: AggregateRequest): PrismaWhere {
  if (!req.timeField || !req.timeRange?.start || !req.timeRange?.end) return {};

  const start = new Date(req.timeRange.start);
  const end = new Date(req.timeRange.end);
  const durationMs = end.getTime() - start.getTime();

  const prevEnd = new Date(start.getTime() - 1); // 1ms before current start
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    [req.timeField]: { gte: prevStart, lte: prevEnd },
  };
}

// ─── Simple aggregate (no groupBy, no timeField) ──────────────────────────────

async function runSimpleQuery(
  prisma: PrismaClient,
  req: AggregateRequest,
  where: PrismaWhere,
): Promise<SimpleAggregateResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[lowerFirst(req.table)];

  let value: number;

  if (req.metric === 'count') {
    value = await model.count({ where });
  } else {
    const aggArg = buildPrismaAggArg(req.metric, req.field!);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await model.aggregate({ where, ...aggArg }) as any;
    value = extractAggValue(result, req.metric, req.field!);
  }

  const response: SimpleAggregateResponse = {
    kind: 'simple',
    data: [{ label: 'total', value }],
    total: value,
  };

  if (req.comparePrevious) {
    const prevWhere = buildWhereForPrevious(req, {});
    let prevValue: number;
    if (req.metric === 'count') {
      prevValue = await model.count({ where: prevWhere });
    } else {
      const aggArg = buildPrismaAggArg(req.metric, req.field!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevResult = await model.aggregate({ where: prevWhere, ...aggArg }) as any;
      prevValue = extractAggValue(prevResult, req.metric, req.field!);
    }
    response.previous = [{ label: 'total', value: prevValue }];
    response.previousTotal = prevValue;
  }

  return response;
}

// ─── Grouped aggregate (groupBy, no timeField) ────────────────────────────────

async function runGroupByQuery(
  prisma: PrismaClient,
  req: AggregateRequest,
  where: PrismaWhere,
): Promise<SimpleAggregateResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = (prisma as any)[lowerFirst(req.table)];

  const groupByArg = buildGroupByArg(req);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await model.groupBy({ by: [req.groupBy!], where, ...groupByArg }) as any[];

  const data: AggregateDataPoint[] = rows.map((row) => ({
    label: String(row[req.groupBy!] ?? '(null)'),
    value: extractGroupByValue(row, req.metric, req.field),
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const response: SimpleAggregateResponse = { kind: 'simple', data, total };

  if (req.comparePrevious) {
    const prevWhere = buildWhereForPrevious(req, {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevRows = await model.groupBy({ by: [req.groupBy!], where: prevWhere, ...groupByArg }) as any[];
    const previous: AggregateDataPoint[] = prevRows.map((row) => ({
      label: String(row[req.groupBy!] ?? '(null)'),
      value: extractGroupByValue(row, req.metric, req.field),
    }));
    response.previous = previous;
    response.previousTotal = previous.reduce((sum, d) => sum + d.value, 0);
  }

  return response;
}

// ─── Time-bucketed aggregate (timeField + timeResolution) ─────────────────────

/**
 * Run a time-bucketed aggregate using raw Postgres `date_trunc`.
 *
 * This is the ONE sanctioned raw SQL exception per US-203 AC-2.
 * The query is safe: table name validated against DMMF, column names
 * validated against ColumnMeta, and values are parameterised.
 */
async function runTimeBucketQuery(
  prisma: PrismaClient,
  req: AggregateRequest,
  where: PrismaWhere,
): Promise<SimpleAggregateResponse> {
  const tableName = prismaModelToTableName(req.table);
  const resolution = mapTimeResolution(req.timeResolution!);
  const metricExpr = buildSqlMetricExpr(req.metric, req.field, tableName);

  const { sql: whereSql, params: whereParams } = buildRawWhere(where);
  const baseParams: unknown[] = [resolution, ...whereParams];
  const timeFieldSafe = escapeSqlIdent(req.timeField!);

  const sql = `
    SELECT
      date_trunc($1, "${tableName}"."${timeFieldSafe}") AS bucket,
      ${metricExpr} AS value
    FROM "${tableName}"
    ${whereSql ? `WHERE ${whereSql}` : ''}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (prisma as any).$queryRawUnsafe(sql, ...baseParams) as Array<{ bucket: Date; value: string }>;

  const data: AggregateDataPoint[] = rows.map((row) => ({
    label: formatBucket(row.bucket, req.timeResolution!),
    value: Number(row.value) || 0,
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const response: SimpleAggregateResponse = { kind: 'simple', data, total };

  if (req.comparePrevious) {
    const prevWhere = mergeWhere(translateFilter(req.filters), buildPreviousTimeRangeWhere(req));
    const { sql: prevWhereSql, params: prevWhereParams } = buildRawWhere(prevWhere);
    const prevParams: unknown[] = [resolution, ...prevWhereParams];

    const prevSql = `
      SELECT
        date_trunc($1, "${tableName}"."${timeFieldSafe}") AS bucket,
        ${metricExpr} AS value
      FROM "${tableName}"
      ${prevWhereSql ? `WHERE ${prevWhereSql}` : ''}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevRows = await (prisma as any).$queryRawUnsafe(prevSql, ...prevParams) as Array<{ bucket: Date; value: string }>;

    const previous: AggregateDataPoint[] = prevRows.map((row) => ({
      label: formatBucket(row.bucket, req.timeResolution!),
      value: Number(row.value) || 0,
    }));
    response.previous = previous;
    response.previousTotal = previous.reduce((sum, d) => sum + d.value, 0);
  }

  return response;
}

// ─── Multi-series aggregate (groupBy + timeField) ─────────────────────────────

async function runMultiSeriesQuery(
  prisma: PrismaClient,
  req: AggregateRequest,
  where: PrismaWhere,
): Promise<MultiSeriesAggregateResponse> {
  const tableName = prismaModelToTableName(req.table);
  const resolution = mapTimeResolution(req.timeResolution!);
  const metricExpr = buildSqlMetricExpr(req.metric, req.field, tableName);

  const { sql: whereSql, params: whereParams } = buildRawWhere(where);
  const baseParams: unknown[] = [resolution, ...whereParams];
  const timeFieldSafe = escapeSqlIdent(req.timeField!);
  const groupBySafe = escapeSqlIdent(req.groupBy!);

  const sql = `
    SELECT
      date_trunc($1, "${tableName}"."${timeFieldSafe}") AS bucket,
      "${tableName}"."${groupBySafe}" AS series_name,
      ${metricExpr} AS value
    FROM "${tableName}"
    ${whereSql ? `WHERE ${whereSql}` : ''}
    GROUP BY bucket, "${tableName}"."${groupBySafe}"
    ORDER BY bucket ASC, series_name ASC
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (prisma as any).$queryRawUnsafe(sql, ...baseParams) as Array<{
    bucket: Date;
    series_name: unknown;
    value: string;
  }>;

  // Group rows into series
  const seriesMap = new Map<string, AggregateDataPoint[]>();
  for (const row of rows) {
    const seriesName = String(row.series_name ?? '(null)');
    const point: AggregateDataPoint = {
      label: formatBucket(row.bucket, req.timeResolution!),
      value: Number(row.value) || 0,
    };
    const existing = seriesMap.get(seriesName);
    if (existing) {
      existing.push(point);
    } else {
      seriesMap.set(seriesName, [point]);
    }
  }

  const series: AggregateSeries[] = Array.from(seriesMap.entries()).map(
    ([name, data]) => ({ name, data }),
  );

  return { kind: 'multi-series', series };
}

// ─── Prisma aggregate arg builders ────────────────────────────────────────────

/**
 * Build the Prisma aggregate() argument object for a given metric.
 * e.g. sum on "points" → { _sum: { points: true } }
 */
function buildPrismaAggArg(
  metric: Exclude<AggregateFunction, 'count'>,
  field: string,
): Record<string, unknown> {
  const key = `_${metric}` as '_sum' | '_avg' | '_min' | '_max';
  return { [key]: { [field]: true } };
}

/** Extract a numeric value from a Prisma aggregate() result. */
function extractAggValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
  metric: AggregateFunction,
  field: string,
): number {
  if (metric === 'count') return Number(result._count ?? 0);
  const key = `_${metric}` as '_sum' | '_avg' | '_min' | '_max';
  return Number(result[key]?.[field] ?? 0);
}

/** Build the Prisma groupBy() aggregate arg. */
function buildGroupByArg(req: AggregateRequest): Record<string, unknown> {
  if (req.metric === 'count') {
    return { _count: { _all: true } };
  }
  const key = `_${req.metric}` as '_sum' | '_avg' | '_min' | '_max';
  return { [key]: { [req.field!]: true } };
}

/** Extract value from a Prisma groupBy() row. */
function extractGroupByValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any,
  metric: AggregateFunction,
  field?: string,
): number {
  if (metric === 'count') return Number(row._count?._all ?? 0);
  const key = `_${metric}` as '_sum' | '_avg' | '_min' | '_max';
  return Number(row[key]?.[field!] ?? 0);
}

// ─── Raw SQL helpers ───────────────────────────────────────────────────────────

/**
 * Convert a Prisma model name to the expected Postgres table name.
 * Prisma uses snake_case by default for the underlying table name.
 * We apply a simple camelCase → snake_case transformation.
 */
export function prismaModelToTableName(modelName: string): string {
  return modelName
    .replace(/([A-Z])/g, (match, letter: string, offset: number) =>
      offset === 0 ? letter.toLowerCase() : `_${letter.toLowerCase()}`,
    );
}

/**
 * Map TimeResolution to Postgres date_trunc granularity string.
 */
export function mapTimeResolution(resolution: TimeResolution): string {
  const map: Record<TimeResolution, string> = {
    hourly: 'hour',
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    yearly: 'year',
  };
  return map[resolution];
}

/**
 * Build the SQL metric expression fragment.
 *
 * Safe: the column name is validated against DMMF before this is called.
 * The table name is derived from a DMMF-validated model name.
 */
function buildSqlMetricExpr(
  metric: AggregateFunction,
  field: string | undefined,
  tableName: string,
): string {
  if (metric === 'count') return 'COUNT(*)';
  const col = `"${tableName}"."${escapeSqlIdent(field!)}"`;
  switch (metric) {
    case 'sum': return `SUM(${col})`;
    case 'avg': return `AVG(${col})`;
    case 'min': return `MIN(${col})`;
    case 'max': return `MAX(${col})`;
  }
}

/**
 * Escape a SQL identifier to prevent injection.
 * Removes any double-quote characters from identifier names.
 * Column names are also validated against DMMF before use.
 */
export function escapeSqlIdent(ident: string): string {
  return ident.replace(/"/g, '');
}

/**
 * Build a raw SQL WHERE clause fragment from a Prisma where object.
 *
 * This is a minimal translator that handles the where shapes produced by
 * translateFilter() and buildTimeRangeWhere(). Only the shapes that can
 * appear from our own code are supported — this is not a general-purpose
 * SQL builder.
 *
 * Supported shapes:
 * - {}                                 → (no WHERE)
 * - { AND: [...] }                     → AND of children
 * - { field: { gte, lte } }           → field >= $N AND field <= $N
 * - { field: { in: [...] } }          → field IN ($N, ...)
 * - { field: { contains, mode } }     → field ILIKE $N
 * - { field: value }                  → field = $N (boolean, string)
 * - { NOT: { field: { in: [...] } } } → field NOT IN ($N, ...)
 */
export function buildRawWhere(
  where: PrismaWhere,
  paramOffset = 2, // $1 is reserved for date_trunc resolution
): { sql: string; params: unknown[] } {
  return buildWhereNode(where, paramOffset);
}

function buildWhereNode(
  node: Record<string, unknown>,
  offset: number,
): { sql: string; params: unknown[]; nextOffset: number } {
  const keys = Object.keys(node);
  if (keys.length === 0) return { sql: '', params: [], nextOffset: offset };

  const parts: string[] = [];
  const params: unknown[] = [];
  let current = offset;

  for (const key of keys) {
    const value = node[key];

    if (key === 'AND' && Array.isArray(value)) {
      const childParts: string[] = [];
      for (const child of value as Record<string, unknown>[]) {
        const result = buildWhereNode(child, current);
        if (result.sql) childParts.push(`(${result.sql})`);
        params.push(...result.params);
        current = result.nextOffset;
      }
      if (childParts.length > 0) parts.push(childParts.join(' AND '));
      continue;
    }

    if (key === 'OR' && Array.isArray(value)) {
      const childParts: string[] = [];
      for (const child of value as Record<string, unknown>[]) {
        const result = buildWhereNode(child, current);
        if (result.sql) childParts.push(`(${result.sql})`);
        params.push(...result.params);
        current = result.nextOffset;
      }
      if (childParts.length > 0) parts.push(`(${childParts.join(' OR ')})`);
      continue;
    }

    if (key === 'NOT' && typeof value === 'object' && value !== null) {
      const result = buildWhereNode(value as Record<string, unknown>, current);
      if (result.sql) parts.push(`NOT (${result.sql})`);
      params.push(...result.params);
      current = result.nextOffset;
      continue;
    }

    // Regular field
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const fieldClause = value as Record<string, unknown>;
      const fieldSql = escapeSqlIdent(key);

      if ('in' in fieldClause && Array.isArray(fieldClause.in)) {
        const inValues = fieldClause.in as unknown[];
        const placeholders = inValues.map(() => `$${current++}`).join(', ');
        params.push(...inValues);
        parts.push(`"${fieldSql}" IN (${placeholders})`);
        continue;
      }

      if ('contains' in fieldClause) {
        const pattern = `%${String(fieldClause.contains)}%`;
        parts.push(`"${fieldSql}" ILIKE $${current++}`);
        params.push(pattern);
        continue;
      }

      const rangeParts: string[] = [];
      if ('gte' in fieldClause) {
        rangeParts.push(`"${fieldSql}" >= $${current++}`);
        params.push(fieldClause.gte);
      }
      if ('lte' in fieldClause) {
        rangeParts.push(`"${fieldSql}" <= $${current++}`);
        params.push(fieldClause.lte);
      }
      if ('gt' in fieldClause) {
        rangeParts.push(`"${fieldSql}" > $${current++}`);
        params.push(fieldClause.gt);
      }
      if ('lt' in fieldClause) {
        rangeParts.push(`"${fieldSql}" < $${current++}`);
        params.push(fieldClause.lt);
      }
      if (rangeParts.length > 0) {
        parts.push(rangeParts.join(' AND '));
      }
      continue;
    }

    // Primitive (boolean, string, number)
    if (value !== null && value !== undefined) {
      parts.push(`"${escapeSqlIdent(key)}" = $${current++}`);
      params.push(value);
    }
  }

  const sql = parts.join(' AND ');
  return { sql, params, nextOffset: current };
}

// ─── Time bucket formatting ────────────────────────────────────────────────────

/** Format a date bucket for display in the response label. */
export function formatBucket(date: Date, resolution: TimeResolution): string {
  const d = date instanceof Date ? date : new Date(date);

  switch (resolution) {
    case 'hourly':
      return d.toISOString().slice(0, 16).replace('T', ' ');
    case 'daily':
      return d.toISOString().slice(0, 10);
    case 'weekly': {
      // Return ISO week label: "2024-W03"
      const year = d.getUTCFullYear();
      const week = getISOWeek(d);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    case 'monthly':
      return d.toISOString().slice(0, 7);
    case 'yearly':
      return String(d.getUTCFullYear());
  }
}

/** Compute ISO week number (1–53) for a date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Lowercase the first character of a string. */
function lowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/** Merge multiple Prisma where objects into a single AND clause. */
function mergeWhere(...clauses: PrismaWhere[]): PrismaWhere {
  const nonEmpty = clauses.filter((c) => Object.keys(c).length > 0);
  if (nonEmpty.length === 0) return {};
  if (nonEmpty.length === 1) return nonEmpty[0];
  return { AND: nonEmpty };
}

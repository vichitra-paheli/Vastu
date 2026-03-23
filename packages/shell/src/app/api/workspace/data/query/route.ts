/**
 * GET /api/workspace/data/query
 *
 * Generic data query route that works with any Prisma model.
 * Returns paginated rows, total count, and column metadata.
 *
 * Implements US-202 AC-1, AC-4, AC-6, AC-7, AC-8, AC-9.
 *
 * Query parameters:
 *   table       string         Prisma model name (required)
 *   columns     JSON string[]  Fields to SELECT (empty = all scalar fields)
 *   filters     JSON           FilterNode tree
 *   sort        JSON           SortSpec[]
 *   page        number         1-indexed page number (default: 1)
 *   pageSize    number         Rows per page (default: 50, max: 500)
 *   search      string         Global text search term
 *   include     JSON string[]  Relation names to eager-load
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import {
  translateFilter,
  translateSort,
  buildSearchWhere,
  getColumnMeta,
  getModelNames,
  getStringColumns,
} from '@vastu/shared/data-engine';
import type { FilterNode, SortSpec, DataQueryResponse } from '@vastu/shared/data-engine';
import { getSessionWithAbility } from '@/lib/session';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default page size when not specified. */
const DEFAULT_PAGE_SIZE = 50;

/** Maximum allowed page size to prevent accidental full-table loads. */
const MAX_PAGE_SIZE = 500;

/** Query timeout in milliseconds (AC-8). */
const QUERY_TIMEOUT_MS = 10_000;

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

  // 3. Validate table name against DMMF model list (AC-9 defense)
  const knownModels = getModelNames();
  if (!knownModels.includes(table)) {
    return NextResponse.json(
      { error: `Unknown table: "${table}". Valid tables: ${knownModels.join(', ')}` },
      { status: 400 },
    );
  }

  // 4. Parse optional parameters
  let columns: string[] = [];
  let filters: FilterNode | null = null;
  let sort: SortSpec[] = [];
  let page = 1;
  let pageSize = DEFAULT_PAGE_SIZE;
  let search: string | undefined;
  let include: string[] = [];

  try {
    const columnsRaw = searchParams.get('columns');
    if (columnsRaw) columns = parseJSON<string[]>(columnsRaw, 'columns');

    const filtersRaw = searchParams.get('filters');
    if (filtersRaw) filters = parseJSON<FilterNode>(filtersRaw, 'filters');

    const sortRaw = searchParams.get('sort');
    if (sortRaw) sort = parseJSON<SortSpec[]>(sortRaw, 'sort');

    const pageRaw = searchParams.get('page');
    if (pageRaw) {
      const parsed = parseInt(pageRaw, 10);
      if (isNaN(parsed) || parsed < 1) throw new Error('"page" must be a positive integer');
      page = parsed;
    }

    const pageSizeRaw = searchParams.get('pageSize');
    if (pageSizeRaw) {
      const parsed = parseInt(pageSizeRaw, 10);
      if (isNaN(parsed) || parsed < 1) throw new Error('"pageSize" must be a positive integer');
      pageSize = Math.min(parsed, MAX_PAGE_SIZE);
    }

    const searchRaw = searchParams.get('search');
    if (searchRaw) search = searchRaw;

    const includeRaw = searchParams.get('include');
    if (includeRaw) include = parseJSON<string[]>(includeRaw, 'include');
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid query parameters' },
      { status: 400 },
    );
  }

  // 5. Build Prisma where clause
  //    Combine: filter tree + global search + tenant scope
  const filterWhere = translateFilter(filters);
  const stringCols = getStringColumns(table);
  const searchWhere = buildSearchWhere(search, stringCols);

  // Tenant scoping: inject tenantId if the model has that field (AC-9)
  const tenantWhere = buildTenantWhere(table, session.user.organizationId, knownModels);

  const where = mergeWhere(filterWhere, searchWhere, tenantWhere);

  // 6. Build Prisma orderBy
  const orderBy = translateSort(sort);

  // 7. Build Prisma select (if columns specified)
  const select = buildSelect(columns, include);

  // 8. Build Prisma include (for eager-loaded relations)
  const includeClause = buildInclude(include);

  // 9. Compute skip/take (AC-4)
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 10. Execute queries with timeout (AC-8)
  try {
    const [rows, total] = await withTimeout(
      Promise.all([
        // Using any here because Prisma's dynamic model access requires it.
        // The model name was validated against DMMF above, so this is safe.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any)[lowerFirst(table)].findMany({
          where,
          orderBy: orderBy.length > 0 ? orderBy : undefined,
          skip,
          take,
          // Use select only when columns are specified AND no include (they conflict in Prisma)
          ...(columns.length > 0 && include.length === 0 ? { select } : {}),
          ...(include.length > 0 ? { include: includeClause } : {}),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any)[lowerFirst(table)].count({ where }),
      ]),
      QUERY_TIMEOUT_MS,
    );

    // 11. Build ColumnMeta[] from DMMF
    const columns_meta = getColumnMeta(table);

    // 12. Return DataQueryResponse (AC-6)
    const response: DataQueryResponse<Record<string, unknown>> = {
      rows: rows as Record<string, unknown>[],
      total: total as number,
      page,
      pageSize,
      columns: columns_meta,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof QueryTimeoutError) {
      return NextResponse.json(
        { error: 'Query timeout exceeded (10s). Reduce filters or page size.' },
        { status: 504 },
      );
    }
    console.error('[data/query GET] Unexpected error:', err);
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
 *
 * The base Prisma schema uses `organizationId` for tenant isolation.
 * If the model doesn't have this field (e.g. Organization itself),
 * no scoping is applied — the route still requires authentication.
 */
function buildTenantWhere(
  modelName: string,
  organizationId: string,
  _knownModels: string[],
): Record<string, unknown> {
  const columnMetas = getColumnMeta(modelName);
  const hasOrgId = columnMetas.some((c) => c.name === 'organizationId');
  if (hasOrgId) {
    return { organizationId };
  }
  return {};
}

/** Merge multiple Prisma where objects into a single AND clause. */
function mergeWhere(
  ...clauses: Record<string, unknown>[]
): Record<string, unknown> {
  const nonEmpty = clauses.filter((c) => Object.keys(c).length > 0);
  if (nonEmpty.length === 0) return {};
  if (nonEmpty.length === 1) return nonEmpty[0];
  return { AND: nonEmpty };
}

/** Build a Prisma select object from a list of column names. */
function buildSelect(columns: string[], _include: string[]): Record<string, boolean> {
  if (columns.length === 0) return {};
  const select: Record<string, boolean> = {};
  for (const col of columns) {
    // Top-level columns only for select — nested handled by include
    const [top] = col.split('.');
    select[top] = true;
  }
  return select;
}

/** Build a Prisma include object from a list of relation names. */
function buildInclude(relations: string[]): Record<string, boolean> {
  if (relations.length === 0) return {};
  const include: Record<string, boolean> = {};
  for (const rel of relations) {
    include[rel] = true;
  }
  return include;
}

/** Lowercase the first character of a string (Prisma model → client property). */
function lowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// ─── Timeout ──────────────────────────────────────────────────────────────────

class QueryTimeoutError extends Error {
  constructor() {
    super('Query timeout');
    this.name = 'QueryTimeoutError';
  }
}

/** Wrap a promise with a timeout. Rejects with QueryTimeoutError if exceeded. */
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

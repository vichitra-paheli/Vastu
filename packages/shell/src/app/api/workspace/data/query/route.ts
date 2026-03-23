/**
 * GET /api/workspace/data/query
 *
 * Generic table query endpoint. Translates view state (filters, sort, pagination,
 * search) into a Prisma query and returns rows + total count + column metadata.
 *
 * Query parameters:
 *   table      — Prisma model name (PascalCase or camelCase). Required.
 *   columns    — JSON array of column names to return. Optional (returns all).
 *   filters    — FilterNode JSON tree. Optional.
 *   sort       — JSON array of SortConfig. Optional.
 *   page       — Page number (1-based). Default: 1.
 *   pageSize   — Rows per page. Default: 25. Max: 100.
 *   search     — Global search term. Optional.
 *   include    — JSON object of Prisma include spec for relations. Optional.
 *
 * Response: { rows, total, page, pageSize, columns }
 *
 * Security:
 *   - Requires authenticated session.
 *   - Table name validated against DMMF allowlist.
 *   - Column names validated against the model's DMMF fields.
 *   - Tenant scoping: organizationId injected from session.
 *   - Query timeout: 10 seconds (returns 504).
 *
 * Implements VASTU-2A-202e.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { requireSessionWithAbility } from '@/lib/session';
import {
  translateFilter,
  translateSort,
  translateSearch,
  extractColumnMeta,
  resolveModelName,
  getStringColumnNames,
} from '@vastu/shared/data-engine';
import type { FilterNode, SortConfig, QueryResponse } from '@vastu/shared/data-engine';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Absolute maximum rows per request. */
const MAX_PAGE_SIZE = 100;

/** Query timeout in milliseconds. */
const QUERY_TIMEOUT_MS = 10_000;

/**
 * Whitelist of allowed Prisma model names. This list explicitly controls
 * which tables are accessible through this API (prevents unauthorized model access).
 * When the F1 schema is added (US-200), those models will be added here too.
 */
const ALLOWED_TABLES = new Set([
  // Core app tables
  'Page',
  'View',
  // F1 tables (added by US-200 migration — listed here proactively)
  'Season',
  'Circuit',
  'Constructor',
  'Driver',
  'Race',
  'RaceResult',
  'QualifyingResult',
  'SprintResult',
  'PitStop',
  'LapTime',
  'DriverStanding',
  'ConstructorStanding',
  'RaceEvent',
  'Penalty',
]);

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;

    // --- Parse and validate `table` ---
    const tableParam = searchParams.get('table');
    if (!tableParam) {
      return NextResponse.json({ error: '`table` parameter is required' }, { status: 400 });
    }

    const modelName = resolveModelName(tableParam);
    if (!modelName || !ALLOWED_TABLES.has(modelName)) {
      return NextResponse.json(
        { error: `Table "${tableParam}" is not accessible via this API` },
        { status: 400 },
      );
    }

    // --- Column metadata (from DMMF) ---
    const allColumns = extractColumnMeta(modelName);
    const allColumnNames = new Set(allColumns.map((c) => c.name));

    // --- Parse `columns` (optional projection) ---
    const columnsParam = searchParams.get('columns');
    let requestedColumns: string[] | null = null;
    if (columnsParam) {
      try {
        const parsed = JSON.parse(columnsParam) as unknown;
        if (!Array.isArray(parsed) || !parsed.every((c) => typeof c === 'string')) {
          return NextResponse.json({ error: '`columns` must be a JSON string array' }, { status: 400 });
        }
        requestedColumns = (parsed as string[]).filter((c) => allColumnNames.has(c));
      } catch {
        return NextResponse.json({ error: '`columns` is not valid JSON' }, { status: 400 });
      }
    }

    // Build select clause (null = select all)
    const selectClause =
      requestedColumns !== null
        ? Object.fromEntries(requestedColumns.map((c) => [c, true]))
        : undefined;

    // --- Parse `filters` (optional FilterNode) ---
    const filtersParam = searchParams.get('filters');
    let filterNode: FilterNode | null = null;
    if (filtersParam) {
      try {
        filterNode = JSON.parse(filtersParam) as FilterNode;
      } catch {
        return NextResponse.json({ error: '`filters` is not valid JSON' }, { status: 400 });
      }
    }

    // --- Parse `sort` ---
    const sortParam = searchParams.get('sort');
    let sortConfigs: SortConfig[] = [];
    if (sortParam) {
      try {
        const parsed = JSON.parse(sortParam) as unknown;
        if (Array.isArray(parsed)) {
          sortConfigs = parsed as SortConfig[];
        }
      } catch {
        return NextResponse.json({ error: '`sort` is not valid JSON' }, { status: 400 });
      }
    }

    // --- Parse `pagination` ---
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const rawPageSize = parseInt(searchParams.get('pageSize') ?? '25', 10) || 25;
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));
    const skip = (page - 1) * pageSize;

    // --- Parse `search` ---
    const search = searchParams.get('search') ?? '';

    // --- Parse `include` (optional Prisma include spec) ---
    const includeParam = searchParams.get('include');
    let includeClause: Record<string, unknown> | undefined;
    if (includeParam) {
      try {
        const parsed = JSON.parse(includeParam) as unknown;
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          includeClause = parsed as Record<string, unknown>;
        }
      } catch {
        return NextResponse.json({ error: '`include` is not valid JSON' }, { status: 400 });
      }
    }

    // --- Build WHERE clause ---
    const scalarColumns = allColumns.filter((c) => c.type !== 'relation');
    const scalarColumnNames = scalarColumns.map((c) => c.name);

    const filterWhere = translateFilter(filterNode, scalarColumnNames);
    const stringCols = getStringColumnNames(scalarColumns);
    const searchWhere = translateSearch(search, stringCols);

    // Tenant scoping: inject organizationId if the model has that field
    const hasTenantScope = allColumnNames.has('organizationId');
    const tenantWhere = hasTenantScope
      ? { organizationId: session.user.organizationId }
      : {};

    // Merge all where clauses with AND
    const whereClauses = [tenantWhere, filterWhere, searchWhere].filter(
      (w) => Object.keys(w).length > 0,
    );
    const where =
      whereClauses.length === 0
        ? {}
        : whereClauses.length === 1
          ? whereClauses[0]
          : { AND: whereClauses };

    // --- Build ORDER BY ---
    const orderBy = translateSort(sortConfigs, scalarColumnNames);

    // --- Execute queries with timeout ---
    const queryArgs = {
      where,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      skip,
      take: pageSize,
      ...(selectClause ? { select: selectClause } : {}),
      ...(includeClause ? { include: includeClause } : {}),
    };

    // Use the Prisma client dynamically — the table name is validated against
    // the DMMF allowlist above, so this is safe.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic model access requires any cast
    const delegate = (prisma as any)[
      modelName.charAt(0).toLowerCase() + modelName.slice(1)
    ] as {
      findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
      count: (args: unknown) => Promise<number>;
    };

    if (!delegate) {
      return NextResponse.json(
        { error: `Model "${modelName}" not available on Prisma client` },
        { status: 500 },
      );
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT_MS),
    );

    const [rows, total] = await Promise.race([
      Promise.all([
        delegate.findMany(queryArgs),
        delegate.count({ where }),
      ]),
      timeoutPromise,
    ]);

    // Return column metadata filtered to requested columns if projection was applied
    const responseColumns =
      requestedColumns !== null
        ? allColumns.filter((c) => requestedColumns!.includes(c.name))
        : allColumns;

    const response: QueryResponse = {
      rows,
      total,
      page,
      pageSize,
      columns: responseColumns,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof Error && err.message === 'Query timeout') {
      return NextResponse.json({ error: 'Query timed out' }, { status: 504 });
    }
    console.error('[data/query GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

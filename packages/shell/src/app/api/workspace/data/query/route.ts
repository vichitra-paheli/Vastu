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
// Input validation helpers
// ---------------------------------------------------------------------------

type ValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * Validate that a parsed JSON value conforms to the FilterNode shape.
 *
 * Rules:
 *   - type 'condition': must have a string `column` and a string `mode`.
 *   - type 'group': must have a `children` array.
 *   - Nested nodes are validated recursively.
 *
 * This prevents malformed payloads from reaching translateFilter where
 * undefined fields would produce `{undefined: {...}}` Prisma where clauses.
 */
function validateFilterNode(node: unknown, depth = 0): ValidationResult {
  if (depth > 20) {
    return { valid: false, reason: 'filter tree is too deeply nested' };
  }
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return { valid: false, reason: 'filter node must be a non-null object' };
  }
  const n = node as Record<string, unknown>;
  if (n.type === 'condition') {
    if (typeof n.column !== 'string' || n.column.trim() === '') {
      return { valid: false, reason: "condition node must have a non-empty string `column`" };
    }
    if (typeof n.mode !== 'string' || n.mode.trim() === '') {
      return { valid: false, reason: `condition for column "${n.column}" must have a string \`mode\`` };
    }
    return { valid: true };
  }
  if (n.type === 'group') {
    if (!Array.isArray(n.children)) {
      return { valid: false, reason: 'group node must have a `children` array' };
    }
    for (let i = 0; i < n.children.length; i++) {
      const childResult = validateFilterNode(n.children[i], depth + 1);
      if (!childResult.valid) {
        return { valid: false, reason: `children[${i}]: ${childResult.reason}` };
      }
    }
    return { valid: true };
  }
  return { valid: false, reason: `filter node has unknown type: "${String(n.type)}"` };
}

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
    // Validate every requested column against the model's DMMF field list.
    // Silently dropping unknown columns would allow callers to probe field existence;
    // returning 400 prevents data leakage and surfaces mis-spellings immediately.
    const columnsParam = searchParams.get('columns');
    let requestedColumns: string[] | null = null;
    if (columnsParam) {
      try {
        const parsed = JSON.parse(columnsParam) as unknown;
        if (!Array.isArray(parsed) || !parsed.every((c) => typeof c === 'string')) {
          return NextResponse.json({ error: '`columns` must be a JSON string array' }, { status: 400 });
        }
        const invalidColumns = (parsed as string[]).filter((c) => !allColumnNames.has(c));
        if (invalidColumns.length > 0) {
          return NextResponse.json(
            {
              error: `\`columns\` contains field(s) not present on model "${modelName}": ${invalidColumns.join(', ')}`,
            },
            { status: 400 },
          );
        }
        requestedColumns = parsed as string[];
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
        const parsedFilter = JSON.parse(filtersParam) as unknown;
        const filterValidation = validateFilterNode(parsedFilter);
        if (!filterValidation.valid) {
          return NextResponse.json(
            { error: `\`filters\` is invalid: ${filterValidation.reason}` },
            { status: 400 },
          );
        }
        filterNode = parsedFilter as FilterNode;
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
        if (!Array.isArray(parsed)) {
          return NextResponse.json({ error: '`sort` must be a JSON array' }, { status: 400 });
        }
        const invalidEntry = parsed.findIndex(
          (entry) =>
            !entry ||
            typeof entry !== 'object' ||
            typeof (entry as Record<string, unknown>).column !== 'string' ||
            ((entry as Record<string, unknown>).direction !== 'asc' &&
              (entry as Record<string, unknown>).direction !== 'desc'),
        );
        if (invalidEntry !== -1) {
          return NextResponse.json(
            {
              error: `\`sort\` entry at index ${invalidEntry} must have a string \`column\` and \`direction\` of 'asc' or 'desc'`,
            },
            { status: 400 },
          );
        }
        sortConfigs = parsed as SortConfig[];
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
          // Validate that all top-level keys are known relation fields for this model.
          // This prevents bypassing the ALLOWED_TABLES allowlist via deeply nested includes.
          const knownRelationNames = new Set(
            allColumns.filter((c) => c.type === 'relation').map((c) => c.name),
          );
          const includeKeys = Object.keys(parsed as Record<string, unknown>);
          const unknownRelations = includeKeys.filter((k) => !knownRelationNames.has(k));
          if (unknownRelations.length > 0) {
            return NextResponse.json(
              {
                error: `\`include\` contains unknown relation(s): ${unknownRelations.join(', ')}`,
              },
              { status: 400 },
            );
          }
          // Limit nesting depth to 1: values must be `true` or an object with only
          // `select`/`where`/`orderBy`/`take`/`skip` — no nested `include` allowed.
          for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
            if (val !== true && typeof val === 'object' && val !== null) {
              if ('include' in (val as Record<string, unknown>)) {
                return NextResponse.json(
                  {
                    error: `\`include\` nesting depth is limited to 1 level (nested \`include\` on "${key}" is not allowed)`,
                  },
                  { status: 400 },
                );
              }
            }
          }
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

    // Tenant scoping: inject organizationId if the model has that field.
    // Models without an organizationId field (e.g. reference/lookup tables such as
    // Season, Circuit, Constructor) are accessible to any authenticated user — they
    // hold shared, non-tenant-specific data. CASL subject-level scoping (US-208) will
    // add fine-grained access control for these models in a later phase.
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
    // Prisma does not allow `select` and `include` in the same query.
    // When `include` is provided, omit `select` — the caller gets all scalar fields
    // plus the requested relations. When only `columns` is provided (no include),
    // apply `select` for projection.
    const queryArgs = {
      where,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      skip,
      take: pageSize,
      ...(includeClause
        ? { include: includeClause }
        : selectClause
          ? { select: selectClause }
          : {}),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

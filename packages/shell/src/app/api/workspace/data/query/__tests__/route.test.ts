/**
 * Unit tests for GET /api/workspace/data/query
 *
 * Covers column validation, tenant scoping, and error handling.
 * Prisma, the session helper, and the data-engine helpers are mocked so
 * tests don't require a live database or auth server.
 *
 * Implements review fixes for VASTU-2A-202.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { ColumnMeta } from '@vastu/shared/data-engine';

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that pull in the modules under mock
// ---------------------------------------------------------------------------

vi.mock('@/lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    page: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    driver: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Column metadata for 'Page' — has organizationId (tenant-scoped)
const PAGE_COLUMNS: ColumnMeta[] = [
  { name: 'id', type: 'String', nullable: false, isPrimaryKey: true, isForeignKey: false },
  { name: 'name', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: false },
  {
    name: 'organizationId',
    type: 'String',
    nullable: false,
    isPrimaryKey: false,
    isForeignKey: true,
    relatedModel: 'Organization',
  },
  { name: 'createdAt', type: 'DateTime', nullable: false, isPrimaryKey: false, isForeignKey: false },
];

// Column metadata for 'Driver' — no organizationId (reference table)
const DRIVER_COLUMNS: ColumnMeta[] = [
  { name: 'id', type: 'String', nullable: false, isPrimaryKey: true, isForeignKey: false },
  { name: 'firstName', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: false },
  { name: 'lastName', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: false },
];

vi.mock('@vastu/shared/data-engine', () => ({
  extractColumnMeta: vi.fn(),
  resolveModelName: vi.fn(),
  translateFilter: vi.fn(() => ({})),
  translateSort: vi.fn(() => []),
  translateSearch: vi.fn(() => ({})),
  getStringColumnNames: vi.fn(() => ['name']),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '../route';
import { prisma } from '@vastu/shared/prisma';
import {
  extractColumnMeta,
  resolveModelName,
  translateFilter,
  translateSort,
  translateSearch,
  getStringColumnNames,
} from '@vastu/shared/data-engine';
import { requireSessionWithAbility } from '@/lib/session';

const sessionMock = vi.mocked(requireSessionWithAbility);
const prismaMock = vi.mocked(prisma);
const extractColumnMetaMock = vi.mocked(extractColumnMeta);
const resolveModelNameMock = vi.mocked(resolveModelName);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAbility(canResult = true) {
  return { can: vi.fn(() => canResult) };
}

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-1',
      name: 'Test User',
      organizationId: 'org-1',
      ...overrides,
    },
  };
}

function setupAuth(canResult = true) {
  sessionMock.mockResolvedValueOnce({
    session: buildSession() as never,
    ability: buildAbility(canResult) as never,
  });
}

function setupDataEngineMocks(modelName: 'Page' | 'Driver') {
  resolveModelNameMock.mockImplementation((tableParam: string): string | null => {
    if (tableParam === 'Page' || tableParam === 'page') return 'Page';
    if (tableParam === 'Driver' || tableParam === 'driver') return 'Driver';
    return null;
  });

  extractColumnMetaMock.mockImplementation((name: string): ColumnMeta[] => {
    if (name === 'Page') return PAGE_COLUMNS;
    if (name === 'Driver') return DRIVER_COLUMNS;
    return [];
  });

  void modelName; // suppress unused warning — callers set up per model
}

function makeRequest(params: Record<string, string | undefined>): NextRequest {
  const url = new URL('http://localhost/api/workspace/data/query');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

function setupPageDelegate(rows: Record<string, unknown>[] = [], total = 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic mock access
  (prismaMock as any).page = {
    findMany: vi.fn().mockResolvedValue(rows),
    count: vi.fn().mockResolvedValue(total),
  };
}

function setupDriverDelegate(rows: Record<string, unknown>[] = [], total = 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic mock access
  (prismaMock as any).driver = {
    findMany: vi.fn().mockResolvedValue(rows),
    count: vi.fn().mockResolvedValue(total),
  };
}

// ---------------------------------------------------------------------------
// Tests: column validation (Issue #1 — data leakage prevention)
// ---------------------------------------------------------------------------

describe('GET /api/workspace/data/query — column validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(translateFilter).mockReturnValue({});
    vi.mocked(translateSort).mockReturnValue([]);
    vi.mocked(translateSearch).mockReturnValue({});
    vi.mocked(getStringColumnNames).mockReturnValue(['name']);
  });

  it('returns 400 when columns contains a field not present on the model', async () => {
    setupAuth();
    setupDataEngineMocks('Page');

    const response = await GET(
      makeRequest({
        table: 'Page',
        columns: JSON.stringify(['id', 'nonExistentField', 'anotherBadField']),
      }),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/columns/i);
    expect(body.error).toContain('nonExistentField');
    expect(body.error).toContain('anotherBadField');
    expect(body.error).toContain('Page');
  });

  it('returns 400 when columns contains a single invalid field name', async () => {
    setupAuth();
    setupDataEngineMocks('Page');

    const response = await GET(
      makeRequest({ table: 'Page', columns: JSON.stringify(['id', 'password']) }),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('password');
    expect(body.error).toContain('Page');
  });

  it('returns 200 when all requested columns are valid model fields', async () => {
    setupAuth();
    setupDataEngineMocks('Page');
    setupPageDelegate([{ id: 'p1', name: 'Home' }], 1);

    const response = await GET(
      makeRequest({ table: 'Page', columns: JSON.stringify(['id', 'name']) }),
    );

    expect(response.status).toBe(200);
  });

  it('returns 200 with no columns param — selects all fields', async () => {
    setupAuth();
    setupDataEngineMocks('Page');
    setupPageDelegate([{ id: 'p1', name: 'Home', organizationId: 'org-1', createdAt: new Date() }], 1);

    const response = await GET(makeRequest({ table: 'Page' }));

    expect(response.status).toBe(200);
    const body = await response.json() as { columns: ColumnMeta[] };
    expect(Array.isArray(body.columns)).toBe(true);
    expect(body.columns.length).toBe(PAGE_COLUMNS.length);
  });

  it('returns 400 when columns is an object instead of an array', async () => {
    setupAuth();
    setupDataEngineMocks('Page');

    const response = await GET(
      makeRequest({ table: 'Page', columns: JSON.stringify({ id: true }) }),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/columns.*JSON string array/i);
  });

  it('returns 400 when columns is not valid JSON', async () => {
    setupAuth();
    setupDataEngineMocks('Page');

    const response = await GET(makeRequest({ table: 'Page', columns: 'not-json' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/not valid JSON/i);
  });

  it('accepts foreign key field names as valid columns', async () => {
    // organizationId is a FK field in PAGE_COLUMNS — callers may legitimately request it.
    setupAuth();
    setupDataEngineMocks('Page');
    setupPageDelegate([{ id: 'p1', organizationId: 'org-1' }], 1);

    const response = await GET(
      makeRequest({ table: 'Page', columns: JSON.stringify(['id', 'organizationId']) }),
    );

    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Tests: tenant scoping (Issue #3)
// ---------------------------------------------------------------------------

describe('GET /api/workspace/data/query — tenant scoping', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(translateFilter).mockReturnValue({});
    vi.mocked(translateSort).mockReturnValue([]);
    vi.mocked(translateSearch).mockReturnValue({});
    vi.mocked(getStringColumnNames).mockReturnValue(['name']);
  });

  it('injects organizationId into WHERE clause for models that have that field', async () => {
    setupAuth();
    setupDataEngineMocks('Page');
    const findManyMock = vi.fn().mockResolvedValue([]);
    const countMock = vi.fn().mockResolvedValue(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic mock
    (prismaMock as any).page = { findMany: findManyMock, count: countMock };

    await GET(makeRequest({ table: 'Page' }));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      }),
    );
  });

  it('does not inject organizationId for reference models without that field', async () => {
    setupAuth();
    setupDataEngineMocks('Driver');
    const findManyMock = vi.fn().mockResolvedValue([]);
    const countMock = vi.fn().mockResolvedValue(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic mock
    (prismaMock as any).driver = { findMany: findManyMock, count: countMock };

    await GET(makeRequest({ table: 'Driver' }));

    const callArgs = findManyMock.mock.calls[0]?.[0] as { where?: Record<string, unknown> };
    const where = callArgs?.where ?? {};
    expect(where).not.toHaveProperty('organizationId');
  });

  it('still returns 200 for reference models without tenant scoping', async () => {
    setupAuth();
    setupDataEngineMocks('Driver');
    setupDriverDelegate([{ id: 'drv-1', firstName: 'Lewis', lastName: 'Hamilton' }], 1);

    const response = await GET(makeRequest({ table: 'Driver' }));

    expect(response.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Tests: auth and table validation
// ---------------------------------------------------------------------------

describe('GET /api/workspace/data/query — auth and table validation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(translateFilter).mockReturnValue({});
    vi.mocked(translateSort).mockReturnValue([]);
    vi.mocked(translateSearch).mockReturnValue({});
    vi.mocked(getStringColumnNames).mockReturnValue(['name']);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await GET(makeRequest({ table: 'Page' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks read:Record permission', async () => {
    setupAuth(false);

    const response = await GET(makeRequest({ table: 'Page' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 400 when table parameter is missing', async () => {
    setupAuth();

    const response = await GET(makeRequest({}));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/table/i);
  });

  it('returns 400 when table name is not in the allowlist', async () => {
    setupAuth();
    // resolveModelName returns a value but it's not in ALLOWED_TABLES
    resolveModelNameMock.mockReturnValueOnce('User');

    const response = await GET(makeRequest({ table: 'User' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/not accessible/i);
  });

  it('returns 400 when table name cannot be resolved', async () => {
    setupAuth();
    resolveModelNameMock.mockReturnValueOnce(null);

    const response = await GET(makeRequest({ table: 'NotARealTable' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/not accessible/i);
  });
});

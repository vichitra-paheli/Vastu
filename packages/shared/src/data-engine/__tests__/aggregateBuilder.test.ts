/**
 * AggregateBuilder unit tests.
 *
 * Implements US-203 AC-1 through AC-6.
 *
 * Tests cover:
 * - prismaModelToTableName (model → table name conversion)
 * - mapTimeResolution (TimeResolution → Postgres date_trunc granularity)
 * - formatBucket (date bucket formatting)
 * - escapeSqlIdent (SQL identifier safety)
 * - buildRawWhere (WHERE clause generation from Prisma where objects)
 * - AggregateValidationError is thrown for invalid requests
 * - runAggregate integration: mocked Prisma client covering all paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  prismaModelToTableName,
  mapTimeResolution,
  formatBucket,
  escapeSqlIdent,
  buildRawWhere,
  runAggregate,
  AggregateValidationError,
} from '../aggregateBuilder';
import type { AggregateRequest } from '../aggregateTypes';

// ─── Mock columnMeta so tests don't need a live Prisma DMMF ──────────────────
//
// The aggregateBuilder calls getColumnMeta() for validation.
// We mock it to return predefined columns for the fake model names used in tests.

vi.mock('../columnMeta', () => ({
  getColumnMeta: vi.fn((modelName: string) => {
    const schemas: Record<string, Array<{ name: string; type: string }>> = {
      Race: [
        { name: 'id', type: 'String' },
        { name: 'status', type: 'Enum' },
        { name: 'date', type: 'DateTime' },
        { name: 'constructorId', type: 'String' },
        { name: 'organizationId', type: 'String' },
      ],
      RaceResult: [
        { name: 'id', type: 'String' },
        { name: 'points', type: 'Float' },
        { name: 'status', type: 'Enum' },
        { name: 'raceId', type: 'String' },
        { name: 'organizationId', type: 'String' },
      ],
    };
    const cols = schemas[modelName];
    if (!cols) throw new Error(`Unknown Prisma model: "${modelName}"`);
    return cols.map((c) => ({
      name: c.name,
      type: c.type,
      nullable: false,
      isPrimaryKey: c.name === 'id',
      isForeignKey: c.name.endsWith('Id') && c.name !== 'id',
    }));
  }),
  getModelNames: vi.fn(() => ['Race', 'RaceResult']),
  getStringColumns: vi.fn(() => []),
  _clearCache: vi.fn(),
}));

// ─── prismaModelToTableName ───────────────────────────────────────────────────

describe('prismaModelToTableName', () => {
  it('lowercase passthrough for single-word model', () => {
    expect(prismaModelToTableName('Race')).toBe('race');
  });

  it('converts PascalCase to snake_case', () => {
    expect(prismaModelToTableName('RaceResult')).toBe('race_result');
  });

  it('converts multi-word model', () => {
    expect(prismaModelToTableName('DriverStanding')).toBe('driver_standing');
  });

  it('handles already-lowercase', () => {
    expect(prismaModelToTableName('user')).toBe('user');
  });
});

// ─── mapTimeResolution ────────────────────────────────────────────────────────

describe('mapTimeResolution', () => {
  it('maps hourly → hour', () => {
    expect(mapTimeResolution('hourly')).toBe('hour');
  });

  it('maps daily → day', () => {
    expect(mapTimeResolution('daily')).toBe('day');
  });

  it('maps weekly → week', () => {
    expect(mapTimeResolution('weekly')).toBe('week');
  });

  it('maps monthly → month', () => {
    expect(mapTimeResolution('monthly')).toBe('month');
  });

  it('maps yearly → year', () => {
    expect(mapTimeResolution('yearly')).toBe('year');
  });
});

// ─── formatBucket ─────────────────────────────────────────────────────────────

describe('formatBucket', () => {
  const date = new Date('2024-06-15T14:30:00Z');

  it('formats hourly bucket', () => {
    expect(formatBucket(date, 'hourly')).toBe('2024-06-15 14:30');
  });

  it('formats daily bucket', () => {
    expect(formatBucket(date, 'daily')).toBe('2024-06-15');
  });

  it('formats monthly bucket', () => {
    expect(formatBucket(date, 'monthly')).toBe('2024-06');
  });

  it('formats yearly bucket', () => {
    expect(formatBucket(date, 'yearly')).toBe('2024');
  });

  it('formats weekly bucket as ISO week', () => {
    // 2024-06-15 is a Saturday, falls in ISO week 24
    const result = formatBucket(date, 'weekly');
    expect(result).toMatch(/^2024-W\d{2}$/);
  });
});

// ─── escapeSqlIdent ───────────────────────────────────────────────────────────

describe('escapeSqlIdent', () => {
  it('returns clean identifiers unchanged', () => {
    expect(escapeSqlIdent('my_column')).toBe('my_column');
  });

  it('strips double-quote characters', () => {
    expect(escapeSqlIdent('col"umn')).toBe('column');
  });

  it('strips multiple double-quotes', () => {
    expect(escapeSqlIdent('"col"')).toBe('col');
  });
});

// ─── buildRawWhere ────────────────────────────────────────────────────────────

describe('buildRawWhere', () => {
  it('returns empty sql for empty where object', () => {
    const { sql, params } = buildRawWhere({});
    expect(sql).toBe('');
    expect(params).toEqual([]);
  });

  it('generates gte/lte clause for date range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    const { sql, params } = buildRawWhere({ createdAt: { gte: start, lte: end } });
    expect(sql).toContain('"createdAt" >= $2');
    expect(sql).toContain('"createdAt" <= $3');
    expect(params).toContain(start);
    expect(params).toContain(end);
  });

  it('generates IN clause for string values', () => {
    const { sql, params } = buildRawWhere({ status: { in: ['Active', 'Pending'] } });
    expect(sql).toContain('"status" IN ($2, $3)');
    expect(params).toEqual(['Active', 'Pending']);
  });

  it('generates ILIKE clause for contains', () => {
    const { sql, params } = buildRawWhere({ name: { contains: 'hamilton', mode: 'insensitive' } });
    expect(sql).toContain('"name" ILIKE $2');
    expect(params[0]).toContain('hamilton');
  });

  it('generates AND clause for AND array', () => {
    const where = {
      AND: [
        { organizationId: 'org-1' },
        { status: { in: ['Active'] } },
      ],
    };
    const { sql, params } = buildRawWhere(where);
    expect(sql).toContain('AND');
    expect(params).toContain('org-1');
    expect(params).toContain('Active');
  });

  it('generates = clause for primitive value', () => {
    const { sql, params } = buildRawWhere({ organizationId: 'tenant-123' });
    expect(sql).toContain('"organizationId" = $2');
    expect(params).toEqual(['tenant-123']);
  });

  it('generates NOT clause', () => {
    const { sql, params } = buildRawWhere({ NOT: { status: { in: ['Deleted'] } } });
    expect(sql).toContain('NOT');
    expect(sql).toContain('"status" IN');
    expect(params).toContain('Deleted');
  });
});

// ─── runAggregate — validation errors ────────────────────────────────────────

describe('runAggregate — validation errors', () => {
  // Minimal mock (errors thrown before any DB call)
  const mockPrisma = { $queryRawUnsafe: vi.fn() };

  it('throws when sum metric missing field', async () => {
    const req: AggregateRequest = { table: 'Race', metric: 'sum' };
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runAggregate(mockPrisma as any, req),
    ).rejects.toThrow(AggregateValidationError);
  });

  it('throws when avg metric missing field', async () => {
    const req: AggregateRequest = { table: 'Race', metric: 'avg' };
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runAggregate(mockPrisma as any, req),
    ).rejects.toThrow(AggregateValidationError);
  });

  it('throws when timeField provided without timeResolution', async () => {
    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      timeField: 'date',
      // no timeResolution
    };
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runAggregate(mockPrisma as any, req),
    ).rejects.toThrow(AggregateValidationError);
  });

  it('throws when sum applied to non-numeric field', async () => {
    const req: AggregateRequest = { table: 'Race', metric: 'sum', field: 'status' };
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runAggregate(mockPrisma as any, req),
    ).rejects.toThrow(AggregateValidationError);
  });

  it('throws when groupBy column does not exist', async () => {
    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      groupBy: 'nonExistentColumn',
    };
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runAggregate(mockPrisma as any, req),
    ).rejects.toThrow(AggregateValidationError);
  });
});

// ─── runAggregate — simple count (mocked Prisma) ──────────────────────────────

describe('runAggregate — simple count', () => {
  it('returns SimpleAggregateResponse for count metric', async () => {
    const mockModel = { count: vi.fn().mockResolvedValue(42) };
    const mockPrisma = { race: mockModel };

    const req: AggregateRequest = { table: 'Race', metric: 'count' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(42);
      expect(result.data[0]).toEqual({ label: 'total', value: 42 });
    }
    expect(mockModel.count).toHaveBeenCalledWith({ where: {} });
  });

  it('applies extraWhere (tenant scope) to count', async () => {
    const mockModel = { count: vi.fn().mockResolvedValue(10) };
    const mockPrisma = { race: mockModel };

    const req: AggregateRequest = { table: 'Race', metric: 'count' };
    const extraWhere = { organizationId: 'org-abc' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runAggregate(mockPrisma as any, req, extraWhere);

    expect(mockModel.count).toHaveBeenCalledWith({
      where: { organizationId: 'org-abc' },
    });
  });

  it('returns empty data with total=0 for count of 0', async () => {
    const mockModel = { count: vi.fn().mockResolvedValue(0) };
    const mockPrisma = { race: mockModel };

    const req: AggregateRequest = { table: 'Race', metric: 'count' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(0);
    }
  });
});

// ─── runAggregate — simple sum (mocked Prisma) ───────────────────────────────

describe('runAggregate — simple sum', () => {
  it('returns sum value', async () => {
    const mockModel = {
      aggregate: vi.fn().mockResolvedValue({ _sum: { points: 1234.5 } }),
    };
    const mockPrisma = { raceResult: mockModel };

    const req: AggregateRequest = { table: 'RaceResult', metric: 'sum', field: 'points' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(1234.5);
    }
    expect(mockModel.aggregate).toHaveBeenCalledWith({
      where: {},
      _sum: { points: true },
    });
  });

  it('returns avg value', async () => {
    const mockModel = {
      aggregate: vi.fn().mockResolvedValue({ _avg: { points: 9.5 } }),
    };
    const mockPrisma = { raceResult: mockModel };

    const req: AggregateRequest = { table: 'RaceResult', metric: 'avg', field: 'points' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBeCloseTo(9.5);
    }
  });

  it('handles null aggregate result (no rows) as 0', async () => {
    const mockModel = {
      aggregate: vi.fn().mockResolvedValue({ _sum: { points: null } }),
    };
    const mockPrisma = { raceResult: mockModel };

    const req: AggregateRequest = { table: 'RaceResult', metric: 'sum', field: 'points' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(0);
    }
  });

  it('returns min value', async () => {
    const mockModel = {
      aggregate: vi.fn().mockResolvedValue({ _min: { points: 0 } }),
    };
    const mockPrisma = { raceResult: mockModel };

    const req: AggregateRequest = { table: 'RaceResult', metric: 'min', field: 'points' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(0);
    }
  });

  it('returns max value', async () => {
    const mockModel = {
      aggregate: vi.fn().mockResolvedValue({ _max: { points: 26 } }),
    };
    const mockPrisma = { raceResult: mockModel };

    const req: AggregateRequest = { table: 'RaceResult', metric: 'max', field: 'points' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(26);
    }
  });
});

// ─── runAggregate — comparePrevious ───────────────────────────────────────────

describe('runAggregate — comparePrevious', () => {
  it('includes previous period data when comparePrevious=true (simple count)', async () => {
    // Without timeField, the simple count path is used.
    // comparePrevious with a timeRange but no timeField → simple count runs twice.
    let callCount = 0;
    const mockModel = {
      count: vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? 50 : 30);
      }),
    };
    const mockPrisma = { race: mockModel };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      comparePrevious: true,
      timeRange: {
        start: '2024-01-01',
        end: '2024-06-30',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(50);
      expect(result.previous).toBeDefined();
      expect(result.previousTotal).toBe(30);
    }
    expect(mockModel.count).toHaveBeenCalledTimes(2);
  });

  it('includes previous period data when comparePrevious=true (time-bucketed)', async () => {
    // When timeField + timeResolution set, time bucket path runs twice (current + previous).
    let rawCallCount = 0;
    const mockRawQuery = vi.fn().mockImplementation(() => {
      rawCallCount++;
      if (rawCallCount === 1) {
        return Promise.resolve([
          { bucket: new Date('2024-06-01'), value: '50' },
        ]);
      }
      return Promise.resolve([
        { bucket: new Date('2024-01-01'), value: '30' },
      ]);
    });
    const mockPrisma = { $queryRawUnsafe: mockRawQuery };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      comparePrevious: true,
      timeField: 'date',
      timeResolution: 'monthly',
      timeRange: {
        start: '2024-01-01',
        end: '2024-06-30',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.total).toBe(50);
      expect(result.previous).toBeDefined();
      expect(result.previousTotal).toBe(30);
    }
    // Called twice: once for current period, once for previous period
    expect(mockRawQuery).toHaveBeenCalledTimes(2);
  });
});

// ─── runAggregate — groupBy (mocked Prisma) ───────────────────────────────────

describe('runAggregate — groupBy', () => {
  it('groups count by column', async () => {
    const mockModel = {
      groupBy: vi.fn().mockResolvedValue([
        { status: 'Completed', _count: { _all: 80 } },
        { status: 'Cancelled', _count: { _all: 5 } },
      ]),
    };
    const mockPrisma = { race: mockModel };

    const req: AggregateRequest = { table: 'Race', metric: 'count', groupBy: 'status' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ label: 'Completed', value: 80 });
      expect(result.data[1]).toEqual({ label: 'Cancelled', value: 5 });
      expect(result.total).toBe(85);
    }
  });

  it('handles null groupBy value as "(null)"', async () => {
    const mockModel = {
      groupBy: vi.fn().mockResolvedValue([
        { status: null, _count: { _all: 3 } },
      ]),
    };
    const mockPrisma = { race: mockModel };

    const req: AggregateRequest = { table: 'Race', metric: 'count', groupBy: 'status' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.data[0].label).toBe('(null)');
    }
  });

  it('includes sum value from groupBy row', async () => {
    const mockModel = {
      groupBy: vi.fn().mockResolvedValue([
        { status: 'Finished', _sum: { points: 125.5 } },
        { status: 'DNF', _sum: { points: 0 } },
      ]),
    };
    const mockPrisma = { raceResult: mockModel };

    const req: AggregateRequest = {
      table: 'RaceResult',
      metric: 'sum',
      field: 'points',
      groupBy: 'status',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.data[0]).toEqual({ label: 'Finished', value: 125.5 });
      expect(result.data[1]).toEqual({ label: 'DNF', value: 0 });
    }
  });
});

// ─── runAggregate — time bucket (mocked Prisma) ──────────────────────────────

describe('runAggregate — time bucket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes raw query for time-bucketed count', async () => {
    const mockRawQuery = vi.fn().mockResolvedValue([
      { bucket: new Date('2024-01-01'), value: '15' },
      { bucket: new Date('2024-02-01'), value: '20' },
    ]);
    const mockPrisma = { $queryRawUnsafe: mockRawQuery };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      timeField: 'date',
      timeResolution: 'monthly',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ label: '2024-01', value: 15 });
      expect(result.data[1]).toEqual({ label: '2024-02', value: 20 });
      expect(result.total).toBe(35);
    }
    // Verify that raw query was called with the resolution as first param
    expect(mockRawQuery).toHaveBeenCalledWith(
      expect.stringContaining('date_trunc'),
      'month',
    );
  });

  it('returns empty data for empty time bucket result', async () => {
    const mockPrisma = { $queryRawUnsafe: vi.fn().mockResolvedValue([]) };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      timeField: 'date',
      timeResolution: 'daily',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('simple');
    if (result.kind === 'simple') {
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    }
  });

  it('applies time range filter in raw query for daily resolution', async () => {
    const mockRawQuery = vi.fn().mockResolvedValue([]);
    const mockPrisma = { $queryRawUnsafe: mockRawQuery };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      timeField: 'date',
      timeResolution: 'daily',
      timeRange: { start: '2024-01-01', end: '2024-03-31' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runAggregate(mockPrisma as any, req);

    // Verify raw query was called with 'day' resolution
    expect(mockRawQuery).toHaveBeenCalledWith(
      expect.stringContaining('date_trunc'),
      'day',
      expect.any(Date),
      expect.any(Date),
    );
  });
});

// ─── runAggregate — multi-series (mocked Prisma) ─────────────────────────────

describe('runAggregate — multi-series', () => {
  it('groups into series when both groupBy and timeField provided', async () => {
    const mockRawQuery = vi.fn().mockResolvedValue([
      { bucket: new Date('2024-01-01'), series_name: 'TeamA', value: '10' },
      { bucket: new Date('2024-01-01'), series_name: 'TeamB', value: '5' },
      { bucket: new Date('2024-02-01'), series_name: 'TeamA', value: '12' },
    ]);
    const mockPrisma = { $queryRawUnsafe: mockRawQuery };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      groupBy: 'constructorId',
      timeField: 'date',
      timeResolution: 'monthly',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('multi-series');
    if (result.kind === 'multi-series') {
      expect(result.series).toHaveLength(2);
      const teamA = result.series.find((s) => s.name === 'TeamA');
      expect(teamA?.data).toHaveLength(2);
      expect(teamA?.data[0]).toEqual({ label: '2024-01', value: 10 });
      const teamB = result.series.find((s) => s.name === 'TeamB');
      expect(teamB?.data).toHaveLength(1);
    }
  });

  it('handles null series_name as "(null)"', async () => {
    const mockRawQuery = vi.fn().mockResolvedValue([
      { bucket: new Date('2024-01-01'), series_name: null, value: '7' },
    ]);
    const mockPrisma = { $queryRawUnsafe: mockRawQuery };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      groupBy: 'constructorId',
      timeField: 'date',
      timeResolution: 'monthly',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await runAggregate(mockPrisma as any, req);

    expect(result.kind).toBe('multi-series');
    if (result.kind === 'multi-series') {
      expect(result.series[0].name).toBe('(null)');
    }
  });
});

// ─── runAggregate — filters applied (mocked Prisma) ──────────────────────────

describe('runAggregate — filter integration', () => {
  it('passes filter-derived where clause to Prisma count', async () => {
    const mockModel = { count: vi.fn().mockResolvedValue(5) };
    const mockPrisma = { race: mockModel };

    const req: AggregateRequest = {
      table: 'Race',
      metric: 'count',
      filters: {
        type: 'condition',
        column: 'status',
        mode: 'include',
        dataType: 'text',
        value: 'Completed',
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runAggregate(mockPrisma as any, req);

    // The filter should be reflected in the where clause passed to count
    const callArgs = mockModel.count.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ status: { in: ['Completed'] } });
  });
});

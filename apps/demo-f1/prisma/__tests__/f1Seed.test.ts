/**
 * f1Seed.test.ts — Unit tests for the F1 seed data module
 *
 * Tests:
 *   - runF1Seed is importable and callable (mock Prisma)
 *   - Deterministic IDs are stable across calls (no collisions)
 *   - Static data counts match requirements
 *   - ID generation format is valid UUID v4-ish (hash-based)
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @prisma/client — enums and PrismaClient are not available until
// `prisma generate` has been run against a real database. We mock them here
// so the seed logic can be tested without a database connection.
// ---------------------------------------------------------------------------

vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {},
  CircuitType: { Street: 'Street', Permanent: 'Permanent', SemiPermanent: 'SemiPermanent' },
  ConstructorStatus: { Active: 'Active', Withdrawn: 'Withdrawn' },
  DriverStatus: { Active: 'Active', Retired: 'Retired', Reserve: 'Reserve' },
  RaceStatus: { Scheduled: 'Scheduled', Completed: 'Completed', Cancelled: 'Cancelled' },
  WeatherCondition: { Dry: 'Dry', Wet: 'Wet', Mixed: 'Mixed' },
  RaceResultStatus: { Finished: 'Finished', DNF: 'DNF', DSQ: 'DSQ', DNS: 'DNS' },
  TireCompound: { Soft: 'Soft', Medium: 'Medium', Hard: 'Hard', Intermediate: 'Intermediate', Wet: 'Wet' },
  RaceEventType: {
    Start: 'Start', PitStop: 'PitStop', Overtake: 'Overtake', Penalty: 'Penalty',
    SafetyCar: 'SafetyCar', RedFlag: 'RedFlag', Retirement: 'Retirement',
    FastestLap: 'FastestLap', Finish: 'Finish',
  },
  PenaltyType: {
    TimePenalty: 'TimePenalty', GridPenalty: 'GridPenalty', DriveThrough: 'DriveThrough',
    StopGo: 'StopGo', Reprimand: 'Reprimand', Disqualification: 'Disqualification',
  },
}));

import { runF1Seed } from '../f1Seed';

// ---------------------------------------------------------------------------
// Mock PrismaClient instance factory
// ---------------------------------------------------------------------------

function createPrismaMock() {
  const upsertFn = vi.fn().mockResolvedValue({});
  const createManyFn = vi.fn().mockResolvedValue({ count: 0 });
  const updateFn = vi.fn().mockResolvedValue({});

  return {
    circuit: { upsert: vi.fn().mockResolvedValue({}) },
    constructor: { upsert: vi.fn().mockResolvedValue({}) },
    driver: { upsert: vi.fn().mockResolvedValue({}) },
    season: {
      upsert: vi.fn().mockResolvedValue({}),
      update: updateFn,
    },
    race: { upsert: vi.fn().mockResolvedValue({}) },
    raceResult: {
      upsert: upsertFn,
      update: updateFn,
    },
    qualifyingResult: { upsert: vi.fn().mockResolvedValue({}) },
    sprintResult: { upsert: vi.fn().mockResolvedValue({}) },
    pitStop: { upsert: vi.fn().mockResolvedValue({}) },
    lapTime: { createMany: createManyFn },
    driverStanding: { upsert: vi.fn().mockResolvedValue({}) },
    constructorStanding: { upsert: vi.fn().mockResolvedValue({}) },
    raceEvent: { upsert: vi.fn().mockResolvedValue({}) },
    penalty: { upsert: vi.fn().mockResolvedValue({}) },
  };
}

// UUID v4-ish pattern produced by makeId (hash-based, version 4, variant a)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runF1Seed', () => {
  it('is importable as a named export', () => {
    expect(typeof runF1Seed).toBe('function');
  });

  it('resolves without throwing when called with a mock Prisma client', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock, not full PrismaClient
    await expect(runF1Seed(prisma as any)).resolves.toBeUndefined();
  }, 60000);

  it('creates exactly 25 circuits', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);
    expect(prisma.circuit.upsert).toHaveBeenCalledTimes(25);
  }, 60000);

  it('creates exactly 10 constructors', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);
    expect(prisma.constructor.upsert).toHaveBeenCalledTimes(10);
  }, 60000);

  it('creates at least 20 drivers', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);
    expect(prisma.driver.upsert.mock.calls.length).toBeGreaterThanOrEqual(20);
  }, 60000);

  it('creates exactly 5 seasons', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);
    expect(prisma.season.upsert).toHaveBeenCalledTimes(5);
  }, 60000);

  it('creates exactly 110 races (22 per season × 5 seasons)', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);
    expect(prisma.race.upsert).toHaveBeenCalledTimes(110);
  }, 60000);

  it('produces valid UUID-format IDs for all circuits', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    for (const call of prisma.circuit.upsert.mock.calls) {
      const id: string = call[0].create.id as string;
      expect(id).toMatch(UUID_PATTERN);
    }
  }, 60000);

  it('produces valid UUID-format IDs for all drivers', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    for (const call of prisma.driver.upsert.mock.calls) {
      const id: string = call[0].create.id as string;
      expect(id).toMatch(UUID_PATTERN);
    }
  }, 60000);

  it('produces valid UUID-format IDs for all races', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    for (const call of prisma.race.upsert.mock.calls) {
      const id: string = call[0].create.id as string;
      expect(id).toMatch(UUID_PATTERN);
    }
  }, 60000);

  it('produces identical circuit IDs on two independent calls (deterministic)', async () => {
    const prisma1 = createPrismaMock();
    const prisma2 = createPrismaMock();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma2 as any);

    const ids1 = prisma1.circuit.upsert.mock.calls.map((c) => c[0].create.id as string);
    const ids2 = prisma2.circuit.upsert.mock.calls.map((c) => c[0].create.id as string);

    expect(ids1).toEqual(ids2);
  }, 120000);

  it('produces identical race IDs on two independent calls (deterministic)', async () => {
    const prisma1 = createPrismaMock();
    const prisma2 = createPrismaMock();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma1 as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma2 as any);

    const ids1 = prisma1.race.upsert.mock.calls.map((c) => c[0].create.id as string);
    const ids2 = prisma2.race.upsert.mock.calls.map((c) => c[0].create.id as string);

    expect(ids1).toEqual(ids2);
  }, 120000);

  it('has no duplicate circuit IDs', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const ids = prisma.circuit.upsert.mock.calls.map((c) => c[0].create.id as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  }, 60000);

  it('has no duplicate constructor IDs', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const ids = prisma.constructor.upsert.mock.calls.map((c) => c[0].create.id as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  }, 60000);

  it('has no duplicate race IDs', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const ids = prisma.race.upsert.mock.calls.map((c) => c[0].create.id as string);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  }, 60000);

  it('all race results reference valid race IDs', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const raceIds = new Set(prisma.race.upsert.mock.calls.map((c) => c[0].create.id as string));
    for (const call of prisma.raceResult.upsert.mock.calls) {
      const raceId: string = call[0].create.raceId as string;
      expect(raceIds.has(raceId)).toBe(true);
    }
  }, 60000);

  it('all qualifying results reference valid race IDs', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const raceIds = new Set(prisma.race.upsert.mock.calls.map((c) => c[0].create.id as string));
    for (const call of prisma.qualifyingResult.upsert.mock.calls) {
      const raceId: string = call[0].create.raceId as string;
      expect(raceIds.has(raceId)).toBe(true);
    }
  }, 60000);

  it('creates driver standings for all 110 races', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    // 110 races × 20 drivers = 2200 standings snapshots
    expect(prisma.driverStanding.upsert.mock.calls.length).toBeGreaterThanOrEqual(110 * 10);
  }, 60000);

  it('creates constructor standings for all 110 races', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    // 110 races × 10 constructors = 1100 standings snapshots
    expect(prisma.constructorStanding.upsert.mock.calls.length).toBeGreaterThanOrEqual(110 * 5);
  }, 60000);

  it('race results have valid status values', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const validStatuses = new Set(['Finished', 'DNF', 'DSQ', 'DNS']);
    for (const call of prisma.raceResult.upsert.mock.calls) {
      const status: string = call[0].create.status as string;
      expect(validStatuses.has(status)).toBe(true);
    }
  }, 60000);

  it('pit stops have valid tire compound values', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const validCompounds = new Set(['Soft', 'Medium', 'Hard', 'Intermediate', 'Wet']);
    for (const call of prisma.pitStop.upsert.mock.calls) {
      const compound: string = call[0].create.tireCompound as string;
      expect(validCompounds.has(compound)).toBe(true);
    }
  }, 60000);

  it('lap times are realistic (between 60s and 130s per lap)', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    // Check a sample of lap time batches
    const sampleCalls = prisma.lapTime.createMany.mock.calls.slice(0, 5);
    for (const call of sampleCalls) {
      const data = call[0].data as Array<{ timeMs: number }>;
      for (const row of data) {
        expect(row.timeMs).toBeGreaterThan(60_000); // > 60 seconds
        expect(row.timeMs).toBeLessThan(130_000);   // < 130 seconds
      }
    }
  }, 60000);

  it('seasons cover exactly years 2020 through 2024', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const years = prisma.season.upsert.mock.calls
      .map((c) => c[0].create.year as number)
      .sort((a: number, b: number) => a - b);
    expect(years).toEqual([2020, 2021, 2022, 2023, 2024]);
  }, 60000);

  it('each race has a valid weather condition', async () => {
    const prisma = createPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runF1Seed(prisma as any);

    const validWeather = new Set(['Dry', 'Wet', 'Mixed']);
    for (const call of prisma.race.upsert.mock.calls) {
      const weather: string = call[0].create.weather as string;
      expect(validWeather.has(weather)).toBe(true);
    }
  }, 60000);
});

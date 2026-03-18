/**
 * Tests for shared Prisma test utilities.
 *
 * These tests verify module shape and singleton behaviour without requiring
 * a real database connection (integration tests that actually hit the DB live
 * in the CI pipeline with service containers).
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient so tests do not require a running database.
vi.mock('@prisma/client', () => {
  const MockPrismaClient = vi.fn().mockImplementation(() => ({
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  }));
  return { PrismaClient: MockPrismaClient };
});

describe('getTestPrisma', () => {
  // Re-import the module fresh before each test to reset module-level state.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exports getTestPrisma, cleanupTestDb, and disconnectTestDb', async () => {
    const mod = await import('../prisma');
    expect(typeof mod.getTestPrisma).toBe('function');
    expect(typeof mod.cleanupTestDb).toBe('function');
    expect(typeof mod.disconnectTestDb).toBe('function');
  });

  it('returns an object with $disconnect and $executeRawUnsafe', async () => {
    const { getTestPrisma } = await import('../prisma');
    const client = getTestPrisma();
    expect(client).toBeDefined();
    expect(typeof client.$disconnect).toBe('function');
    expect(typeof client.$executeRawUnsafe).toBe('function');
  });

  it('returns the same singleton on repeated calls', async () => {
    const { getTestPrisma } = await import('../prisma');
    const first = getTestPrisma();
    const second = getTestPrisma();
    expect(first).toBe(second);
  });

  it('creates a new client after disconnectTestDb is called', async () => {
    const { getTestPrisma, disconnectTestDb } = await import('../prisma');
    const first = getTestPrisma();
    await disconnectTestDb();
    const second = getTestPrisma();
    // After disconnect the old singleton is nulled; a new instance is created.
    expect(second).not.toBe(first);
  });
});

describe('disconnectTestDb', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls $disconnect on the prisma client', async () => {
    const { getTestPrisma, disconnectTestDb } = await import('../prisma');
    const client = getTestPrisma();
    await disconnectTestDb();
    expect(client.$disconnect).toHaveBeenCalledOnce();
  });

  it('is safe to call when no client has been created (no throw)', async () => {
    const { disconnectTestDb } = await import('../prisma');
    // disconnectTestDb without calling getTestPrisma first should be a no-op
    await expect(disconnectTestDb()).resolves.toBeUndefined();
  });
});

describe('cleanupTestDb', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls $executeRawUnsafe for each expected table', async () => {
    const { getTestPrisma, cleanupTestDb } = await import('../prisma');
    const client = getTestPrisma();
    await cleanupTestDb();

    const expectedTables = [
      'audit_events',
      'api_keys',
      'db_connections',
      'permissions',
      'user_roles',
      'sessions',
      'accounts',
      'verification_tokens',
      'users',
      'roles',
      'tenants',
      'organizations',
    ];

    expect(client.$executeRawUnsafe).toHaveBeenCalledTimes(expectedTables.length);

    for (const table of expectedTables) {
      expect(client.$executeRawUnsafe).toHaveBeenCalledWith(
        `TRUNCATE TABLE "${table}" CASCADE;`,
      );
    }
  });
});

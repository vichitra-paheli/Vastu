/**
 * Prisma test utilities.
 *
 * These helpers are intended for integration tests that run against a real
 * (test-isolated) PostgreSQL database. They are NOT imported by the main
 * package index — consume them directly:
 *
 *   import { getTestPrisma, cleanupTestDb } from '@vastu/shared/src/test-utils/prisma';
 *
 * A separate test database URL should be configured via DATABASE_URL in the
 * test environment (e.g. CI service containers). The default falls back to a
 * local `vastu_test` database.
 */

import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

/**
 * Returns (or creates) a singleton PrismaClient pointed at the test database.
 * Uses process.env.DATABASE_URL when set, otherwise falls back to the local
 * development test database.
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL ?? 'postgresql://vastu:vastu@localhost:5432/vastu_test',
        },
      },
    });
  }
  return testPrisma;
}

/**
 * Truncates all application tables in reverse dependency order.
 * Call in afterEach / afterAll to reset state between tests.
 *
 * Note: uses raw TRUNCATE … CASCADE — only appropriate for test databases.
 */
export async function cleanupTestDb(): Promise<void> {
  const prisma = getTestPrisma();

  // Listed in reverse FK dependency order so CASCADE is not strictly needed,
  // but CASCADE is included as a safety net.
  const tableNames = [
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

  for (const table of tableNames) {
    // Raw SQL is acceptable here: this helper is test-only and not part of the
    // application data-access layer (which must use the Prisma model API).
    // The table name is hardcoded in the array above so there is no injection risk.
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
}

/**
 * Disconnects and destroys the test Prisma client.
 * Call in a global afterAll teardown to cleanly close the DB connection.
 */
export async function disconnectTestDb(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

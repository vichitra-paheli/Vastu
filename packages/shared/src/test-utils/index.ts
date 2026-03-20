/**
 * Test utilities for @vastu/shared.
 *
 * These are intentionally NOT re-exported from the main package index
 * (`packages/shared/src/index.ts`) to avoid polluting production bundles
 * with test-only helpers. Import them directly in test files:
 *
 *   import { getTestPrisma, cleanupTestDb } from '@vastu/shared/src/test-utils';
 */

export { getTestPrisma, cleanupTestDb, disconnectTestDb } from './prisma';

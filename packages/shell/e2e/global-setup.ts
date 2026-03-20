/**
 * Playwright global setup — browser state isolation + auth session seeding
 *
 * Runs once before the entire test suite:
 * 1. Deletes any persisted auth-state files so unauthenticated tests start clean.
 * 2. Creates database sessions for each test user (admin, editor, viewer) and
 *    writes Playwright storageState JSON files to `.auth/`.
 *
 * Auth state files are written by `seedTestSessions` into packages/shell/.auth/.
 * Individual specs that require unauthenticated context also declare
 *   test.use({ storageState: { cookies: [], origins: [] } })
 * which is the per-spec defence. This global setup is the suite-level defence.
 */

import fs from 'fs';
import path from 'path';
import { seedTestSessions } from './auth-setup';

export default async function globalSetup(): Promise<void> {
  const authDir = path.resolve(__dirname, '../.auth');

  // Step 1: Clear any leftover auth state from a previous run.
  if (fs.existsSync(authDir)) {
    const entries = fs.readdirSync(authDir);
    for (const entry of entries) {
      const fullPath = path.join(authDir, entry);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    console.log(`[global-setup] Cleared ${entries.length} auth state file(s) from ${authDir}`);
  } else {
    console.log(`[global-setup] No auth state directory found at ${authDir} — nothing to clear`);
  }

  // Step 2: Create database sessions and write storageState files.
  // This requires a running PostgreSQL instance with migrated + seeded data.
  // In CI, the workflow runs prisma:migrate and prisma:seed before launching tests.
  // Locally, the developer runs `docker compose up -d` + `pnpm prisma:migrate` + `pnpm prisma:seed`.
  if (process.env['DATABASE_URL']) {
    await seedTestSessions(authDir);
  } else {
    console.log(
      '[global-setup] DATABASE_URL not set — skipping session seeding (authenticated tests will be unavailable)',
    );
  }
}

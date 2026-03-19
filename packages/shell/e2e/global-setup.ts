/**
 * Playwright global setup — browser state isolation
 *
 * Runs once before the entire test suite. Deletes any persisted auth-state
 * files so that tests which rely on an unauthenticated browser context are
 * never polluted by a session left over from a previous run.
 *
 * Auth state files are written by `loginAs` (or by a future `storageState`
 * save step) into packages/shell/.auth/. Deleting them here guarantees that
 * every CI run and every local re-run starts from a clean slate.
 *
 * Individual specs that require unauthenticated context also declare
 *   test.use({ storageState: { cookies: [], origins: [] } })
 * which is the per-spec defence. This global setup is the suite-level defence.
 */

import fs from 'fs';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  const authDir = path.resolve(__dirname, '../.auth');

  if (fs.existsSync(authDir)) {
    const entries = fs.readdirSync(authDir);
    for (const entry of entries) {
      const fullPath = path.join(authDir, entry);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    console.log(`[global-setup] Cleared ${entries.length} auth state file(s) from ${authDir}`);
  } else {
    // Directory does not exist yet — nothing to clear.
    console.log(`[global-setup] No auth state directory found at ${authDir} — nothing to clear`);
  }
}

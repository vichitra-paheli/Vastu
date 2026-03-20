/**
 * Playwright configuration for the shell package E2E tests.
 *
 * Tests cover UI rendering and client-side interactions for auth pages.
 * Tests that require live Keycloak or Docker services are marked with
 * test.skip and a comment explaining the requirement.
 *
 * Run: pnpm test:e2e (from packages/shell or repo root)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  // Runs once before the entire suite to wipe any leftover auth-state files,
  // ensuring unauthenticated tests never inherit a prior-run session.
  globalSetup: './e2e/global-setup.ts',

  // Maximum time one test can run for.
  timeout: 30_000,

  // Maximum time the full test suite can run for.
  globalTimeout: 600_000,

  // Fail the build on CI if test.only was accidentally committed.
  forbidOnly: !!process.env['CI'],

  // Retry on CI only.
  retries: process.env['CI'] ? 2 : 0,

  // Parallelism: use all available workers in CI, a smaller number locally.
  workers: process.env['CI'] ? 1 : undefined,

  // Reporter: list in development, GitHub Actions-aware in CI.
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    // Base URL allows using relative paths in goto() calls.
    baseURL: 'http://localhost:3000',

    // Collect trace on the first retry — useful for debugging CI failures.
    trace: 'on-first-retry',

    // Screenshot on failure so we can see what went wrong.
    screenshot: 'only-on-failure',

    // Video on failure for CI debugging.
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /**
   * Web server configuration.
   * In CI the server is started by the workflow before tests run.
   * Locally, Playwright will start the dev server automatically.
   *
   * `reuseExistingServer: true` means Playwright won't start a second server
   * if one is already listening on port 3000.
   */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

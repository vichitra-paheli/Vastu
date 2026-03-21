/**
 * E2E tests — Workspace layout (/workspace)
 *
 * These tests verify that the workspace route renders the three-region
 * layout (sidebar, main content, tray bar) after successful authentication.
 *
 * Tests that require Keycloak (actual login flow) are marked with test.skip.
 * Non-auth tests verify redirect behaviour without Docker services.
 *
 * Coverage (US-106):
 * - AC-2: /workspace route renders workspace layout
 * - AC-3: Layout includes sidebar (left), main content area, tray bar (bottom)
 * - AC-4: Client-side rendered (no server HTML mismatch)
 * - AC-5: Auth middleware protects /workspace (redirects to /login)
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

test.describe('Workspace layout', () => {
  // -------------------------------------------------------------------------
  // Auth protection (no Docker required)
  // -------------------------------------------------------------------------

  test('redirects unauthenticated users to /login', async ({ page }) => {
    // Clear any existing session cookies to ensure we are unauthenticated
    await page.context().clearCookies();
    await page.goto('/workspace');

    // Middleware should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  // -------------------------------------------------------------------------
  // Layout rendering (requires Docker + Keycloak)
  // -------------------------------------------------------------------------

  test.skip('renders sidebar after login', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page.getByRole('complementary', { name: /workspace sidebar/i })).toBeVisible();
  });

  test.skip('renders main content area after login', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test.skip('renders tray bar after login', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page.getByRole('region', { name: /workspace tray/i })).toBeVisible();
  });

  test.skip('workspace page has correct document title', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveTitle(/Workspace.*Vastu/i);
  });
});

/**
 * E2E tests — Admin access control and authentication gate
 *
 * These tests verify that admin and settings pages correctly redirect
 * unauthenticated users and enforce CASL-based access control for non-admin
 * roles, WITHOUT requiring Docker, Keycloak, or a live database.
 *
 * Tests that require actual authenticated sessions (to verify that a non-admin
 * viewer cannot access admin pages, or that an admin can access them) are
 * marked with test.skip and an explanation.
 *
 * Coverage (US-012, US-013, US-020–US-024):
 * - AC-1 (US-012):  Middleware redirects unauthenticated access to /admin/* to /login
 * - AC-2 (US-012):  Redirect URL preserves the originally requested path
 * - AC-1 (US-013):  Middleware redirects unauthenticated access to /settings/* to /login
 * - Admin pages accessible by admin (skipped — needs live session)
 * - Non-admin cannot access admin pages (skipped — needs live session)
 */

import { test, expect } from '@playwright/test';

// All active (non-skipped) tests in this file verify unauthenticated redirect
// behaviour. Declaring storageState at file scope ensures every test browser
// context starts with no cookies or origins, regardless of what a prior run
// may have persisted.
test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Admin routes — unauthenticated access
// ---------------------------------------------------------------------------

test.describe('Admin pages — unauthenticated redirect', () => {
  const adminRoutes = [
    '/admin/users',
    '/admin/roles',
    '/admin/permissions',
    '/admin/tenants',
    '/admin/audit-log',
  ];

  for (const route of adminRoutes) {
    test(`redirects unauthenticated access to ${route} → /login`, async ({ page }) => {
      await page.goto(route);
      // The middleware redirects to /login with a redirect query param.
      await expect(page).toHaveURL(/\/login/);
    });

    test(`redirect from ${route} includes the original path as the redirect param`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/);
      const url = new URL(page.url());
      expect(url.searchParams.get('redirect')).toBe(route);
    });
  }
});

// ---------------------------------------------------------------------------
// Settings routes — unauthenticated access
// ---------------------------------------------------------------------------

test.describe('Settings pages — unauthenticated redirect', () => {
  const settingsRoutes = [
    '/settings/profile',
    '/settings/organization',
    '/settings/databases',
    '/settings/api-keys',
    '/settings/appearance',
    '/settings/sso',
  ];

  for (const route of settingsRoutes) {
    test(`redirects unauthenticated access to ${route} → /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });

    test(`redirect from ${route} includes the original path as the redirect param`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/);
      const url = new URL(page.url());
      expect(url.searchParams.get('redirect')).toBe(route);
    });
  }
});

// ---------------------------------------------------------------------------
// Workspace route — unauthenticated access
// ---------------------------------------------------------------------------

test.describe('Workspace — unauthenticated redirect', () => {
  test('redirects unauthenticated access to /workspace → /login', async ({ page }) => {
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirect from /workspace includes the original path as the redirect param', async ({
    page,
  }) => {
    await page.goto('/workspace');
    await page.waitForURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe('/workspace');
  });
});

// ---------------------------------------------------------------------------
// Admin pages — authenticated admin user (requires live session)
// ---------------------------------------------------------------------------

test.skip('admin user can access /admin/users', async ({ page }) => {
  // Skipped: requires a running Next.js server AND Keycloak with the admin seed
  // user (admin@vastu.dev) authenticated. Use loginAs() from fixtures.ts, then
  // navigate to /admin/users and assert that the Users heading is visible.
  //
  // When available:
  // const { loginAs, TEST_USERS } = await import('../fixtures');
  // await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  // await page.goto('/admin/users');
  // await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  // await expect(page).toHaveURL(/\/admin\/users/);
});

test.skip('admin user can access /admin/roles', async ({ page }) => {
  // Skipped: requires a live authenticated session for admin@vastu.dev.
});

test.skip('admin user can access /admin/permissions', async ({ page }) => {
  // Skipped: requires a live authenticated session for admin@vastu.dev.
});

test.skip('admin user can access /admin/tenants', async ({ page }) => {
  // Skipped: requires a live authenticated session for admin@vastu.dev.
});

test.skip('admin user can access /admin/audit-log', async ({ page }) => {
  // Skipped: requires a live authenticated session for admin@vastu.dev.
});

// ---------------------------------------------------------------------------
// Admin pages — non-admin user (viewer/editor) — CASL gate
// ---------------------------------------------------------------------------

test.skip('viewer user cannot access /admin/users (receives 404)', async ({ page }) => {
  // Skipped: requires a live authenticated session for viewer@vastu.dev.
  //
  // The admin layout calls notFound() for non-admin users instead of
  // redirecting, so the page renders the 404 page rather than /login.
  //
  // When available:
  // const { loginAs, TEST_USERS } = await import('../fixtures');
  // await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
  // await page.goto('/admin/users');
  // await expect(page).toHaveTitle(/404|not found/i);
  // Do NOT assert redirect to /login; the CASL gate returns notFound(), not redirect.
});

test.skip('editor user cannot access /admin/roles (receives 404)', async ({ page }) => {
  // Skipped: requires a live authenticated session for editor@vastu.dev.
  // Same notFound() behavior as the viewer test above.
});

// ---------------------------------------------------------------------------
// Settings pages — authenticated user (any role)
// ---------------------------------------------------------------------------

test.skip('authenticated viewer user can access /settings/profile', async ({ page }) => {
  // Skipped: requires a live authenticated session.
  // Settings pages are accessible to all authenticated users (no CASL check
  // at the settings layout level — individual sensitive settings like
  // /settings/organization gate admin checks within the page component).
  //
  // When available:
  // const { loginAs, TEST_USERS } = await import('../fixtures');
  // await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
  // await page.goto('/settings/profile');
  // await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
});

test.skip('authenticated viewer user cannot access /settings/organization (receives 403 or 404)', async ({
  page,
}) => {
  // Skipped: requires a live authenticated session.
  // /settings/organization is admin-only (CASL-gated within the page component).
  // The exact behavior depends on the page implementation — it may redirect
  // to /settings/profile or render a 404 response.
});

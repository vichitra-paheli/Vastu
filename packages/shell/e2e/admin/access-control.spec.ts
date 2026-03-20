/**
 * E2E tests — Admin access control and authentication gate
 *
 * Coverage (US-012, US-013, US-020–US-024):
 * - AC-1 (US-012):  Middleware redirects unauthenticated access to /admin/* to /login
 * - AC-2 (US-012):  Redirect URL preserves the originally requested path
 * - AC-1 (US-013):  Middleware redirects unauthenticated access to /settings/* to /login
 * - Admin pages accessible by admin (authenticated via DB-seeded session)
 * - Non-admin cannot access admin pages (receives 404 from CASL gate)
 * - Settings pages accessible by any authenticated user
 * - Settings/organization gated for non-admin (CASL check within page)
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(__dirname, '../../.auth');

// ---------------------------------------------------------------------------
// Admin routes — unauthenticated access
// ---------------------------------------------------------------------------

test.describe('Admin pages — unauthenticated redirect', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

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
  test.use({ storageState: { cookies: [], origins: [] } });

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
  test.use({ storageState: { cookies: [], origins: [] } });

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
// Admin pages — authenticated admin user
// ---------------------------------------------------------------------------

test.describe('Admin pages — admin user access', () => {
  test.use({ storageState: path.join(authDir, 'admin.json') });

  const adminPages = [
    { route: '/admin/users', heading: /users/i },
    { route: '/admin/roles', heading: /roles/i },
    { route: '/admin/permissions', heading: /permissions/i },
    { route: '/admin/tenants', heading: /tenants/i },
    { route: '/admin/audit-log', heading: /audit/i },
  ];

  for (const { route, heading } of adminPages) {
    test(`admin user can access ${route}`, async ({ page }) => {
      await page.goto(route);
      // Should stay on the admin page, not redirect to /login.
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')));
      // Page renders its heading — confirms the CASL gate passed.
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// Admin pages — non-admin user (viewer/editor) — CASL gate
// ---------------------------------------------------------------------------

test.describe('Admin pages — non-admin receives 404', () => {
  test.use({ storageState: path.join(authDir, 'viewer.json') });

  test('viewer user cannot access /admin/users (receives 404)', async ({ page }) => {
    await page.goto('/admin/users');
    // The admin layout calls notFound() for non-admin users.
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});

test.describe('Admin pages — editor receives 404', () => {
  test.use({ storageState: path.join(authDir, 'editor.json') });

  test('editor user cannot access /admin/roles (receives 404)', async ({ page }) => {
    await page.goto('/admin/roles');
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Settings pages — authenticated user (any role)
// ---------------------------------------------------------------------------

test.describe('Settings pages — authenticated viewer access', () => {
  test.use({ storageState: path.join(authDir, 'viewer.json') });

  test('authenticated viewer user can access /settings/profile', async ({ page }) => {
    await page.goto('/settings/profile');
    // Should not redirect to /login — settings are accessible to all authenticated users.
    await expect(page).toHaveURL(/\/settings\/profile/);
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
  });
});

test.describe('Settings pages — admin-only gate', () => {
  test.use({ storageState: path.join(authDir, 'viewer.json') });

  test('authenticated viewer user cannot access /settings/organization (redirected to profile)', async ({
    page,
  }) => {
    await page.goto('/settings/organization');
    // /settings/organization redirects non-admin users to /settings/profile.
    await expect(page).toHaveURL(/\/settings\/profile/);
  });
});

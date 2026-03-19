/**
 * E2E tests — Role management page (/admin/roles)
 *
 * Tests cover US-021 acceptance criteria.
 *
 * Tests that require an authenticated session are skipped.
 *
 * Coverage (US-021):
 * - Unauthenticated redirect to /login
 * - Happy path: admin can access /admin/roles
 * - Happy path: 4 system role cards shown
 * - Happy path: system roles have no Edit/Delete menu items
 * - Happy path: + Create role button opens a modal
 * - Edge: creating a role with empty name shows validation error
 * - Permission: viewer/editor cannot access /admin/roles (CASL-gated -> 404)
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

// ---------------------------------------------------------------------------
// Unauthenticated
// ---------------------------------------------------------------------------

test.describe('Role management — unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies to ensure we are not authenticated
    await page.context().clearCookies();
  });

  test('redirects /admin/roles to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin/roles');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirect includes original path as redirect param', async ({ page }) => {
    await page.goto('/admin/roles');
    await page.waitForURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe('/admin/roles');
  });
});

// ---------------------------------------------------------------------------
// Authenticated admin
// ---------------------------------------------------------------------------

test.describe('Role management — admin user', () => {
  test.skip('page is accessible at /admin/roles for admin', async ({ page }) => {
    // Skipped: requires live Keycloak + database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/roles');
    await expect(page).toHaveURL(/\/admin\/roles/);
    await expect(page.getByRole('heading', { name: /roles/i })).toBeVisible();
  });

  test.skip('shows 4 system role cards (Admin, Builder, Editor, Viewer)', async ({ page }) => {
    // Skipped: requires live session + seeded roles.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/roles');
    for (const roleName of ['Admin', 'Builder', 'Editor', 'Viewer']) {
      await expect(page.getByText(roleName)).toBeVisible();
    }
  });

  test.skip('system role cards show "System" badge', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/roles');
    await expect(page.getByText('System').first()).toBeVisible();
  });

  test.skip('overflow menu on system role only shows View users (no Edit/Delete)', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/roles');
    await page.getByRole('button', { name: /open menu|options/i }).first().click();
    await expect(page.getByRole('menuitem', { name: /edit/i })).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: /delete/i })).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: /view users/i })).toBeVisible();
  });

  test.skip('+ Create role button opens a modal', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/roles');
    await page.getByRole('button', { name: /create role/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test.skip('creating a role with an empty name shows a validation error', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/roles');
    await page.getByRole('button', { name: /create role/i }).click();
    await page.getByRole('button', { name: /create|save/i }).click();
    await expect(page.getByText(/name.*required|required/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Non-admin access (CASL gate returns 404)
// ---------------------------------------------------------------------------

test.describe('Role management — non-admin access', () => {
  test.skip('viewer user cannot access /admin/roles — receives 404', async ({ page }) => {
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    await page.goto('/admin/roles');
    await expect(page).toHaveTitle(/404|not found/i);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test.skip('editor user cannot access /admin/roles — receives 404', async ({ page }) => {
    await loginAs(page, TEST_USERS.editor.email, TEST_USERS.editor.password);
    await page.goto('/admin/roles');
    await expect(page).toHaveTitle(/404|not found/i);
  });
});

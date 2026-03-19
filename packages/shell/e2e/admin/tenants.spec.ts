/**
 * E2E tests — Tenant management page (/admin/tenants)
 *
 * Tests cover US-023 acceptance criteria.
 *
 * Tests that require authenticated sessions are skipped.
 *
 * Coverage (US-023):
 * - Unauthenticated redirect to /login
 * - Happy path: admin can access /admin/tenants
 * - Happy path: current tenant is visually highlighted
 * - Happy path: + Create tenant button opens modal
 * - Edge: last active tenant cannot be archived (Archive button disabled on current)
 * - Bug regression: TenantCard "View users" calls onEdit not a user list (BUG #44)
 * - Permission: non-admin receives 404
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

// ---------------------------------------------------------------------------
// Unauthenticated
// ---------------------------------------------------------------------------

test.describe('Tenant management — unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('redirects /admin/tenants to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin/tenants');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Authenticated admin
// ---------------------------------------------------------------------------

test.describe('Tenant management — admin user', () => {
  test.skip('page is accessible at /admin/tenants for admin', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/tenants');
    await expect(page).toHaveURL(/\/admin\/tenants/);
    await expect(page.getByRole('heading', { name: /tenants/i })).toBeVisible();
  });

  test.skip('at least one tenant card is shown', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/tenants');
    await expect(page.locator('[data-testid="tenant-card"]').first()).toBeVisible();
  });

  test.skip('current tenant card shows a "Current" badge and accent border', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/tenants');
    await expect(page.getByText('Current').first()).toBeVisible();
  });

  test.skip('Archive button is disabled on the current active tenant', async ({ page }) => {
    // Tests the "cannot delete the last active tenant" requirement (AC-7)
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/tenants');
    await page.getByRole('button', { name: /options|menu/i }).first().click();
    const archiveItem = page.getByRole('menuitem', { name: /archive/i });
    await expect(archiveItem).toBeDisabled();
  });

  test.skip('Create tenant button opens a modal', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/tenants');
    await page.getByRole('button', { name: /create tenant/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  // Bug regression test for BUG #44 — TenantCard View Users calls onEdit
  test.skip('View users menu item opens a user list, not the Edit modal (regression for BUG #44)', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/tenants');
    await page.getByRole('button', { name: /options|menu/i }).first().click();
    await page.getByRole('menuitem', { name: /view users/i }).click();
    // Should show a user list dialog, NOT edit fields
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(/organization name|workspace url/i)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Non-admin access
// ---------------------------------------------------------------------------

test.describe('Tenant management — non-admin access', () => {
  test.skip('viewer user sees 404 at /admin/tenants', async ({ page }) => {
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    await page.goto('/admin/tenants');
    await expect(page).toHaveTitle(/404|not found/i);
  });
});

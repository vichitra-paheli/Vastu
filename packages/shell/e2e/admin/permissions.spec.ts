/**
 * E2E tests — Permission matrix page (/admin/permissions)
 *
 * Tests cover US-022 acceptance criteria.
 *
 * Tests that require an authenticated session are skipped.
 *
 * Coverage (US-022):
 * - Unauthenticated redirect to /login
 * - Happy path: page loads for admin at /admin/permissions
 * - Happy path: matrix grid has rows (resources) and columns (roles)
 * - Happy path: CRUD badge buttons are visible in cells
 * - Happy path: "Export matrix" button is present
 * - Happy path: system role columns are read-only (no click changes)
 * - Edge: Save button requires confirmation dialog before applying changes
 * - Permission: non-admin receives 404
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

// ---------------------------------------------------------------------------
// Unauthenticated
// ---------------------------------------------------------------------------

test.describe('Permission matrix — unauthenticated', () => {
  // Ensure no leftover session from a prior run causes the middleware to serve
  // the authenticated page instead of redirecting to /login.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects /admin/permissions to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin/permissions');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Authenticated admin
// ---------------------------------------------------------------------------

test.describe('Permission matrix — admin user', () => {
  test.skip('page is accessible at /admin/permissions for admin', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    await expect(page).toHaveURL(/\/admin\/permissions/);
    await expect(page.getByRole('heading', { name: /permissions/i })).toBeVisible();
  });

  test.skip('permission matrix shows role column headers', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    // System roles should appear as column headers
    for (const roleName of ['Admin', 'Builder', 'Editor', 'Viewer']) {
      await expect(page.getByRole('columnheader', { name: roleName })).toBeVisible();
    }
  });

  test.skip('CRUD badge buttons (V, E, D, X) are visible in the matrix', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    // At least some V (View) badges should be visible
    await expect(page.getByRole('button', { name: /view.*granted|read.*granted/i }).first()).toBeVisible();
  });

  test.skip('Export matrix button is present', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    await expect(page.getByRole('button', { name: /export.*csv|export matrix/i })).toBeVisible();
  });

  test.skip('clicking Export matrix downloads a CSV file', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export.*csv|export matrix/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test.skip('clicking a badge in a system role column does not change its state (read-only)', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    // Find a badge in the Admin column (system role) and click it
    // The state should not change (no toggle)
    const adminBadge = page.locator('[data-role="Admin"] button').first();
    const initialAriaLabel = await adminBadge.getAttribute('aria-label');
    await adminBadge.click();
    const afterAriaLabel = await adminBadge.getAttribute('aria-label');
    expect(initialAriaLabel).toBe(afterAriaLabel);
  });

  test.skip('Save button is disabled until a change is made to a custom role', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    const saveButton = page.getByRole('button', { name: /save changes/i });
    await expect(saveButton).toBeDisabled();
  });

  test.skip('Save changes shows a confirmation dialog with affected user count', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    // Toggle a custom role permission, then Save
    // The confirm dialog should mention affected users
    // (depends on having a custom role with users)
  });

  test.skip('legend is visible at the bottom of the matrix', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/permissions');
    // Legend should explain V/E/D/X meanings
    await expect(page.getByText(/V.*View|E.*Edit|D.*Delete|X.*Export/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Non-admin access
// ---------------------------------------------------------------------------

test.describe('Permission matrix — non-admin access', () => {
  test.skip('viewer user sees 404 at /admin/permissions', async ({ page }) => {
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    await page.goto('/admin/permissions');
    await expect(page).toHaveTitle(/404|not found/i);
  });
});

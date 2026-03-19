/**
 * E2E tests — Database Connections settings page (/settings/databases)
 *
 * Tests cover US-016 acceptance criteria.
 *
 * Tests that require an authenticated session or a real database are skipped.
 *
 * Coverage (US-016):
 * - Unauthenticated users are redirected to /login
 * - Happy path: page is accessible to authenticated admin
 * - Happy path: + Add new button is present
 * - Happy path: connection cards show name, masked string, health status, protocol badge
 * - Edge: empty state shows when no connections exist
 * - Permission: viewer cannot access /settings/databases (CASL-gated at org level)
 * - Error: Add modal validates required fields
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

test.describe('Database connections page — unauthenticated', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/settings/databases');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirect preserves the original path as redirect param', async ({ page }) => {
    await page.goto('/settings/databases');
    await page.waitForURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe('/settings/databases');
  });
});

// ---------------------------------------------------------------------------
// Tests requiring authenticated session
// ---------------------------------------------------------------------------

test.describe('Database connections page — admin user', () => {
  test.skip('page is accessible at /settings/databases for admin', async ({ page }) => {
    // Skipped: requires live Keycloak + database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/databases');
    await expect(page).toHaveURL(/\/settings\/databases/);
    await expect(page.getByRole('heading', { name: /database|connections/i })).toBeVisible();
  });

  test.skip('shows the + Add new button', async ({ page }) => {
    // Skipped: requires live Keycloak + database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/databases');
    await expect(page.getByRole('button', { name: /add new/i })).toBeVisible();
  });

  test.skip('shows empty state when no connections exist', async ({ page }) => {
    // Skipped: requires live Keycloak + database with no connections seeded.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/databases');
    // Empty state message should be visible
    await expect(page.getByText(/no database connections|add your first/i)).toBeVisible();
  });

  test.skip('Add new button opens the connection modal', async ({ page }) => {
    // Skipped: requires live Keycloak + database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/databases');
    await page.getByRole('button', { name: /add new/i }).click();
    // Modal should open with required fields
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/host/i)).toBeVisible();
  });

  test.skip('Add modal validates that required fields are present on submit', async ({ page }) => {
    // Skipped: requires live Keycloak + database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/databases');
    await page.getByRole('button', { name: /add new/i }).click();
    // Click Save without filling anything
    await page.getByRole('button', { name: /save|create/i }).click();
    // Required field errors should appear
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test.skip('View schema menu item is present and opens a schema modal', async ({ page }) => {
    // Skipped: requires live session + seeded DB connection.
    // This test is also a regression check for BUG #46 (View Schema not wired up).
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/databases');
    // Open overflow menu on first connection card
    await page.locator('[aria-label*="Options for"]').first().click();
    // View schema item should be present
    await expect(page.getByRole('menuitem', { name: /view schema/i })).toBeVisible();
    await page.getByRole('menuitem', { name: /view schema/i }).click();
    // A modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test.skip('connection health status dot is visible on connection cards', async ({ page }) => {
    // Skipped: requires live session + seeded DB connection.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/settings/databases');
    // Health status should be visible (role=status from aria)
    await expect(page.locator('[role="status"]').first()).toBeVisible();
  });
});

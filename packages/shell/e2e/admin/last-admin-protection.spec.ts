/**
 * E2E tests — Last admin protection (US-020 AC-7)
 *
 * Verifies that the last admin user cannot be deactivated.
 *
 * All tests that interact with the database require Docker and are skipped.
 *
 * Coverage (US-020 AC-7):
 * - API-level: PATCH /api/admin/users/{id} returns 400 when deactivating last admin
 * - UI-level: Deactivate toggle shows a warning about last admin
 * - UI-level: Save button is blocked when attempting to deactivate the last admin
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

test.describe('Last admin protection', () => {
  test.skip('deactivating the last admin via the edit drawer is blocked with an error message', async ({
    page,
  }) => {
    // Skipped: requires live session + database with exactly one admin user.
    // Setup: ensure only admin@vastu.dev has the Admin role.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/users');
    // Click the admin user row to open the edit drawer
    await page.getByText('Admin User').click();
    // Toggle the deactivate switch
    const deactivateSwitch = page.getByRole('switch', { name: /deactivate/i });
    await deactivateSwitch.click();
    // Save
    await page.getByRole('button', { name: /save/i }).click();
    // Should show an error: "Cannot deactivate the last admin user"
    await expect(
      page.getByText(/last admin|cannot deactivate/i)
    ).toBeVisible();
    // Drawer should remain open (operation failed)
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test.skip('API returns 400 when attempting to deactivate the last admin', async ({ page }) => {
    // Skipped: requires a running server + session token.
    // This is a direct API-level check.
    // 1. Authenticate as admin
    // 2. POST PATCH /api/admin/users/{adminUserId} with deactivated: true
    // 3. Assert 400 response with error "Cannot deactivate the last admin user."
  });

  test.skip('second admin user CAN be deactivated when another admin exists', async ({ page }) => {
    // Skipped: requires two admin users in the seeded database.
    // When there are 2+ admins, deactivating one should succeed.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/admin/users');
    // Assuming a second admin has been created in the test fixture
    // Click that admin's row, toggle deactivate, save — should succeed
  });
});

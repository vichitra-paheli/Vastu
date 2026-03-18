/**
 * E2E tests — User invite flow (/admin/users)
 *
 * ALL tests in this file are skipped because they require:
 * 1. An authenticated admin session (Keycloak + next-auth)
 * 2. A running Postgres database (to persist invited users)
 * 3. Docker services running via `docker compose up -d`
 *
 * To run these tests locally:
 *   1. Start Docker services: `docker compose up -d`
 *   2. Run migrations and seed: `pnpm prisma:migrate && pnpm prisma:seed`
 *   3. Start the dev server: `pnpm dev`
 *   4. Remove the `test.skip` calls and run: `pnpm test:e2e`
 *
 * Coverage (US-020):
 * - AC-1:  Page is accessible at /admin/users for admin role
 * - AC-2:  Search and filter controls are present
 * - AC-3:  User table renders with avatar, name, email, role badge, status dot
 * - AC-4:  "+ Invite user" button opens invite modal
 * - AC-4:  Modal validates email format
 * - AC-4:  Modal accepts comma-separated emails
 * - AC-4:  Modal has role selector and optional message field
 * - AC-5:  Clicking a row opens the edit drawer
 * - AC-6:  Invited user appears in the list with "Pending" status
 * - AC-7:  Non-admin users cannot access /admin/users (CASL-gated)
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const SELECTORS = {
  // User table
  inviteButton: 'button:has-text("Invite user")',
  searchInput: 'input[placeholder*="Search"]',
  roleFilter: '[data-testid="role-filter"]',
  statusFilter: '[data-testid="status-filter"]',
  userTable: 'table',
  userRow: 'tbody tr',

  // Invite modal
  inviteModal: '[role="dialog"]:has-text("Invite")',
  emailInput: '[data-testid="invite-email-input"]',
  roleSelectorInModal: '[data-testid="invite-role-select"]',
  messageTextarea: '[data-testid="invite-message"]',
  sendInviteButton: 'button:has-text("Send invite")',
  cancelButton: 'button:has-text("Cancel")',
  emailErrorText: 'text=Enter a valid email address',
  emailRequiredText: 'text=Email is required',

  // Edit drawer
  editDrawer: '[data-testid="edit-user-drawer"]',

  // Status badges
  pendingBadge: 'text=Pending',
} as const;

// ---------------------------------------------------------------------------
// Tests — all skipped (require authenticated session + Docker)
// ---------------------------------------------------------------------------

test.describe('User management — /admin/users', () => {
  // -------------------------------------------------------------------------
  // Page access
  // -------------------------------------------------------------------------

  test.skip('admin can navigate to /admin/users', async ({ page }) => {
    // Skipped: requires Keycloak + Postgres running via `docker compose up -d`.
    // When services are available, authenticate as admin and assert the page
    // loads correctly.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page).toHaveTitle(/Users.*Vastu/i);
  });

  test.skip('non-admin viewer is redirected away from /admin/users', async ({ page }) => {
    // Skipped: requires Keycloak + Postgres running via `docker compose up -d`.
    // A viewer-role user attempting to access an admin-only page should be
    // redirected (to /workspace or /403 depending on middleware config).
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password, '/workspace');
    await page.goto('/admin/users');
    // Should NOT land on the users page — either redirected or shown an error.
    await expect(page).not.toHaveURL(/\/admin\/users/);
  });

  // -------------------------------------------------------------------------
  // Page content
  // -------------------------------------------------------------------------

  test.skip('renders the search input and filter controls', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await expect(page.locator(SELECTORS.searchInput)).toBeVisible();
    await expect(page.locator(SELECTORS.roleFilter)).toBeVisible();
    await expect(page.locator(SELECTORS.statusFilter)).toBeVisible();
  });

  test.skip('renders the user table with seeded users', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // Seed data creates 3 users: admin, editor, viewer.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    const rows = page.locator(SELECTORS.userRow);
    await expect(rows).toHaveCount(3);

    // First row should show the admin user details.
    const firstRow = rows.first();
    await expect(firstRow.getByText(TEST_USERS.admin.name)).toBeVisible();
    await expect(firstRow.getByText(TEST_USERS.admin.email)).toBeVisible();
    await expect(firstRow.getByText('Admin')).toBeVisible();
  });

  test.skip('renders the "+ Invite user" button', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await expect(page.locator(SELECTORS.inviteButton)).toBeVisible();
    await expect(page.locator(SELECTORS.inviteButton)).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Invite modal — opening and closing
  // -------------------------------------------------------------------------

  test.skip('opens the invite modal when "+ Invite user" is clicked', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await page.locator(SELECTORS.inviteButton).click();

    const modal = page.locator(SELECTORS.inviteModal);
    await expect(modal).toBeVisible();
    await expect(page.locator(SELECTORS.emailInput)).toBeVisible();
    await expect(page.locator(SELECTORS.roleSelectorInModal)).toBeVisible();
    await expect(page.locator(SELECTORS.messageTextarea)).toBeVisible();
    await expect(page.locator(SELECTORS.sendInviteButton)).toBeVisible();
  });

  test.skip('closes the invite modal when "Cancel" is clicked', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await page.locator(SELECTORS.inviteButton).click();
    await expect(page.locator(SELECTORS.inviteModal)).toBeVisible();

    await page.locator(SELECTORS.cancelButton).click();
    await expect(page.locator(SELECTORS.inviteModal)).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Invite modal — validation
  // -------------------------------------------------------------------------

  test.skip('shows a validation error when submitting an empty email', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await page.locator(SELECTORS.inviteButton).click();
    await page.locator(SELECTORS.sendInviteButton).click();

    await expect(page.locator(SELECTORS.emailRequiredText)).toBeVisible();
  });

  test.skip('shows a validation error for an invalid email format', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await page.locator(SELECTORS.inviteButton).click();
    await page.locator(SELECTORS.emailInput).fill('not-an-email');
    await page.keyboard.press('Tab');

    await expect(page.locator(SELECTORS.emailErrorText)).toBeVisible();
  });

  test.skip('accepts a single valid email address', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await page.locator(SELECTORS.inviteButton).click();
    await page.locator(SELECTORS.emailInput).fill('newuser@example.com');
    await page.keyboard.press('Tab');

    // No validation error should appear for a valid single email.
    await expect(page.locator(SELECTORS.emailErrorText)).not.toBeVisible();
  });

  test.skip('accepts comma-separated email addresses', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    // US-020 AC-4 specifies that the email field supports multiple
    // comma-separated addresses for bulk invites.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await page.locator(SELECTORS.inviteButton).click();
    await page.locator(SELECTORS.emailInput).fill('one@example.com, two@example.com');
    await page.keyboard.press('Tab');

    await expect(page.locator(SELECTORS.emailErrorText)).not.toBeVisible();
  });

  test.skip('rejects mixed valid/invalid comma-separated emails', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    // If any address in a comma-separated list is invalid, validation should fail.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    await page.locator(SELECTORS.inviteButton).click();
    await page.locator(SELECTORS.emailInput).fill('valid@example.com, not-an-email');
    await page.keyboard.press('Tab');

    await expect(page.locator(SELECTORS.emailErrorText)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Invite flow — end to end
  // -------------------------------------------------------------------------

  test.skip('creates an invited user and shows them with Pending status', async ({ page }) => {
    // Skipped: requires authenticated admin session + Postgres + Keycloak email delivery.
    // When all services are available:
    // 1. Open the invite modal
    // 2. Enter a unique email address
    // 3. Select a role (e.g., "Editor")
    // 4. Submit
    // 5. Assert that the new user appears in the table with "Pending" status
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    const newEmail = `invite-test-${Date.now()}@example.com`;
    await page.locator(SELECTORS.inviteButton).click();
    await page.locator(SELECTORS.emailInput).fill(newEmail);

    // Select the Editor role from the role dropdown.
    await page.locator(SELECTORS.roleSelectorInModal).click();
    await page.getByRole('option', { name: 'Editor' }).click();

    await page.locator(SELECTORS.sendInviteButton).click();

    // Modal should close after successful invite.
    await expect(page.locator(SELECTORS.inviteModal)).not.toBeVisible();

    // The invited user should appear in the table with Pending status.
    await expect(page.getByText(newEmail)).toBeVisible();
    await expect(page.locator(SELECTORS.pendingBadge).first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Edit drawer
  // -------------------------------------------------------------------------

  test.skip('opens the edit drawer when clicking a user row', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/users');
    await page.goto('/admin/users');

    // Click the first row (admin user in seed data).
    await page.locator(SELECTORS.userRow).first().click();

    const drawer = page.locator(SELECTORS.editDrawer);
    await expect(drawer).toBeVisible();

    // Edit drawer should show the user's name and role controls.
    await expect(drawer.getByText(TEST_USERS.admin.name)).toBeVisible();
  });
});

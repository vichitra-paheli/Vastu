/**
 * E2E tests — API key generation and management (/settings/api-keys)
 *
 * ALL tests in this file are skipped because they require:
 * 1. An authenticated admin session (Keycloak + next-auth)
 * 2. A running Postgres database (to persist API key records)
 * 3. Docker services running via `docker compose up -d`
 *
 * To run these tests locally:
 *   1. Start Docker services: `docker compose up -d`
 *   2. Run migrations and seed: `pnpm prisma:migrate && pnpm prisma:seed`
 *   3. Start the dev server: `pnpm dev`
 *   4. Remove the `test.skip` calls and run: `pnpm test:e2e`
 *
 * Coverage (US-017):
 * - AC-1:  Page is accessible at /settings/api-keys for admin role
 * - AC-2:  Table renders with name, masked key, scope badge, last used, overflow menu
 * - AC-3:  "+ Generate" button opens the generate-key modal
 * - AC-3:  Modal has name input, scope selector, description field
 * - AC-4:  After generation the key is displayed once in a copyable field
 * - AC-4:  "This key won't be shown again" warning is visible after generation
 * - AC-5:  Overflow menu has "Copy key ID" and "Revoke" options
 * - AC-5:  Revoking a key shows a confirmation dialog
 * - AC-5:  Confirmed revocation removes the key from the table
 * - AC-6:  Raw key is not shown in subsequent page loads (only masked suffix)
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const SELECTORS = {
  // API keys table
  generateButton: 'button:has-text("Generate")',
  keyTable: 'table',
  keyRow: 'tbody tr',
  maskedKey: '[data-testid="masked-key"]',
  scopeBadge: '[data-testid="scope-badge"]',
  lastUsedCell: '[data-testid="last-used"]',
  overflowMenuButton: 'button[aria-label="Key options"]',

  // Overflow menu items
  copyKeyIdOption: 'text=Copy key ID',
  revokeOption: 'text=Revoke',

  // Generate modal
  generateModal: '[role="dialog"]:has-text("Generate")',
  keyNameInput: '[data-testid="key-name-input"]',
  scopeSelector: '[data-testid="scope-select"]',
  descriptionInput: '[data-testid="key-description-input"]',
  generateSubmitButton: '[data-testid="generate-modal-submit"]',
  cancelButton: 'button:has-text("Cancel")',
  nameRequiredText: 'text=Name is required',

  // Post-generation key display
  keyDisplayModal: '[data-testid="key-display-modal"]',
  generatedKeyField: '[data-testid="generated-key-value"]',
  copyKeyButton: '[data-testid="copy-key-button"]',
  keyWarnText: "text=This key won't be shown again",
  doneButton: 'button:has-text("Done")',

  // Revoke confirmation dialog
  revokeDialog: '[role="dialog"]:has-text("Revoke")',
  confirmRevokeButton: 'button:has-text("Revoke key")',
  cancelRevokeButton: 'button:has-text("Cancel")',
} as const;

// ---------------------------------------------------------------------------
// Tests — all skipped (require authenticated session + Docker)
// ---------------------------------------------------------------------------

test.describe('API keys — /settings/api-keys', () => {
  // -------------------------------------------------------------------------
  // Page access
  // -------------------------------------------------------------------------

  test.skip('admin can navigate to /settings/api-keys', async ({ page }) => {
    // Skipped: requires Keycloak + Postgres running via `docker compose up -d`.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');
    await expect(page).toHaveURL(/\/settings\/api-keys/);
    await expect(page).toHaveTitle(/API Keys.*Vastu/i);
  });

  // -------------------------------------------------------------------------
  // Page content — seeded API keys
  // -------------------------------------------------------------------------

  test.skip('renders the API keys table with seeded keys', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // Seed data creates 2 API keys. The table should show masked values
    // (e.g. "sk_live_...4f2a") and scope badges (Full / Read only).
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    const rows = page.locator(SELECTORS.keyRow);
    await expect(rows).toHaveCount(2);

    // Each row should display a masked key, not the raw secret.
    const firstMasked = rows.first().locator(SELECTORS.maskedKey);
    await expect(firstMasked).toBeVisible();
    await expect(firstMasked).toContainText('sk_live_...');
  });

  test.skip('renders a scope badge for each key row', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    const badge = page.locator(SELECTORS.scopeBadge).first();
    await expect(badge).toBeVisible();
    // Scope badge should be either "Full" or "Read only".
    await expect(badge).toHaveText(/Full|Read only/i);
  });

  test.skip('renders the "+ Generate" button', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await expect(page.locator(SELECTORS.generateButton)).toBeVisible();
    await expect(page.locator(SELECTORS.generateButton)).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Generate modal — opening and structure
  // -------------------------------------------------------------------------

  test.skip('opens the generate-key modal when "+ Generate" is clicked', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.generateButton).click();

    const modal = page.locator(SELECTORS.generateModal);
    await expect(modal).toBeVisible();
    await expect(page.locator(SELECTORS.keyNameInput)).toBeVisible();
    await expect(page.locator(SELECTORS.scopeSelector)).toBeVisible();
    await expect(page.locator(SELECTORS.descriptionInput)).toBeVisible();
    await expect(page.locator(SELECTORS.generateSubmitButton)).toBeVisible();
  });

  test.skip('closes the generate modal when "Cancel" is clicked', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.generateButton).click();
    await expect(page.locator(SELECTORS.generateModal)).toBeVisible();

    await page.locator(SELECTORS.cancelButton).click();
    await expect(page.locator(SELECTORS.generateModal)).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Generate modal — validation
  // -------------------------------------------------------------------------

  test.skip('shows a validation error when submitting without a key name', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.generateButton).click();
    await page.locator(SELECTORS.generateSubmitButton).click();

    await expect(page.locator(SELECTORS.nameRequiredText)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Key generation — post-generation display
  // -------------------------------------------------------------------------

  test.skip('displays the generated key once after creation', async ({ page }) => {
    // Skipped: requires authenticated admin session + Postgres.
    // US-017 AC-4: the raw key must be displayed exactly once after generation.
    // After dismissing this modal, subsequent page loads must only show the
    // masked suffix — the raw key is never stored and cannot be retrieved.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.generateButton).click();
    await page.locator(SELECTORS.keyNameInput).fill('My Integration Key');
    await page.locator(SELECTORS.generateSubmitButton).click();

    // A modal (or inline section) shows the raw key value.
    const keyDisplay = page.locator(SELECTORS.keyDisplayModal);
    await expect(keyDisplay).toBeVisible();

    // The key field should contain the full raw key (starts with "sk_live_").
    const keyValue = page.locator(SELECTORS.generatedKeyField);
    await expect(keyValue).toBeVisible();
    await expect(keyValue).toContainText('sk_live_');

    // A copy button should be adjacent to the key.
    await expect(page.locator(SELECTORS.copyKeyButton)).toBeVisible();
  });

  test.skip('shows the "This key won\'t be shown again" warning after generation', async ({
    page,
  }) => {
    // Skipped: requires authenticated admin session + Postgres.
    // US-017 AC-4: the warning text must be visible alongside the key display.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.generateButton).click();
    await page.locator(SELECTORS.keyNameInput).fill('Warning Test Key');
    await page.locator(SELECTORS.generateSubmitButton).click();

    await expect(page.locator(SELECTORS.keyWarnText)).toBeVisible();
  });

  test.skip('shows only the masked key after dismissing the generation modal', async ({ page }) => {
    // Skipped: requires authenticated admin session + Postgres.
    // After clicking "Done", the modal closes. The table must then show only
    // the masked suffix of the key — confirming the raw value is gone.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.generateButton).click();
    await page.locator(SELECTORS.keyNameInput).fill('Dismissed Key');
    await page.locator(SELECTORS.generateSubmitButton).click();

    await page.locator(SELECTORS.doneButton).click();
    await expect(page.locator(SELECTORS.keyDisplayModal)).not.toBeVisible();

    // The table row for the new key should show only the masked form.
    const newRow = page.locator(SELECTORS.keyRow).filter({ hasText: 'Dismissed Key' });
    await expect(newRow).toBeVisible();
    const masked = newRow.locator(SELECTORS.maskedKey);
    await expect(masked).toContainText('sk_live_...');
    // The full raw key must NOT be visible anywhere on the page.
    const fullKey = page.locator('[data-testid="generated-key-value"]');
    await expect(fullKey).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Overflow menu — copy and revoke
  // -------------------------------------------------------------------------

  test.skip('overflow menu has "Copy key ID" and "Revoke" options', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.overflowMenuButton).first().click();

    await expect(page.locator(SELECTORS.copyKeyIdOption)).toBeVisible();
    await expect(page.locator(SELECTORS.revokeOption)).toBeVisible();
  });

  test.skip('opens a confirmation dialog when "Revoke" is selected', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // US-017 AC-5: revocation must go through a confirmation dialog (destructive action).
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    await page.locator(SELECTORS.overflowMenuButton).first().click();
    await page.locator(SELECTORS.revokeOption).click();

    const dialog = page.locator(SELECTORS.revokeDialog);
    await expect(dialog).toBeVisible();
    await expect(page.locator(SELECTORS.confirmRevokeButton)).toBeVisible();
    await expect(page.locator(SELECTORS.cancelRevokeButton)).toBeVisible();
  });

  test.skip('cancelling the revoke dialog leaves the key in the table', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    const initialRowCount = await page.locator(SELECTORS.keyRow).count();

    await page.locator(SELECTORS.overflowMenuButton).first().click();
    await page.locator(SELECTORS.revokeOption).click();
    await page.locator(SELECTORS.cancelRevokeButton).click();

    // Dialog closes and row count is unchanged.
    await expect(page.locator(SELECTORS.revokeDialog)).not.toBeVisible();
    await expect(page.locator(SELECTORS.keyRow)).toHaveCount(initialRowCount);
  });

  test.skip('confirming revoke removes the key row from the table', async ({ page }) => {
    // Skipped: requires authenticated admin session + Postgres.
    // After confirming revocation, the key row should be removed from the table
    // and a success toast should be displayed.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/settings/api-keys');

    const initialRowCount = await page.locator(SELECTORS.keyRow).count();

    await page.locator(SELECTORS.overflowMenuButton).first().click();
    await page.locator(SELECTORS.revokeOption).click();
    await page.locator(SELECTORS.confirmRevokeButton).click();

    // One fewer key row after revocation.
    await expect(page.locator(SELECTORS.keyRow)).toHaveCount(initialRowCount - 1);
  });
});

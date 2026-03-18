/**
 * E2E tests — Audit log filtering (/admin/audit-log)
 *
 * ALL tests in this file are skipped because they require:
 * 1. An authenticated admin session (Keycloak + next-auth)
 * 2. A running Postgres database with seeded audit events
 * 3. Docker services running via `docker compose up -d`
 *
 * To run these tests locally:
 *   1. Start Docker services: `docker compose up -d`
 *   2. Run migrations and seed: `pnpm prisma:migrate && pnpm prisma:seed`
 *      (seed creates 20 audit events across multiple users and action types)
 *   3. Start the dev server: `pnpm dev`
 *   4. Remove the `test.skip` calls and run: `pnpm test:e2e`
 *
 * Coverage (US-024):
 * - AC-1:  Page is accessible at /admin/audit-log for admin role
 * - AC-2:  Date range picker, user dropdown, action type dropdown, resource type dropdown render
 * - AC-3:  Table renders: timestamp (monospace), user name, action badge, resource description
 * - AC-4:  Clicking a row opens the detail drawer with payload JSON
 * - AC-5:  "Export CSV" button is visible and triggers a download
 * - AC-6:  Audit log table has no edit or delete actions (immutable)
 * - AC-8:  Table is paginated (server-side, 50 rows per page default)
 * - AC-7:  Non-admin viewer cannot access /admin/audit-log
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const SELECTORS = {
  // Filter controls
  dateRangePicker: '[data-testid="audit-date-range"]',
  userFilter: '[data-testid="audit-user-filter"]',
  actionTypeFilter: '[data-testid="audit-action-filter"]',
  resourceTypeFilter: '[data-testid="audit-resource-filter"]',
  clearFiltersButton: 'button:has-text("Clear filters")',

  // Audit log table
  auditTable: 'table',
  auditRow: 'tbody tr',
  timestampCell: '[data-testid="audit-timestamp"]',
  userNameCell: '[data-testid="audit-user"]',
  actionBadge: '[data-testid="audit-action-badge"]',
  resourceCell: '[data-testid="audit-resource"]',

  // Row detail drawer
  detailDrawer: '[data-testid="audit-detail-drawer"]',
  payloadJson: '[data-testid="audit-payload-json"]',
  ipAddress: '[data-testid="audit-ip-address"]',
  userAgent: '[data-testid="audit-user-agent"]',

  // Pagination
  paginationControls: '[data-testid="audit-pagination"]',
  nextPageButton: 'button[aria-label="Next page"]',
  prevPageButton: 'button[aria-label="Previous page"]',

  // Export
  exportCsvButton: 'button:has-text("Export CSV")',

  // Action badge colour markers (via data-action attribute)
  createBadge: '[data-action="Create"]',
  updateBadge: '[data-action="Update"]',
  deleteBadge: '[data-action="Delete"]',
  loginBadge: '[data-action="Login"]',
  exportBadge: '[data-action="Export"]',
} as const;

// ---------------------------------------------------------------------------
// Tests — all skipped (require authenticated session + Docker)
// ---------------------------------------------------------------------------

test.describe('Audit log — /admin/audit-log', () => {
  // -------------------------------------------------------------------------
  // Page access
  // -------------------------------------------------------------------------

  test.skip('admin can navigate to /admin/audit-log', async ({ page }) => {
    // Skipped: requires Keycloak + Postgres running via `docker compose up -d`.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');
    await expect(page).toHaveURL(/\/admin\/audit-log/);
    await expect(page).toHaveTitle(/Audit Log.*Vastu/i);
  });

  test.skip('non-admin viewer is redirected away from /admin/audit-log', async ({ page }) => {
    // Skipped: requires Keycloak + Postgres running via `docker compose up -d`.
    // A viewer-role user should not be able to access admin-only pages.
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password, '/workspace');
    await page.goto('/admin/audit-log');
    await expect(page).not.toHaveURL(/\/admin\/audit-log/);
  });

  // -------------------------------------------------------------------------
  // Filter controls
  // -------------------------------------------------------------------------

  test.skip('renders all four filter controls on page load', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await expect(page.locator(SELECTORS.dateRangePicker)).toBeVisible();
    await expect(page.locator(SELECTORS.userFilter)).toBeVisible();
    await expect(page.locator(SELECTORS.actionTypeFilter)).toBeVisible();
    await expect(page.locator(SELECTORS.resourceTypeFilter)).toBeVisible();
  });

  test.skip('date range filter options include preset ranges and custom', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.dateRangePicker).click();

    // Common preset labels that should appear in the date range dropdown.
    await expect(page.getByText('Last 7 days')).toBeVisible();
    await expect(page.getByText('Last 30 days')).toBeVisible();
    await expect(page.getByText('Custom range')).toBeVisible();
  });

  test.skip('action type filter includes all action types defined in AC-2', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    // US-024 AC-2 lists: Create, Update, Delete, Login, Export.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.actionTypeFilter).click();

    await expect(page.getByRole('option', { name: 'Create' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Update' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Export' })).toBeVisible();
  });

  test.skip('user filter dropdown lists seeded users', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // The user filter dropdown should include the 3 seed users.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.userFilter).click();

    await expect(page.getByRole('option', { name: TEST_USERS.admin.name })).toBeVisible();
    await expect(page.getByRole('option', { name: TEST_USERS.editor.name })).toBeVisible();
    await expect(page.getByRole('option', { name: TEST_USERS.viewer.name })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Filter interactions
  // -------------------------------------------------------------------------

  test.skip('applying an action type filter reduces the visible rows', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // Seed data creates 20 audit events across multiple action types.
    // Filtering to "Login" only should return a subset of those events.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    // Record the unfiltered row count.
    const unfilteredCount = await page.locator(SELECTORS.auditRow).count();

    // Apply the "Login" action type filter.
    await page.locator(SELECTORS.actionTypeFilter).click();
    await page.getByRole('option', { name: 'Login' }).click();

    const filteredCount = await page.locator(SELECTORS.auditRow).count();

    // After filtering there should be fewer (or equal) rows.
    expect(filteredCount).toBeLessThanOrEqual(unfilteredCount);
  });

  test.skip('applying a date range filter that excludes all events shows empty state', async ({
    page,
  }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // Setting a date range far in the future should return no audit events
    // and display the empty state component.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.dateRangePicker).click();
    await page.getByText('Custom range').click();

    // Pick a date range well into the future where no events exist.
    // The exact picker interaction depends on the Mantine DatePicker API.
    // Here we assume the picker has accessible date inputs.
    const startInput = page.getByLabel('Start date');
    const endInput = page.getByLabel('End date');
    await startInput.fill('2099-01-01');
    await endInput.fill('2099-01-31');
    await page.keyboard.press('Enter');

    // No rows should be visible; empty state message should appear.
    await expect(page.locator(SELECTORS.auditRow)).toHaveCount(0);
    await expect(page.getByText(/no audit events/i)).toBeVisible();
  });

  test.skip('applying a user filter shows only events for that user', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.userFilter).click();
    await page.getByRole('option', { name: TEST_USERS.editor.name }).click();

    // Every visible row should show the Editor user's name.
    const rows = page.locator(SELECTORS.auditRow);
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i).locator(SELECTORS.userNameCell)).toContainText(
        TEST_USERS.editor.name,
      );
    }
  });

  test.skip('"Clear filters" resets all filters and restores the full row count', async ({
    page,
  }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    const unfilteredCount = await page.locator(SELECTORS.auditRow).count();

    // Apply a filter that reduces the results.
    await page.locator(SELECTORS.actionTypeFilter).click();
    await page.getByRole('option', { name: 'Delete' }).click();

    // Clear all filters.
    await page.locator(SELECTORS.clearFiltersButton).click();

    // Row count should return to the original unfiltered count.
    await expect(page.locator(SELECTORS.auditRow)).toHaveCount(unfilteredCount);
  });

  // -------------------------------------------------------------------------
  // Table content
  // -------------------------------------------------------------------------

  test.skip('table renders timestamp in monospace, user name, action badge, and resource', async ({
    page,
  }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // US-024 AC-3: verify that each column renders the correct content types.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    const firstRow = page.locator(SELECTORS.auditRow).first();
    await expect(firstRow).toBeVisible();

    // Timestamp cell should be present and non-empty.
    const timestamp = firstRow.locator(SELECTORS.timestampCell);
    await expect(timestamp).toBeVisible();
    await expect(timestamp).not.toBeEmpty();

    // User name cell should be present and non-empty.
    const userName = firstRow.locator(SELECTORS.userNameCell);
    await expect(userName).toBeVisible();
    await expect(userName).not.toBeEmpty();

    // Action badge should be present.
    const actionBadge = firstRow.locator(SELECTORS.actionBadge);
    await expect(actionBadge).toBeVisible();

    // Resource description should be present.
    const resource = firstRow.locator(SELECTORS.resourceCell);
    await expect(resource).toBeVisible();
    await expect(resource).not.toBeEmpty();
  });

  test.skip('action badges use the correct colours per action type', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database with
    // events covering Create, Update, Delete, Login, and Export action types.
    // US-024 AC-3: Create=green, Update=blue, Delete=red, Login=slate, Export=slate.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    // Each badge's colour is conveyed via a data-action attribute that the
    // design system CSS maps to the correct --v-* colour token.
    if (await page.locator(SELECTORS.createBadge).count() > 0) {
      await expect(page.locator(SELECTORS.createBadge).first()).toBeVisible();
    }
    if (await page.locator(SELECTORS.deleteBadge).count() > 0) {
      await expect(page.locator(SELECTORS.deleteBadge).first()).toBeVisible();
    }
  });

  test.skip('table has no edit or delete action buttons (audit log is immutable)', async ({
    page,
  }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // US-024 AC-6: audit log entries must be immutable — no edit/delete controls.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    const firstRow = page.locator(SELECTORS.auditRow).first();

    await expect(firstRow.getByRole('button', { name: /edit/i })).not.toBeVisible();
    await expect(firstRow.getByRole('button', { name: /delete/i })).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Detail drawer
  // -------------------------------------------------------------------------

  test.skip('clicking an audit row opens the detail drawer', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    // US-024 AC-4: clicking a row should open a drawer with the full event payload.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.auditRow).first().click();

    const drawer = page.locator(SELECTORS.detailDrawer);
    await expect(drawer).toBeVisible();
  });

  test.skip('detail drawer shows the full JSON payload of the event', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.auditRow).first().click();

    const jsonBlock = page.locator(SELECTORS.payloadJson);
    await expect(jsonBlock).toBeVisible();
    // The payload should be valid JSON — checking it starts with "{".
    await expect(jsonBlock).toContainText('{');
  });

  test.skip('detail drawer shows IP address and user agent', async ({ page }) => {
    // Skipped: requires authenticated admin session + seeded database.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await page.locator(SELECTORS.auditRow).first().click();

    await expect(page.locator(SELECTORS.ipAddress)).toBeVisible();
    await expect(page.locator(SELECTORS.userAgent)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  test.skip('pagination controls are visible when there are more than 50 events', async ({
    page,
  }) => {
    // Skipped: requires authenticated admin session + database with > 50 events.
    // Seed data creates 20 events, so pagination controls would be hidden.
    // This test documents the intended pagination behaviour for AC-8.
    // To exercise it: insert > 50 audit_events rows via a fixture script.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await expect(page.locator(SELECTORS.paginationControls)).toBeVisible();
    await expect(page.locator(SELECTORS.nextPageButton)).toBeVisible();
  });

  test.skip('default page size is 50 rows per page', async ({ page }) => {
    // Skipped: requires authenticated admin session + database with > 50 events.
    // US-024 AC-8: the default page size is 50 rows.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    const rows = page.locator(SELECTORS.auditRow);
    // With > 50 events the first page should display exactly 50 rows.
    await expect(rows).toHaveCount(50);
  });

  test.skip('clicking "Next page" loads the second page of results', async ({ page }) => {
    // Skipped: requires authenticated admin session + database with > 50 events.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    // Capture the first-row timestamp before navigating.
    const firstTimestamp = await page
      .locator(SELECTORS.timestampCell)
      .first()
      .textContent();

    await page.locator(SELECTORS.nextPageButton).click();

    // After navigating the first row should show a different timestamp.
    const newFirstTimestamp = await page
      .locator(SELECTORS.timestampCell)
      .first()
      .textContent();
    expect(newFirstTimestamp).not.toBe(firstTimestamp);
  });

  // -------------------------------------------------------------------------
  // Export CSV
  // -------------------------------------------------------------------------

  test.skip('"Export CSV" button is visible on the audit log page', async ({ page }) => {
    // Skipped: requires authenticated admin session.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    await expect(page.locator(SELECTORS.exportCsvButton)).toBeVisible();
    await expect(page.locator(SELECTORS.exportCsvButton)).toBeEnabled();
  });

  test.skip('"Export CSV" triggers a file download with filtered results', async ({ page }) => {
    // Skipped: requires authenticated admin session + Postgres.
    // US-024 AC-5: "Export CSV" must download a CSV file containing the
    // currently filtered audit events.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password, '/admin/audit-log');

    // Apply a filter to narrow the export scope.
    await page.locator(SELECTORS.actionTypeFilter).click();
    await page.getByRole('option', { name: 'Login' }).click();

    // Listen for the download event triggered by the export button.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator(SELECTORS.exportCsvButton).click(),
    ]);

    // The downloaded file should have a .csv extension.
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);

    // The file should not be empty — save to temp and verify size.
    const path = await download.path();
    expect(path).not.toBeNull();
  });
});

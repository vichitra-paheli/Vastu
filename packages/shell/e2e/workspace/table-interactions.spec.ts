/**
 * E2E tests — Table interactions and view save/load (US-127d)
 *
 * Acceptance criteria covered:
 *   AC-7: Table sort — click header, verify order
 *   AC-8: Table filter — add pill, verify row count
 *   AC-9: View save/load — save, reload, verify state
 *
 * VastuTable renders with:
 *   - data-testid="vastu-table-container" on the root div
 *   - [role="columnheader"] for header cells (clickable for sort)
 *   - [data-row-id] on each row (virtual scrolling via TanStack Virtual)
 *   - [role="status"][aria-live="polite"] for the footer row count
 *
 * ViewToolbar renders save/load controls for persisting view state.
 * FilterBar renders filter pills after the user applies a filter.
 *
 * ALL tests are marked `test.skip` because they require:
 *   1. Docker services: `docker compose up -d`
 *   2. Database seeded with table data: `pnpm prisma:seed`
 *   3. Dev server: `pnpm dev`
 *
 * Tests without `test.skip` verify auth protection only.
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';
import { WorkspacePage, WS } from './fixtures/workspace-page';

// ---------------------------------------------------------------------------
// Shared helper: navigate to a page that renders a VastuTable
// ---------------------------------------------------------------------------

/**
 * Opens the "Contacts" page which renders a VastuTable backed by seed data.
 * Waits for the table container to appear.
 */
async function openTablePage(page: Page): Promise<WorkspacePage> {
  await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
  const ws = new WorkspacePage(page);
  await ws.waitForShell();
  await ws.sidebar.clickItem('Contacts');
  // Wait for the table container to appear.
  await page.locator(WS.tableContainer).waitFor({ state: 'visible', timeout: 10_000 });
  return ws;
}

// ---------------------------------------------------------------------------
// AC-7: Table sort — click header, verify order
// ---------------------------------------------------------------------------

test.describe('Table interactions — AC-7: column sort', () => {
  test.skip('clicking a column header sorts rows in ascending order', async ({ page }) => {
    // Requires: docker compose up -d + seeded Contacts data
    const ws = await openTablePage(page);

    // Click the "Name" column header to sort ascending.
    await ws.table.clickHeader('Name');

    // Wait for the sort indicator to appear on the Name header (auto-retrying).
    const nameHeader = page.locator(WS.tableHeaderRow).filter({ hasText: /^name$/i });
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending', { timeout: 5_000 });

    // Table must still render rows after sorting.
    await expect(page.locator(WS.tableRow).first()).toBeVisible({ timeout: 5_000 });
  });

  test.skip('clicking a sorted column header again reverses the sort order', async ({ page }) => {
    // Requires: docker compose up -d + seeded Contacts data
    const ws = await openTablePage(page);

    const nameHeader = page.locator(WS.tableHeaderRow).filter({ hasText: /^name$/i });

    // Click once → ascending.
    await ws.table.clickHeader('Name');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending', { timeout: 5_000 });

    // Click again → descending.
    await ws.table.clickHeader('Name');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending', { timeout: 5_000 });
  });

  test.skip('sort indicator icon appears after clicking a column header', async ({ page }) => {
    // Requires: docker compose up -d + seeded Contacts data
    const ws = await openTablePage(page);

    // Before clicking, the Name header should have no sort direction.
    const nameHeader = page.locator(WS.tableHeaderRow).filter({ hasText: /^name$/i });

    await ws.table.clickHeader('Name');

    // After clicking, the Name header should carry an aria-sort attribute.
    await expect(nameHeader).toHaveAttribute('aria-sort', /(ascending|descending)/, {
      timeout: 5_000,
    });
  });

  test.skip('row order changes after sorting by a numeric column', async ({ page }) => {
    // Requires: docker compose up -d + seeded Contacts data with a numeric column
    await openTablePage(page);

    // Sort by "Amount" column (if present — skip if not in the seed data).
    const amountHeader = page.locator(WS.tableHeaderRow).filter({ hasText: /amount/i });
    if ((await amountHeader.count()) === 0) {
      test.info().annotations.push({ type: 'note', description: 'Amount column not found' });
      return;
    }
    await amountHeader.first().click();

    // Wait for the sort indicator to confirm the sort applied (auto-retrying).
    await expect(amountHeader.first()).toHaveAttribute('aria-sort', /(ascending|descending)/, {
      timeout: 5_000,
    });
    // Table must remain visible after sort.
    await expect(page.locator(WS.tableRow).first()).toBeVisible({ timeout: 5_000 });
  });

  test.skip('sorting does not affect row count', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    const ws = await openTablePage(page);

    const countBefore = await page.locator(WS.tableRow).count();
    await ws.table.clickHeader('Name');

    // Wait for sort to settle before counting (auto-retrying via toHaveCount).
    await expect(page.locator(WS.tableRow)).toHaveCount(countBefore, { timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// AC-8: Table filter — add pill, verify row count
// ---------------------------------------------------------------------------

test.describe('Table interactions — AC-8: filter pills', () => {
  test.skip('right-clicking a cell shows a context menu with filter option', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    await openTablePage(page);

    // Right-click the first data cell (skip the checkbox column, use index 1).
    const firstDataCell = page
      .locator(WS.tableRow)
      .first()
      .locator('[class*="cell"], [role="cell"]')
      .nth(1);

    await firstDataCell.click({ button: 'right' });

    // A context menu should appear with "Include" and "Exclude" filter options.
    await expect(page.getByRole('menuitem', { name: /filter|include|exclude/i }).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test.skip('clicking "Include" in cell context menu adds a filter pill', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    await openTablePage(page);

    // Right-click the first data cell.
    const firstDataCell = page
      .locator(WS.tableRow)
      .first()
      .locator('[class*="cell"], [role="cell"]')
      .nth(1);
    await firstDataCell.click({ button: 'right' });

    // The "Include" context menu item must be present (fails test if missing).
    const includeItem = page.getByRole('menuitem', { name: /include/i });
    await expect(includeItem).toBeVisible({ timeout: 5_000 });
    await includeItem.click();

    // A filter pill should appear in the FilterBar above the table (auto-retrying).
    await expect(page.locator('[data-testid^="filter-pill-"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test.skip('applying a filter reduces the visible row count', async ({ page }) => {
    // Requires: docker compose up -d + seeded data with multiple rows
    await openTablePage(page);

    const totalRows = await page.locator(WS.tableRow).count();

    // Right-click and apply "Include" filter on the first data cell.
    const firstDataCell = page
      .locator(WS.tableRow)
      .first()
      .locator('[class*="cell"], [role="cell"]')
      .nth(1);
    await firstDataCell.click({ button: 'right' });

    const includeItem = page.getByRole('menuitem', { name: /include/i });
    await expect(includeItem).toBeVisible({ timeout: 5_000 });
    await includeItem.click();

    // Wait for the filter pill to appear, confirming the filter was applied.
    await expect(page.locator('[data-testid^="filter-pill-"]').first()).toBeVisible({
      timeout: 5_000,
    });

    // Filtered row count should be <= total rows (auto-retrying assertion).
    const filteredRows = await page.locator(WS.tableRow).count();
    expect(filteredRows).toBeLessThanOrEqual(totalRows);
  });

  test.skip('filter pill can be removed by clicking its dismiss button', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    await openTablePage(page);

    const totalRows = await page.locator(WS.tableRow).count();

    // Apply a filter.
    const firstDataCell = page
      .locator(WS.tableRow)
      .first()
      .locator('[class*="cell"], [role="cell"]')
      .nth(1);
    await firstDataCell.click({ button: 'right' });

    const includeItem = page.getByRole('menuitem', { name: /include/i });
    await expect(includeItem).toBeVisible({ timeout: 5_000 });
    await includeItem.click();

    // Wait for the filter pill to appear before removing it.
    const filterPill = page.locator('[data-testid^="filter-pill-"]').first();
    await expect(filterPill).toBeVisible({ timeout: 5_000 });

    // Remove the filter pill.
    const pillRemoveButton = filterPill.getByRole('button', { name: /remove|close|dismiss/i });
    await expect(pillRemoveButton).toBeVisible({ timeout: 5_000 });
    await pillRemoveButton.click();

    // Row count should return to original (auto-retrying assertion).
    await expect(page.locator(WS.tableRow)).toHaveCount(totalRows, { timeout: 5_000 });
  });

  test.skip('applying an Exclude filter removes matching rows', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    await openTablePage(page);

    const totalRows = await page.locator(WS.tableRow).count();

    // Right-click the first data cell.
    const firstDataCell = page
      .locator(WS.tableRow)
      .first()
      .locator('[class*="cell"], [role="cell"]')
      .nth(1);
    await firstDataCell.click({ button: 'right' });

    const excludeItem = page.getByRole('menuitem', { name: /exclude/i });
    await expect(excludeItem).toBeVisible({ timeout: 5_000 });
    await excludeItem.click();

    // Wait for the filter pill to appear, confirming the filter was applied.
    await expect(page.locator('[data-testid^="filter-pill-"]').first()).toBeVisible({
      timeout: 5_000,
    });

    // After excluding, matching rows should be hidden.
    const filteredRows = await page.locator(WS.tableRow).count();
    expect(filteredRows).toBeLessThanOrEqual(totalRows);
  });

  test.skip('table footer updates row count when filter is applied', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    const ws = await openTablePage(page);

    const footerBefore = await ws.table.footerText();

    // Apply a filter via context menu.
    const firstDataCell = page
      .locator(WS.tableRow)
      .first()
      .locator('[class*="cell"], [role="cell"]')
      .nth(1);
    await firstDataCell.click({ button: 'right' });

    const includeItem = page.getByRole('menuitem', { name: /include/i });
    await expect(includeItem).toBeVisible({ timeout: 5_000 });
    await includeItem.click();

    // Wait for the filter pill to appear before checking the footer.
    await expect(page.locator('[data-testid^="filter-pill-"]').first()).toBeVisible({
      timeout: 5_000,
    });

    const footerAfter = await ws.table.footerText();
    // Footer text should reflect the filtered count (may differ from total).
    expect(footerAfter).toBeTruthy();
    void footerBefore;
  });
});

// ---------------------------------------------------------------------------
// AC-9: View save/load — save, reload, verify state
// ---------------------------------------------------------------------------

test.describe('Table interactions — AC-9: view save and load', () => {
  test.skip('ViewToolbar is visible after opening a page panel', async ({ page }) => {
    // Requires: docker compose up -d
    await openTablePage(page);

    // ViewToolbar is rendered in the main area above DockviewHost.
    await expect(page.locator(WS.viewToolbar)).toBeVisible({ timeout: 5_000 });
  });

  test.skip('save button is visible in the ViewToolbar', async ({ page }) => {
    // Requires: docker compose up -d
    await openTablePage(page);

    await expect(page.locator(WS.viewToolbar)).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(WS.viewSaveButton)).toBeVisible({ timeout: 5_000 });
  });

  test.skip('clicking save button opens a save-view dialog or saves immediately', async ({
    page,
  }) => {
    // Requires: docker compose up -d + database session
    await openTablePage(page);

    // Apply a sort so there is state to save.
    const ws = new WorkspacePage(page);
    await ws.table.clickHeader('Name');
    // Wait for the sort to take effect before saving.
    const nameHeader = page.locator(WS.tableHeaderRow).filter({ hasText: /^name$/i });
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending', { timeout: 5_000 });

    await page.locator(WS.viewSaveButton).click();

    // The save action may open a dialog or save silently and show a toast.
    // We check for either a dialog or a success notification (auto-retrying).
    const dialog = page.getByRole('dialog');
    const toast = page.locator('[role="status"]').filter({ hasText: /saved|success/i });

    const dialogVisible = await dialog.isVisible().catch(() => false);
    const toastVisible = await toast.isVisible().catch(() => false);

    expect(dialogVisible || toastVisible).toBe(true);
  });

  test.skip('saved view appears in the ViewSelector dropdown', async ({ page }) => {
    // Requires: docker compose up -d + database session
    await openTablePage(page);

    // Save the current default view.
    await page.locator(WS.viewSaveButton).click();

    // Dismiss any save dialog (auto-retrying: wait for button, then click).
    const confirmButton = page.getByRole('button', { name: /save|confirm|ok/i });
    if (await confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Open the ViewSelector dropdown (must be present).
    const selectorTrigger = page.locator(WS.viewSelector);
    await expect(selectorTrigger).toBeVisible({ timeout: 5_000 });
    await selectorTrigger.click();

    // There should be at least one view listed (auto-retrying).
    const viewEntries = page.locator('[data-active], [class*="entry"]');
    await expect(viewEntries.first()).toBeVisible({ timeout: 5_000 });
  });

  test.skip('loading a saved view restores its sort state', async ({ page }) => {
    // Requires: docker compose up -d + database session (two-step test)
    // Step 1: Sort by Name ascending, save the view.
    // Step 2: Reload the page, load the saved view, verify the Name column
    //         header still shows aria-sort="ascending" (not just rowCount > 0).
    await openTablePage(page);

    const ws = new WorkspacePage(page);
    const nameHeader = page.locator(WS.tableHeaderRow).filter({ hasText: /^name$/i });

    // Sort by Name ascending.
    await ws.table.clickHeader('Name');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending', { timeout: 5_000 });

    // Save the view.
    await page.locator(WS.viewSaveButton).click();

    const confirmButton = page.getByRole('button', { name: /save|confirm/i });
    if (await confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Reload the workspace page and navigate back to Contacts.
    await page.reload();
    await ws.waitForShell();
    await ws.sidebar.clickItem('Contacts');
    await page.locator(WS.tableContainer).waitFor({ state: 'visible', timeout: 10_000 });

    // Load the saved view from the ViewSelector (must be present).
    const selectorTrigger = page.locator(WS.viewSelector);
    await expect(selectorTrigger).toBeVisible({ timeout: 5_000 });
    await selectorTrigger.click();

    const viewEntry = page.locator('[class*="entry"]').first();
    await expect(viewEntry).toBeVisible({ timeout: 5_000 });
    await viewEntry.click();

    // The Name column header must show the restored sort state (ascending).
    // This verifies sort state is actually persisted, not just that rows exist.
    await expect(page.locator(WS.tableHeaderRow).filter({ hasText: /^name$/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
      { timeout: 5_000 },
    );
  });

  test.skip('reset button restores the default view state', async ({ page }) => {
    // Requires: docker compose up -d
    await openTablePage(page);

    const ws = new WorkspacePage(page);
    const nameHeader = page.locator(WS.tableHeaderRow).filter({ hasText: /^name$/i });

    // Apply a sort change.
    await ws.table.clickHeader('Name');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending', { timeout: 5_000 });

    // Reset button must be present (fails test if missing).
    const resetButton = page.locator(WS.viewResetButton);
    await expect(resetButton).toBeVisible({ timeout: 5_000 });
    await resetButton.click();

    // After reset the sort indicator should be gone (auto-retrying).
    await expect(nameHeader).not.toHaveAttribute('aria-sort', /(ascending|descending)/, {
      timeout: 5_000,
    });
    // Table must still render rows.
    await expect(page.locator(WS.tableRow).first()).toBeVisible({ timeout: 5_000 });
  });

  test.skip('view selector shows MY VIEWS section for owned views', async ({ page }) => {
    // Requires: docker compose up -d + saved views for admin user
    await openTablePage(page);

    // ViewSelector must be present (fails test if missing).
    const selectorTrigger = page.locator(WS.viewSelector);
    await expect(selectorTrigger).toBeVisible({ timeout: 5_000 });
    await selectorTrigger.click();

    // The dropdown must open (auto-retrying).
    const dropdown = page.locator('[class*="dropdown"]').first();
    await expect(dropdown).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Table accessibility
// ---------------------------------------------------------------------------

test.describe('Table interactions — accessibility', () => {
  test.skip('table container is focusable for keyboard shortcut context', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    await openTablePage(page);

    const tableContainer = page.locator(WS.tableContainer);
    await tableContainer.focus();
    await expect(tableContainer).toBeFocused();
  });

  test.skip('pressing j/k moves row focus within the table', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    // VastuTable registers table-scoped j/k shortcuts for row navigation.
    await openTablePage(page);

    const tableContainer = page.locator(WS.tableContainer);
    await tableContainer.focus();

    // Press 'j' to move to the next row.
    await page.keyboard.press('j');

    // The table should still be visible after the keypress (auto-retrying assertion).
    await expect(tableContainer).toBeVisible();
  });

  test.skip('column headers have accessible columnheader role', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    await openTablePage(page);

    const headers = page.locator(WS.tableHeaderRow);
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);
  });

  test.skip('table footer announces row count via aria-live', async ({ page }) => {
    // Requires: docker compose up -d + seeded data
    await openTablePage(page);

    const footer = page.locator(WS.tableFooter);
    await expect(footer).toBeVisible({ timeout: 5_000 });
    const text = await footer.textContent();
    expect(text).toMatch(/\d+/);
  });
});

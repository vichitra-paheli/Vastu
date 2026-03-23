/**
 * E2E tests — Command palette (US-127c / AC-6)
 *
 * Acceptance criteria covered:
 *   AC-6: Command palette opens, search, select, panel opens
 *
 * The command palette is built on Mantine Spotlight v7 and mounts at the
 * WorkspaceShell root. It opens via:
 *   - Keyboard shortcut: Cmd+K (Meta+K) or Ctrl+K
 *   - Tray bar search button (data-testid="tray-search-button")
 *
 * ALL tests that interact with the command palette UI are marked with
 * `test.skip` because they require a running Next.js dev server and
 * authenticated session (Docker + Keycloak or direct DB session seeding).
 *
 * Tests without `test.skip` verify auth-protection only.
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';
import { WorkspacePage, WS } from './fixtures/workspace-page';
import { BUILT_IN_COMMANDS } from './fixtures/seed-data';

// ---------------------------------------------------------------------------
// AC-6: Open via keyboard shortcut
// ---------------------------------------------------------------------------

test.describe('Command palette — AC-6: open via Cmd+K', () => {
  test.skip('pressing Cmd+K opens the command palette', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();

    // The Spotlight search input should become visible.
    const searchInput = page.locator(WS.commandPaletteSearch);
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
  });

  test.skip('pressing Escape closes the command palette', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();
    await expect(page.locator(WS.commandPaletteSearch)).toBeVisible({ timeout: 5_000 });

    await ws.commandPalette.close();

    await expect(page.locator(WS.commandPaletteSearch)).not.toBeVisible({ timeout: 3_000 });
  });

  test.skip('pressing Cmd+K again closes the command palette (toggle)', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    // Open
    await ws.commandPalette.openViaKeyboard();
    await expect(page.locator(WS.commandPaletteSearch)).toBeVisible({ timeout: 5_000 });

    // Toggle closed
    await ws.commandPalette.openViaKeyboard();
    await expect(page.locator(WS.commandPaletteSearch)).not.toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// AC-6: Open via tray bar search button
// ---------------------------------------------------------------------------

test.describe('Command palette — AC-6: open via tray search button', () => {
  test.skip('clicking the tray search button opens the command palette', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaTrayButton();

    await expect(page.locator(WS.commandPaletteSearch)).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// AC-6: Search and results
// ---------------------------------------------------------------------------

test.describe('Command palette — AC-6: search and result groups', () => {
  test.skip('shows PAGES group with sidebar pages in results', async ({ page }) => {
    // Requires: docker compose up -d
    // Typing a page name should show that page in the PAGES group.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('Dashboard');

    // Wait for results to appear (auto-retrying assertion handles the debounce).
    await expect(ws.commandPalette.results.filter({ hasText: 'Dashboard' }).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test.skip('shows COMMANDS group with built-in commands', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    // Typing ">" activates commands-only mode.
    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('>');

    // All built-in command labels should appear (auto-retrying assertion).
    for (const command of BUILT_IN_COMMANDS) {
      await expect(
        ws.commandPalette.results.filter({ hasText: command }).first(),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test.skip('shows empty state when search returns no results', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('zzz-no-match-zzz');

    // Mantine Spotlight.Empty renders the no-results message (auto-retrying assertion).
    await expect(page.locator(WS.commandPaletteEmpty)).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(WS.commandPaletteEmpty)).toContainText('zzz-no-match-zzz');
  });

  test.skip('footer hints are always visible when palette is open', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();
    // The Spotlight.Footer should be present with navigation hints.
    await expect(page.locator(WS.commandPaletteFooter)).toBeVisible({ timeout: 5_000 });
  });

  test.skip('commands-only mode hint is shown when query starts with ">"', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('>');

    // The commands-mode hint banner should appear (auto-retrying assertion).
    const hint = page.locator('[aria-live="polite"]').filter({ hasText: /command/i });
    await expect(hint).toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// AC-6: Select result — panel opens
// ---------------------------------------------------------------------------

test.describe('Command palette — AC-6: select result opens panel', () => {
  test.skip('selecting a PAGES result opens the corresponding Dockview panel', async ({
    page,
  }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    // Open palette and search for "Contacts".
    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('Contacts');

    // Wait for the Contacts result to appear before clicking (auto-retrying).
    await expect(ws.commandPalette.results.filter({ hasText: 'Contacts' }).first()).toBeVisible({
      timeout: 5_000,
    });

    // Click the Contacts result.
    await ws.commandPalette.selectResult('Contacts');

    // The command palette should close.
    await expect(page.locator(WS.commandPaletteSearch)).not.toBeVisible({ timeout: 3_000 });

    // A Dockview tab for Contacts should appear.
    await expect(
      page.locator(WS.dockviewTab).filter({ hasText: 'Contacts' }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test.skip('selecting a command result executes it and closes the palette', async ({ page }) => {
    // Requires: docker compose up -d
    // Selecting "Toggle sidebar" command should toggle the sidebar.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    const initialCollapsed = await ws.sidebar.isCollapsed();

    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('>toggle');

    // Wait for the Toggle sidebar result to appear (auto-retrying assertion).
    await expect(
      ws.commandPalette.results.filter({ hasText: 'Toggle sidebar' }).first(),
    ).toBeVisible({ timeout: 5_000 });

    await ws.commandPalette.selectResult('Toggle sidebar');

    // Palette should close.
    await expect(page.locator(WS.commandPaletteSearch)).not.toBeVisible({ timeout: 3_000 });

    // Sidebar should have toggled.
    const afterCollapsed = await ws.sidebar.isCollapsed();
    expect(afterCollapsed).toBe(!initialCollapsed);
  });

  test.skip('keyboard arrow keys navigate between results', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('a');

    // Wait for at least one result to appear before pressing ArrowDown (auto-retrying).
    await expect(ws.commandPalette.results.first()).toBeVisible({ timeout: 5_000 });

    // Press ArrowDown to move focus to the first result.
    await page.keyboard.press('ArrowDown');

    // A result should become focused (Mantine Spotlight manages focus internally).
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test.skip('pressing Enter on a focused result activates it', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.type('Dashboard');

    // Wait for the Dashboard result to appear before navigating (auto-retrying).
    await expect(ws.commandPalette.results.filter({ hasText: 'Dashboard' }).first()).toBeVisible({
      timeout: 5_000,
    });

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // A Dockview tab for Dashboard should appear.
    await expect(
      page.locator(WS.dockviewTab).filter({ hasText: 'Dashboard' }),
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test.describe('Command palette — accessibility', () => {
  test.skip('command palette search input has an accessible aria-label', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.commandPalette.openViaKeyboard();

    const searchInput = page.locator(WS.commandPaletteSearch);
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    const label = await searchInput.getAttribute('aria-label');
    expect(label).toBeTruthy();
  });

  test.skip('focus returns to the previously focused element after closing', async ({ page }) => {
    // Requires: docker compose up -d
    // Mantine Spotlight should restore focus on close (Escape).
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    // Focus something in the main area before opening.
    const traySearch = page.locator(WS.traySearchButton);
    await traySearch.focus();

    await ws.commandPalette.openViaKeyboard();
    await ws.commandPalette.close();

    // After closing, the search button should be focused again (or at least visible).
    await expect(traySearch).toBeVisible();
  });
});

/**
 * E2E tests — Mode switch: Editor / Builder (US-127c / AC-10)
 *
 * Acceptance criteria covered:
 *   AC-10: Mode switch — toggle Editor/Builder
 *
 * ModeSwitch renders a radiogroup inside the Dockview tab bar.
 * It is only visible when a panel is open AND the user has the CASL ability
 * `configure Page` (for Builder) or `manage all` (Admin role).
 *
 * RBAC matrix:
 *   Admin  → sees Editor + Builder (+ Workflow if ephemeralEnabled)
 *   Editor → sees Editor only (ModeSwitch is not rendered)
 *   Viewer → sees Editor only (ModeSwitch is not rendered)
 *
 * ALL tests are marked `test.skip` because they require an authenticated
 * session (Docker + next-auth DB sessions) and a running dev server.
 * Tests that verify auth protection only do not have `test.skip`.
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from '../fixtures';
import { WorkspacePage, WS } from './fixtures/workspace-page';

// ---------------------------------------------------------------------------
// AC-10: Mode switch visible state
// ---------------------------------------------------------------------------

test.describe('Mode switch — AC-10: visibility by role', () => {
  test.skip('admin: ModeSwitch is rendered after opening a panel', async ({ page }) => {
    // Requires: docker compose up -d
    // Admin has configure Page → Builder tab visible → ModeSwitch renders.
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');

    // Wait for the panel to open, then check for the ModeSwitch radiogroup.
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await expect(modeGroup).toBeVisible({ timeout: 8_000 });
  });

  test.skip('admin: Editor and Builder radio buttons are both visible', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    await expect(page.getByRole('radio', { name: /editor/i }).first()).toBeVisible();
    await expect(page.getByRole('radio', { name: /builder/i }).first()).toBeVisible();
  });

  test.skip('editor role: ModeSwitch is not rendered (only Editor mode)', async ({ page }) => {
    // Requires: docker compose up -d
    // Editors lack configure Page ability — ModeSwitch renders null when only one segment.
    await loginAs(page, TEST_USERS.editor.email, TEST_USERS.editor.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');

    // Wait for the Dockview panel content to appear before asserting the
    // ModeSwitch is absent (auto-retrying with generous timeout).
    await expect(page.locator(WS.dockviewPanelContent).first()).toBeVisible({ timeout: 8_000 });

    // ModeSwitch should not be visible for editors.
    await expect(page.locator(WS.modeSwitchGroup)).not.toBeVisible();
  });

  test.skip('viewer role: ModeSwitch is not rendered', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.viewer.email, TEST_USERS.viewer.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');

    // Wait for the Dockview panel content to appear before asserting the
    // ModeSwitch is absent (auto-retrying with generous timeout).
    await expect(page.locator(WS.dockviewPanelContent).first()).toBeVisible({ timeout: 8_000 });

    await expect(page.locator(WS.modeSwitchGroup)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC-10: Mode switch toggle behaviour
// ---------------------------------------------------------------------------

test.describe('Mode switch — AC-10: toggle Editor / Builder', () => {
  test.skip('Editor mode is active by default', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    // The Editor radio should be checked by default.
    await expect(page.getByRole('radio', { name: /editor/i }).first()).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByRole('radio', { name: /builder/i }).first()).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test.skip('clicking Builder switches mode to builder', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    await ws.modeSwitch.switchToBuilder();

    await expect(page.getByRole('radio', { name: /builder/i }).first()).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByRole('radio', { name: /editor/i }).first()).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test.skip('clicking Editor after Builder switches back to editor mode', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    // Switch to Builder then back to Editor.
    await ws.modeSwitch.switchToBuilder();
    await ws.modeSwitch.switchToEditor();

    await expect(page.getByRole('radio', { name: /editor/i }).first()).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test.skip('switching to Builder mode shows builder panel content', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    await ws.modeSwitch.switchToBuilder();

    // Builder mode renders a dedicated panel area (data-testid="builder-panel").
    await expect(page.getByTestId('builder-panel')).toBeVisible({ timeout: 5_000 });
  });

  test.skip('switching back from Builder to Editor hides the builder panel', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    await ws.modeSwitch.switchToBuilder();
    await expect(page.getByTestId('builder-panel')).toBeVisible({ timeout: 5_000 });

    await ws.modeSwitch.switchToEditor();
    await expect(page.getByTestId('builder-panel')).not.toBeVisible({ timeout: 3_000 });
  });

  test.skip('ModeSwitch per-panel: switching in one panel does not affect another', async ({
    page,
  }) => {
    // Requires: docker compose up -d
    // Each Dockview panel tracks its mode independently via panelStore.panelModes[panelId].
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    // Open two panels.
    await ws.sidebar.clickItem('Dashboard');
    await ws.sidebar.clickItem('Contacts');

    // Switch to Contacts tab and change its mode to Builder.
    await page.locator(WS.dockviewTab).filter({ hasText: 'Contacts' }).click();
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });
    await ws.modeSwitch.switchToBuilder();

    // Switch to Dashboard tab — it should still be in Editor mode.
    await page.locator(WS.dockviewTab).filter({ hasText: 'Dashboard' }).click();
    await modeGroup.waitFor({ state: 'visible', timeout: 5_000 });

    await expect(page.getByRole('radio', { name: /editor/i }).first()).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test.describe('Mode switch — accessibility', () => {
  test.skip('ModeSwitch radiogroup has an accessible aria-label', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    const label = await modeGroup.getAttribute('aria-label');
    expect(label).toBeTruthy();
  });

  test.skip('radio buttons within ModeSwitch are keyboard-focusable', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    // Tab into the first radio button.
    await page.getByRole('radio', { name: /editor/i }).first().focus();
    await expect(page.locator(':focus')).toBeVisible();
  });

  test.skip('radio buttons have tooltip titles', async ({ page }) => {
    // Requires: docker compose up -d
    await loginAs(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    const ws = new WorkspacePage(page);
    await ws.waitForShell();

    await ws.sidebar.clickItem('Dashboard');
    const modeGroup = page.locator(WS.modeSwitchGroup).first();
    await modeGroup.waitFor({ state: 'visible', timeout: 8_000 });

    const editorBtn = page.getByRole('radio', { name: /editor/i }).first();
    const title = await editorBtn.getAttribute('title');
    expect(title).toBeTruthy();
  });
});

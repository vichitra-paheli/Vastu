/**
 * Workspace Page Object Model (POM) for E2E tests.
 *
 * Provides typed accessors and action helpers for all major workspace regions:
 *   - WorkspaceShell layout (sidebar, main, tray)
 *   - SidebarNav (toggle, search, items)
 *   - DockviewHost (tabs, split, panel tab interaction)
 *   - TrayBar (minimized chips, restore, close)
 *   - CommandPalette (open, search, select)
 *   - ModeSwitch (Editor / Builder)
 *   - VastuTable (sort, filter header)
 *   - ViewToolbar (save, load, selector)
 *
 * All selectors use data-testid, accessible roles, or aria-labels so that
 * minor HTML restructuring does not break tests.
 *
 * Usage:
 *   const ws = new WorkspacePage(page);
 *   await ws.goto();
 *   await ws.sidebar.toggle();
 */

import type { Page, Locator } from '@playwright/test';

// ---------------------------------------------------------------------------
// Workspace selectors
// ---------------------------------------------------------------------------

export const WS = {
  // Layout regions
  sidebar: '[aria-label="Workspace sidebar"]',
  main: '#workspace-main',
  tray: '[role="region"][aria-label="Workspace tray"]',

  // Sidebar
  sidebarToggleCollapse: '[aria-label="Collapse sidebar"]',
  sidebarToggleExpand: '[aria-label="Expand sidebar"]',
  sidebarSearch: '[placeholder="Search pages..."]',
  // SidebarItem renders data-item-id={id} on the <button> element (not data-testid).
  // See packages/workspace/src/components/SidebarNav/SidebarItem.tsx.
  sidebarNavItem: '[data-item-id]',

  // Dockview — internal CSS selectors from Dockview v4.x.
  // These classes are part of Dockview's internal DOM structure and may change
  // if the Dockview version is upgraded. Update these selectors when bumping
  // the dockview package version.
  // Dockview v4.x internal selector — update if Dockview version changes.
  dockviewContainer: '.dv-react-dockview',
  // Dockview v4.x internal selector — update if Dockview version changes.
  dockviewTab: '.dv-tab',
  // Dockview v4.x internal selector — update if Dockview version changes.
  dockviewActiveTab: '.dv-tab.dv-active-tab',
  // Dockview v4.x internal selector — update if Dockview version changes.
  dockviewPanelContent: '.dv-panel-content',

  // TrayBar
  trayBar: '[class*="trayBar"]',
  trayPanelList: '[role="list"][aria-label]',
  trayListItem: '[role="listitem"]',
  traySearchButton: '[data-testid="tray-search-button"]',
  trayItemChip: '[data-testid^="tray-item-"]',

  // CommandPalette (Mantine Spotlight)
  // The aria-label value matches commandPalette.searchAriaLabel in en.json.
  commandPaletteRoot: '[data-testid="command-palette"]',
  commandPaletteSearch: '[aria-label="Search command palette"]',
  commandPaletteResult: '[data-testid^="cp-result-"]',
  commandPaletteEmpty: '[class*="emptyState"]',
  commandPaletteFooter: '[class*="footer"]',

  // ModeSwitch
  modeSwitchGroup: '[role="radiogroup"][aria-label]',
  modeSwitchEditor: '[role="radio"][title*="editor"], [role="radio"][title*="Editor"]',
  modeSwitchBuilder: '[role="radio"][title*="builder"], [role="radio"][title*="Builder"]',

  // VastuTable
  tableContainer: '[data-testid="vastu-table-container"]',
  tableHeaderRow: '[role="columnheader"]',
  tableRow: '[data-row-id]',
  tableFooter: '[role="status"][aria-live="polite"]',
  tableSortIcon: '[data-testid^="sort-icon-"]',

  // ViewToolbar — selectors match ViewToolbar.tsx actual data-testid values.
  // The toolbar root uses role="toolbar" with an aria-label; individual
  // controls use the data-testid values rendered in the component.
  // See packages/workspace/src/components/ViewToolbar/ViewToolbar.tsx.
  viewToolbar: '[role="toolbar"]',
  // The view name is an <input> with aria-label matching view.toolbar.viewNameAriaLabel.
  viewName: '[aria-label][class*="viewNameInput"]',
  // Save button uses data-testid="save-button" (not "view-save-button").
  viewSaveButton: '[data-testid="save-button"]',
  // Reset button uses data-testid="reset-button" (not "view-reset-button").
  viewResetButton: '[data-testid="reset-button"]',
  viewSelector: '[aria-label*="view selector"], [aria-label*="View selector"]',
} as const;

// ---------------------------------------------------------------------------
// Sub-page-objects
// ---------------------------------------------------------------------------

export class SidebarPOM {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator(WS.sidebar);
  }

  /** Click the collapse/expand toggle button. */
  async toggle(): Promise<void> {
    const collapse = this.page.locator(WS.sidebarToggleCollapse);
    const expand = this.page.locator(WS.sidebarToggleExpand);

    if (await collapse.isVisible()) {
      await collapse.click();
    } else if (await expand.isVisible()) {
      await expand.click();
    }
  }

  /** Returns true when the sidebar is in collapsed (icon-rail) state. */
  async isCollapsed(): Promise<boolean> {
    const aside = this.page.locator(WS.sidebar);
    const attr = await aside.getAttribute('data-collapsed');
    return attr === 'true';
  }

  /** Type in the sidebar search box. */
  async search(query: string): Promise<void> {
    await this.page.locator(WS.sidebarSearch).fill(query);
  }

  /** Click a sidebar nav item by its visible label text. */
  async clickItem(label: string): Promise<void> {
    await this.page
      .locator(WS.sidebarNavItem)
      .filter({ hasText: label })
      .first()
      .click();
  }

  /** Return all visible sidebar nav item labels. */
  async itemLabels(): Promise<string[]> {
    const items = this.page.locator(WS.sidebarNavItem);
    return items.allTextContents();
  }
}

export class TrayPOM {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator(WS.trayBar);
  }

  /** Return all tray item locators (minimized panel chips). */
  get items(): Locator {
    return this.page.locator(WS.trayListItem);
  }

  /** Click the tray item for a given panel title. */
  async restorePanel(title: string): Promise<void> {
    await this.page
      .locator(WS.trayListItem)
      .filter({ hasText: title })
      .first()
      .click();
  }

  /** Open the command palette via the tray search button. */
  async openCommandPalette(): Promise<void> {
    await this.page.locator(WS.traySearchButton).click();
  }
}

export class CommandPalettePOM {
  constructor(private readonly page: Page) {}

  /** Open via keyboard shortcut (Cmd+K on macOS, Ctrl+K on Windows/Linux). */
  async openViaKeyboard(): Promise<void> {
    // Meta+k works on macOS; Control+k is the cross-platform fallback.
    // Playwright's page.keyboard.press supports both modifier names.
    const isMac = process.platform === 'darwin';
    await this.page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
  }

  /** Open via the tray search button. */
  async openViaTrayButton(): Promise<void> {
    await this.page.locator(WS.traySearchButton).click();
  }

  /** Returns true when the Spotlight overlay is visible. */
  async isVisible(): Promise<boolean> {
    // Mantine Spotlight renders into a portal; look for its search input.
    const input = this.page.locator(WS.commandPaletteSearch);
    return input.isVisible();
  }

  /** Type a search query. */
  async type(query: string): Promise<void> {
    await this.page.locator(WS.commandPaletteSearch).fill(query);
  }

  /** Return all visible result locators. */
  get results(): Locator {
    return this.page.locator(WS.commandPaletteResult);
  }

  /** Click the first result that matches the given label text. */
  async selectResult(label: string): Promise<void> {
    await this.page
      .locator(WS.commandPaletteResult)
      .filter({ hasText: label })
      .first()
      .click();
  }

  /** Close via Escape key. */
  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}

export class ModeSwitchPOM {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator(WS.modeSwitchGroup).first();
  }

  async switchToEditor(): Promise<void> {
    await this.page.getByRole('radio', { name: /editor/i }).first().click();
  }

  async switchToBuilder(): Promise<void> {
    await this.page.getByRole('radio', { name: /builder/i }).first().click();
  }

  async currentMode(): Promise<string | null> {
    const checked = this.page
      .locator(`${WS.modeSwitchGroup} [role="radio"][aria-checked="true"]`)
      .first();
    return checked.textContent();
  }
}

export class TablePOM {
  constructor(private readonly page: Page) {}

  get root(): Locator {
    return this.page.locator(WS.tableContainer);
  }

  get rows(): Locator {
    return this.page.locator(WS.tableRow);
  }

  get headerCells(): Locator {
    return this.page.locator(WS.tableHeaderRow);
  }

  get footer(): Locator {
    return this.page.locator(WS.tableFooter);
  }

  /** Click the column header with the given name to toggle sort. */
  async clickHeader(name: string): Promise<void> {
    await this.page
      .locator(WS.tableHeaderRow)
      .filter({ hasText: name })
      .first()
      .click();
  }

  /** Return the text content of the first cell in the given column index for a row. */
  async cellText(rowIndex: number, columnIndex: number): Promise<string | null> {
    const row = this.rows.nth(rowIndex);
    const cells = row.locator('[role="cell"], [class*="cell"]');
    return cells.nth(columnIndex).textContent();
  }

  /** Return the footer row-count text. */
  async footerText(): Promise<string | null> {
    return this.footer.textContent();
  }
}

// ---------------------------------------------------------------------------
// Top-level WorkspacePage POM
// ---------------------------------------------------------------------------

export class WorkspacePage {
  readonly sidebar: SidebarPOM;
  readonly tray: TrayPOM;
  readonly commandPalette: CommandPalettePOM;
  readonly modeSwitch: ModeSwitchPOM;
  readonly table: TablePOM;

  constructor(private readonly page: Page) {
    this.sidebar = new SidebarPOM(page);
    this.tray = new TrayPOM(page);
    this.commandPalette = new CommandPalettePOM(page);
    this.modeSwitch = new ModeSwitchPOM(page);
    this.table = new TablePOM(page);
  }

  /** Navigate to the workspace route. */
  async goto(): Promise<void> {
    await this.page.goto('/workspace');
  }

  /** Wait for the workspace shell to be fully rendered. */
  async waitForShell(): Promise<void> {
    await this.page.waitForSelector(WS.sidebar, { state: 'visible', timeout: 15_000 });
    await this.page.waitForSelector(WS.main, { state: 'visible', timeout: 15_000 });
    await this.page.waitForSelector(WS.tray, { state: 'visible', timeout: 15_000 });
  }

  /** Returns the page main locator. */
  get main(): Locator {
    return this.page.locator(WS.main);
  }

  /** Returns the sidebar locator. */
  get sidebarEl(): Locator {
    return this.page.locator(WS.sidebar);
  }

  /** Returns the tray region locator. */
  get trayEl(): Locator {
    return this.page.locator(WS.tray);
  }

  /** Returns the Dockview container locator. */
  get dockview(): Locator {
    return this.page.locator(WS.dockviewContainer);
  }
}

/**
 * panels/index.ts — panel registrations.
 *
 * Import this module once at application boot to register all built-in panel types.
 * The panel registry is populated as a side effect of importing this file.
 *
 * Custom panel types (from page templates) are registered in their respective
 * template modules and should be imported after this file.
 */

import { registerPanel } from './registry';
import { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
import { DataExplorerPanelWrapper } from './DataExplorerPanelWrapper';

/** Panel type ID for the data explorer template. */
export const DATA_EXPLORER_PANEL_TYPE_ID = 'data-explorer';

// Register the built-in WelcomePanel
registerPanel({
  id: WELCOME_PANEL_TYPE_ID,
  title: 'Welcome',
  component: WelcomePanel,
});

// Register the DataExplorer panel
registerPanel({
  id: DATA_EXPLORER_PANEL_TYPE_ID,
  title: 'Data Explorer',
  iconName: 'IconChartBar',
  component: DataExplorerPanelWrapper,
});

// Re-export for convenience
export { registerPanel, getPanel, getAllPanels, unregisterPanel, clearRegistry } from './registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
export { DataExplorerPanelWrapper } from './DataExplorerPanelWrapper';

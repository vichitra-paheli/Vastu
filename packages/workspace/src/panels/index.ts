/**
 * panels/index.ts — panel registrations.
 *
 * Import this module once at application boot to register all built-in panel types.
 * The panel registry is populated as a side effect of importing this file.
 *
 * Custom panel types (from page templates) are registered in their respective
 * template modules and should be imported after this file.
 */

import React from 'react';
import { registerPanel } from './registry';
import { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
import { MultiTabDetailTemplate, MULTI_TAB_DETAIL_PANEL_TYPE_ID } from '../templates/MultiTabDetail/MultiTabDetailTemplate';
import type { PanelProps } from '../types/panel';

// Register the built-in WelcomePanel
registerPanel({
  id: WELCOME_PANEL_TYPE_ID,
  title: 'Welcome',
  component: WelcomePanel,
});

/**
 * Adapter that bridges PanelProps (from Dockview) to MultiTabDetailTemplate.
 * Reads pageId and optional entityId from panel params.
 */
function MultiTabDetailPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  return React.createElement(MultiTabDetailTemplate, { pageId });
}

// Register the MultiTabDetail panel (US-131)
registerPanel({
  id: MULTI_TAB_DETAIL_PANEL_TYPE_ID,
  title: 'Detail',
  iconName: 'IconLayout2',
  component: MultiTabDetailPanelWrapper,
});

// Re-export for convenience
export { registerPanel, getPanel, getAllPanels, unregisterPanel, clearRegistry } from './registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
export {
  MultiTabDetailTemplate,
  MULTI_TAB_DETAIL_PANEL_TYPE_ID,
} from '../templates/MultiTabDetail/MultiTabDetailTemplate';

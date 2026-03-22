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
import {
  SummaryDashboardTemplate,
  SUMMARY_DASHBOARD_PANEL_TYPE,
} from '../templates/SummaryDashboard/SummaryDashboardTemplate';
import type { PanelProps } from '../types/panel';

// Register the built-in WelcomePanel
registerPanel({
  id: WELCOME_PANEL_TYPE_ID,
  title: 'Welcome',
  component: WelcomePanel,
});

/**
 * Adapter that bridges PanelProps (from Dockview) to SummaryDashboardTemplate.
 * Reads pageId from panel params.
 */
function SummaryDashboardPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  return React.createElement(SummaryDashboardTemplate, {
    pageId,
    config: { templateType: 'summary-dashboard' },
  });
}

// Register the SummaryDashboard panel (US-130)
registerPanel({
  id: SUMMARY_DASHBOARD_PANEL_TYPE,
  title: 'Dashboard',
  iconName: 'IconLayoutDashboard',
  component: SummaryDashboardPanelWrapper,
});

// Re-export for convenience
export { registerPanel, getPanel, getAllPanels, unregisterPanel, clearRegistry } from './registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
export {
  SummaryDashboardTemplate,
  SUMMARY_DASHBOARD_PANEL_TYPE,
} from '../templates/SummaryDashboard/SummaryDashboardTemplate';

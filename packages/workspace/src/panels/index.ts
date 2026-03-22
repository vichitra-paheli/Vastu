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
import { TableListingTemplate } from '../templates/TableListing/TableListingTemplate';
import type { PanelProps } from '../types/panel';

/** Panel type ID for the table listing template. */
export const TABLE_LISTING_PANEL_TYPE_ID = 'table-listing';

// Register the built-in WelcomePanel
registerPanel({
  id: WELCOME_PANEL_TYPE_ID,
  title: 'Welcome',
  component: WelcomePanel,
});

/**
 * Adapter that bridges PanelProps (from Dockview) to TableListingTemplate.
 * Reads pageId from panel params; data and actions are supplied by the template internally.
 */
function TableListingPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  const config = {
    templateType: 'table-listing' as const,
    fields: [],
    sections: [],
    metadata: { summaryStrip: { enabled: false, metrics: [] } },
  };
  return React.createElement(TableListingTemplate, { pageId, config });
}

// Register the TableListing panel
registerPanel({
  id: TABLE_LISTING_PANEL_TYPE_ID,
  title: 'Table',
  iconName: 'IconTable',
  component: TableListingPanelWrapper,
});

// Re-export for convenience
export { registerPanel, getPanel, getAllPanels, unregisterPanel, clearRegistry } from './registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
export { TableListingTemplate } from '../templates/TableListing/TableListingTemplate';

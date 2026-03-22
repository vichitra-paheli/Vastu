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
import { DataExplorerPanelWrapper } from './DataExplorerPanelWrapper';
import { TableListingTemplate } from '../templates/TableListing/TableListingTemplate';
import { MultiTabDetailTemplate, MULTI_TAB_DETAIL_PANEL_TYPE_ID } from '../templates/MultiTabDetail/MultiTabDetailTemplate';
import { FormPageTemplate } from '../templates/FormPage/FormPageTemplate';
import type { PanelProps } from '../types/panel';

/** Panel type ID for the data explorer template. */
export const DATA_EXPLORER_PANEL_TYPE_ID = 'data-explorer';

/** Panel type ID for the table listing template. */
export const TABLE_LISTING_PANEL_TYPE_ID = 'table-listing';

/** Panel type ID for the form page template. */
export const FORM_PAGE_PANEL_TYPE_ID = 'form-page';

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

/**
 * Adapter that bridges PanelProps (from Dockview) to TableListingTemplate.
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

/**
 * Adapter that bridges PanelProps (from Dockview) to MultiTabDetailTemplate.
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

/**
 * Adapter that bridges PanelProps (from Dockview) to FormPageTemplate.
 */
function FormPagePanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  return React.createElement(FormPageTemplate, { pageId });
}

// Register the FormPage panel (US-133)
registerPanel({
  id: FORM_PAGE_PANEL_TYPE_ID,
  title: 'Form',
  iconName: 'IconForms',
  component: FormPagePanelWrapper,
});

// Re-export for convenience
export { registerPanel, getPanel, getAllPanels, unregisterPanel, clearRegistry } from './registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
export { DataExplorerPanelWrapper } from './DataExplorerPanelWrapper';
export { TableListingTemplate } from '../templates/TableListing/TableListingTemplate';
export {
  MultiTabDetailTemplate,
  MULTI_TAB_DETAIL_PANEL_TYPE_ID,
} from '../templates/MultiTabDetail/MultiTabDetailTemplate';
export { FormPageTemplate, FORM_PAGE_DEFAULT_CONFIG } from '../templates/FormPage/FormPageTemplate';

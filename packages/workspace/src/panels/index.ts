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
import { TimelineActivityPanelWrapper } from './TimelineActivityPanelWrapper';
import {
  SummaryDashboardTemplate,
  SUMMARY_DASHBOARD_PANEL_TYPE,
} from '../templates/SummaryDashboard/SummaryDashboardTemplate';
import {
  DashboardTemplate,
  DASHBOARD_PANEL_TYPE,
} from '../templates/Dashboard/DashboardTemplate';
import { BuilderPanel } from '../components/BuilderPanel';
import type { PanelProps } from '../types/panel';

export const DATA_EXPLORER_PANEL_TYPE_ID = 'data-explorer';
export const TABLE_LISTING_PANEL_TYPE_ID = 'table-listing';
export const FORM_PAGE_PANEL_TYPE_ID = 'form-page';
export const TIMELINE_ACTIVITY_PANEL_TYPE_ID = 'timeline-activity';

registerPanel({ id: WELCOME_PANEL_TYPE_ID, title: 'Welcome', component: WelcomePanel });
registerPanel({ id: DATA_EXPLORER_PANEL_TYPE_ID, title: 'Data Explorer', iconName: 'IconChartBar', component: DataExplorerPanelWrapper });

function TableListingPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  const config = { templateType: 'table-listing' as const, fields: [], sections: [], metadata: { summaryStrip: { enabled: false, metrics: [] } } };
  return React.createElement(TableListingTemplate, { pageId, config });
}
registerPanel({ id: TABLE_LISTING_PANEL_TYPE_ID, title: 'Table', iconName: 'IconTable', component: TableListingPanelWrapper });

function MultiTabDetailPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  return React.createElement(MultiTabDetailTemplate, { pageId });
}
registerPanel({ id: MULTI_TAB_DETAIL_PANEL_TYPE_ID, title: 'Detail', iconName: 'IconLayout2', component: MultiTabDetailPanelWrapper });

function FormPagePanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  return React.createElement(FormPageTemplate, { pageId });
}
registerPanel({ id: FORM_PAGE_PANEL_TYPE_ID, title: 'Form', iconName: 'IconForms', component: FormPagePanelWrapper });

registerPanel({ id: TIMELINE_ACTIVITY_PANEL_TYPE_ID, title: 'Timeline Activity', iconName: 'IconHistory', component: TimelineActivityPanelWrapper });

function SummaryDashboardPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  return React.createElement(SummaryDashboardTemplate, { pageId, config: { templateType: 'summary-dashboard' } });
}
registerPanel({ id: SUMMARY_DASHBOARD_PANEL_TYPE, title: 'Dashboard', iconName: 'IconLayoutDashboard', component: SummaryDashboardPanelWrapper });

function DashboardPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'home';
  return React.createElement(DashboardTemplate, { pageId });
}
registerPanel({ id: DASHBOARD_PANEL_TYPE, title: 'Home Dashboard', iconName: 'IconHome', component: DashboardPanelWrapper });

export const BUILDER_PANEL_TYPE_ID = 'builder';

function BuilderPanelWrapper({ params }: PanelProps) {
  const pageId = typeof params.pageId === 'string' ? params.pageId : 'unknown';
  return React.createElement(BuilderPanel, { pageId });
}
registerPanel({ id: BUILDER_PANEL_TYPE_ID, title: 'Builder', iconName: 'IconSettings', component: BuilderPanelWrapper });

// Re-export for convenience
export { registerPanel, getPanel, getAllPanels, unregisterPanel, clearRegistry } from './registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
export { DataExplorerPanelWrapper } from './DataExplorerPanelWrapper';
export { TableListingTemplate } from '../templates/TableListing/TableListingTemplate';
export { MultiTabDetailTemplate, MULTI_TAB_DETAIL_PANEL_TYPE_ID } from '../templates/MultiTabDetail/MultiTabDetailTemplate';
export { FormPageTemplate, FORM_PAGE_DEFAULT_CONFIG } from '../templates/FormPage/FormPageTemplate';
export { TimelineActivityPanelWrapper } from './TimelineActivityPanelWrapper';
export { SummaryDashboardTemplate, SUMMARY_DASHBOARD_PANEL_TYPE } from '../templates/SummaryDashboard/SummaryDashboardTemplate';
export { DashboardTemplate, DASHBOARD_PANEL_TYPE } from '../templates/Dashboard/DashboardTemplate';
export { BuilderPanel } from '../components/BuilderPanel';

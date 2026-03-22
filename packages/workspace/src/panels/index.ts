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
import { FormPageTemplate } from '../templates/FormPage/FormPageTemplate';
import type { PanelProps } from '../types/panel';

/** Panel type ID for the form page template. */
export const FORM_PAGE_PANEL_TYPE_ID = 'form-page';

// Register the built-in WelcomePanel
registerPanel({
  id: WELCOME_PANEL_TYPE_ID,
  title: 'Welcome',
  component: WelcomePanel,
});

/**
 * Adapter that bridges PanelProps (from Dockview) to FormPageTemplate.
 * Reads pageId from panel params.
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
export { FormPageTemplate, FORM_PAGE_DEFAULT_CONFIG } from '../templates/FormPage/FormPageTemplate';

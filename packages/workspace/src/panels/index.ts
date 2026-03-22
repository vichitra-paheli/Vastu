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
import { TimelineActivityPanelWrapper } from './TimelineActivityPanelWrapper';

/** Panel type ID for the timeline activity template. */
export const TIMELINE_ACTIVITY_PANEL_TYPE_ID = 'timeline-activity';

// Register the built-in WelcomePanel
registerPanel({
  id: WELCOME_PANEL_TYPE_ID,
  title: 'Welcome',
  component: WelcomePanel,
});

// Register the TimelineActivity panel
registerPanel({
  id: TIMELINE_ACTIVITY_PANEL_TYPE_ID,
  title: 'Timeline Activity',
  iconName: 'IconHistory',
  component: TimelineActivityPanelWrapper,
});

// Re-export for convenience
export { registerPanel, getPanel, getAllPanels, unregisterPanel, clearRegistry } from './registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './WelcomePanel';
export { TimelineActivityPanelWrapper } from './TimelineActivityPanelWrapper';

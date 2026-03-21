// Workspace package — Phase 1A
// Activated in US-106: Workspace package activation and layout
// Extended in US-107: Dockview panel host

// Providers
export { WorkspaceProviders } from './providers/WorkspaceProviders';

// Components
export { WorkspaceShell } from './components/WorkspaceShell';
export { DockviewHost } from './components/DockviewHost/DockviewHost';
export { PanelTab } from './components/DockviewHost/PanelTab';
export { DropIndicator } from './components/DockviewHost/DropIndicator';
export { TruncatedText } from './components/TruncatedText';
export { SidebarNav } from './components/SidebarNav';
export type { WorkspaceUser, WorkspaceShellProps } from './components/WorkspaceShell';

// Panel registry and built-in panels
export {
  registerPanel,
  getPanel,
  getAllPanels,
  unregisterPanel,
  clearRegistry,
} from './panels/registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './panels/WelcomePanel';

// Stores
export { useSidebarStore } from './stores/sidebarStore';
export { usePanelStore, openPanelByTypeId } from './stores/panelStore';
export { useTrayStore } from './stores/trayStore';

// Hooks
export { usePanelPersistence, PANEL_LAYOUT_STORAGE_KEY } from './hooks/usePanelPersistence';

// Types
export type {
  Panel,
  PanelId,
  PanelTypeId,
  PanelDefinition,
  PanelParams,
  PanelProps,
  PanelState,
  SerializedLayout,
} from './types/panel';

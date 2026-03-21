// Workspace package — Phase 1A
// Activated in US-106: Workspace package activation and layout
// Updated in US-109: SidebarNav with collapsed/expanded states

// Providers
export { WorkspaceProviders } from './providers/WorkspaceProviders';

// Components
export { WorkspaceShell } from './components/WorkspaceShell';
export type { WorkspaceShellProps, WorkspaceUser } from './components/WorkspaceShell';
export { SidebarNav } from './components/SidebarNav';
export { SidebarSection } from './components/SidebarNav';
export { SidebarItem } from './components/SidebarNav';
export { SidebarSearch } from './components/SidebarNav';
export { SidebarUserAvatar } from './components/SidebarNav';

// Stores
export { useSidebarStore } from './stores/sidebarStore';
export { usePanelStore } from './stores/panelStore';
export { useTrayStore } from './stores/trayStore';

// Types
export type { Panel, PanelId } from './types/panel';

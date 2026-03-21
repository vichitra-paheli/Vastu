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
export { TrayBar, TrayItem } from './components/TrayBar';
export type { TrayItemProps } from './components/TrayBar';
export { ViewToolbar, ViewSelector } from './components/ViewToolbar';
export type { ViewToolbarProps, ViewSelectorProps } from './components/ViewToolbar';
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
export type { TrayItem } from './stores/trayStore';
export { useViewStore } from './stores/viewStore';
export { useViewFilterStore, useViewFilters, useViewMode } from './stores/viewFilterStore';

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

// ModeSwitch
export { ModeSwitch } from './components/ModeSwitch';
export type { ModeSwitchProps } from './components/ModeSwitch';

// ContextMenu
export {
  ContextMenu,
  ContextMenuItem,
  ContextMenuDivider,
  ContextMenuGroup,
} from './components/ContextMenu';
export type { ContextMenuContextData } from './components/ContextMenu/ContextMenu';

// FilterSystem
export {
  FilterBar,
  FilterPill,
  FilterModeSelector,
  FilterInput,
  DimensionPicker,
  CompositeFilterBuilder,
  TextFilterInput,
  NumberFilterInput,
  DateFilterInput,
  EnumFilterInput,
  BooleanFilterInput,
  evaluateCondition,
  evaluateGroup,
  evaluateFilter,
  applyFilters,
  validateRegex,
  createRootGroup,
  createCondition,
  isFilterFlat,
  countConditions,
} from './components/FilterSystem';
export type {
  FilterMode,
  DataType,
  FilterCondition,
  FilterGroup,
  FilterNode,
  FilterValue,
  NumberRangeValue,
  DateRangeValue,
  FilterDimension,
  EnumOption,
  FilterState,
  FilterBarProps,
  FilterPillProps,
  FilterModeSelectorProps,
  FilterInputProps,
  DimensionPickerProps,
  CompositeFilterBuilderProps,
} from './components/FilterSystem';

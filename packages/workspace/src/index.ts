// Workspace package — Phase 1A / Phase 1B
// Activated in US-106: Workspace package activation and layout
// Extended in US-107: Dockview panel host

// Providers
export { WorkspaceProviders } from './providers/WorkspaceProviders';
export { AbilityProvider, useAbility } from './providers/AbilityContext';
export type { AbilityProviderProps } from './providers/AbilityContext';

// Components
export { WorkspaceShell } from './components/WorkspaceShell';
export { DockviewHost } from './components/DockviewHost/DockviewHost';
export { PanelTab } from './components/DockviewHost/PanelTab';
export { DropIndicator } from './components/DockviewHost/DropIndicator';
export { TruncatedText } from './components/TruncatedText';
export { EmptyState } from './components/EmptyState';
export { SidebarNav } from './components/SidebarNav';
export { TrayBar, TrayItem as TrayItemChip } from './components/TrayBar';
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
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export type {
  ShortcutDefinition,
  ShortcutDisplayInfo,
  ShortcutModifier,
  ShortcutGroup,
  RegisteredShortcut,
  UseKeyboardShortcutsReturn,
} from './hooks/useKeyboardShortcuts';

// ShortcutsModal
export { ShortcutsModal } from './components/ShortcutsModal/ShortcutsModal';
export type { ShortcutsModalProps } from './components/ShortcutsModal/ShortcutsModal';

// Types
export type {
  Panel,
  PanelId,
  PanelMode,
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

// ConfirmDialog
export { ConfirmDialog, ConfirmDialogProvider } from './components/ConfirmDialog';
export type {
  ConfirmDialogProps,
  ConfirmDialogVariant,
  ConfirmDialogProviderProps,
} from './components/ConfirmDialog';
export { useConfirmDialog } from './components/ConfirmDialog';
export type { ConfirmOptions } from './components/ConfirmDialog';

// VastuTable
export { VastuTable, VastuTableHeader, VastuTableRow, VastuTableCell, useVastuTable } from './components/VastuTable';
export type {
  VastuColumn,
  VastuTableProps,
  CellDataType,
  HeaderContextData,
  CellContextData,
  DragColumnState,
} from './components/VastuTable';

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

// VastuChart
export { VastuChart, ChartLegend, ChartTooltip, ChartConfigPanel } from './components/VastuChart';
export type { ChartTooltipProps } from './components/VastuChart';
export { CHART_SERIES_COLORS, CHART_OTHER_COLOR, getSeriesColor } from './components/VastuChart';
export type {
  ChartType,
  ScaleType,
  BarOrientation,
  LegendPosition,
  SeriesConfig,
  ChartConfig,
  ChartDataPoint,
  VastuChartProps,
  ReferenceLineConfig,
} from './components/VastuChart';

// CommandPalette
export { CommandPalette, openCommandPalette, CommandPaletteResult } from './components/CommandPalette';
export type { CommandPaletteResultProps } from './components/CommandPalette';

// CommandPalette hooks
export {
  useCommandPaletteActions,
  addRecentRecord,
  RECENT_RECORDS_STORAGE_KEY,
} from './hooks/useCommandPaletteActions';
export type {
  CommandPaletteAction,
  GroupedActions,
  ActionGroup,
  RecentRecord,
} from './hooks/useCommandPaletteActions';

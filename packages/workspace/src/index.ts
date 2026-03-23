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

// Formatter registry (US-205)
export {
  registerFormatter,
  getFormatter,
  getAllFormatters,
  hasFormatter,
  unregisterFormatter,
  clearFormatterRegistry,
  BUILTIN_FORMATTERS,
  registerBuiltinFormatters,
} from './formatters';
export type {
  FormatterDefinition,
  FormatterMeta,
  FormatterRenderContext,
  FormatterSortContext,
  FormatterExportContext,
  FormatterFilterContext,
} from './formatters';

// Panel registry and built-in panels
export {
  registerPanel,
  getPanel,
  getAllPanels,
  unregisterPanel,
  clearRegistry,
} from './panels/registry';
export { WelcomePanel, WELCOME_PANEL_TYPE_ID } from './panels/WelcomePanel';

// Page registry (US-206, restored for US-209)
export {
  registerPage,
  getAllPages,
  getPageById,
  mergeWithDynamic,
  unregisterPage,
  clearPageRegistry,
} from './pages/registry';
export type { PageDefinition, MergedPage, PageSection } from './pages/types';

// Navigation (US-209)
export type { NavigationIntent } from './navigation/types';
export { useNavigateToPage } from './navigation/useNavigateToPage';
export type { UseNavigateToPageReturn } from './navigation/useNavigateToPage';
export { PanelBreadcrumb } from './components/DockviewHost/PanelBreadcrumb';
export type { PanelBreadcrumbProps } from './components/DockviewHost/PanelBreadcrumb';

// Stores
export { useSidebarStore } from './stores/sidebarStore';
export { usePanelStore, openPanelByTypeId } from './stores/panelStore';
export { useTrayStore } from './stores/trayStore';
export type { TrayItem } from './stores/trayStore';
export { useViewStore } from './stores/viewStore';
export { useViewFilterStore, useViewFilters, useViewMode } from './stores/viewFilterStore';
export { useNavigationStore, getNavigationIntent } from './stores/navigationStore';

// Hooks
export { usePanelPersistence, PANEL_LAYOUT_STORAGE_KEY } from './hooks/usePanelPersistence';
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
export { useDrawerToPanel, RECORD_PANEL_TYPE_ID } from './hooks/useDrawerToPanel';
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
  NavigateTo,
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

// RecordDrawer
export { RecordDrawer } from './components/RecordDrawer';
export type { RecordDetail, RecordDrawerProps } from './components/RecordDrawer';
export { DetailsTab, ItemsTab, HistoryTab, NotesTab, PermissionsTab } from './components/RecordDrawer';
export type { HistoryEvent, NoteEntry, PermissionEntry } from './components/RecordDrawer';

// VastuTabs
export { VastuTabs } from './components/VastuTabs';
export type { VastuTabsProps, TabDefinition } from './components/VastuTabs';

// drawerStore
export { useDrawerStore } from './stores/drawerStore';
export type { DrawerTab, DrawerNavigationEntry } from './stores/drawerStore';

// CommandPalette
export { CommandPalette, openCommandPalette } from './components/CommandPalette';

// SSE hook, provider, and status indicator (US-207)
export { useWorkspaceEvents } from './hooks/useWorkspaceEvents';
export type { SSEConnectionState, WorkspaceEventCallback } from './hooks/useWorkspaceEvents';
export { SSEProvider, useSSEContext } from './providers/SSEProvider';
export { SSEStatusIndicator } from './components/SSEStatusIndicator';
export type { SSEStatusIndicatorProps } from './components/SSEStatusIndicator';

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

// DataExplorer template
export {
  DataExplorerTemplate,
  DataExplorerPanel,
  ExplorerControls,
  ChartTypeToggle,
} from './templates/DataExplorer';
export type {
  ChartTypeToggleProps,
  ExplorerControlsProps,
  ExplorerChartMode,
  DimensionOption,
  MeasureOption,
  DataExplorerMetadata,
  ExplorerDataRow,
} from './templates/DataExplorer';

// TableListingTemplate (US-129)
export { TableListingTemplate } from './templates/TableListing/TableListingTemplate';
export type {
  TableListingMetadata,
  SummaryStripConfig,
} from './templates/TableListing/TableListingTemplate';
export { KPISummaryStrip } from './templates/TableListing/KPISummaryStrip';
export type { KPIMetric, KPISummaryStripProps } from './templates/TableListing/KPISummaryStrip';

// KPICard (US-129b)
export { KPICard } from './components/KPICard/KPICard';
export type { KPICardProps, KPICardSparklineData } from './components/KPICard/KPICard';

// MultiTabDetail Template (US-131)
export {
  MultiTabDetailTemplate,
  MULTI_TAB_DETAIL_PANEL_TYPE_ID,
} from './templates/MultiTabDetail/MultiTabDetailTemplate';
export type {
  MultiTabDetailTemplateProps,
  MultiTabDetailTab,
  EntityData,
} from './templates/MultiTabDetail/MultiTabDetailTemplate';
export { EntityHeader } from './templates/MultiTabDetail/EntityHeader';
export type {
  EntityHeaderProps,
  EntityAction,
} from './templates/MultiTabDetail/EntityHeader';
export { OverviewTab } from './templates/MultiTabDetail/tabs/OverviewTab';
export type {
  OverviewTabProps,
  OverviewField,
  SubTableConfig,
  ActivityEntry,
} from './templates/MultiTabDetail/tabs/OverviewTab';

// FormPage Template (US-133)
export { FormPageTemplate, FieldRenderer, FORM_PAGE_DEFAULT_CONFIG } from './templates/FormPage/FormPageTemplate';
export type { FormPageTemplateProps, FormFieldConfig } from './templates/FormPage/FormPageTemplate';
export { FormWizard } from './templates/FormPage/FormWizard';
export type { FormWizardProps, WizardStep } from './templates/FormPage/FormWizard';
export { SearchOrCreate } from './templates/FormPage/SearchOrCreate';
export type { SearchOrCreateProps, SearchOrCreateOption } from './templates/FormPage/SearchOrCreate';
export { useFormDraft } from './templates/FormPage/useFormDraft';
export type { UseFormDraftResult } from './templates/FormPage/useFormDraft';

// TimelineActivity template
export { TimelineActivityTemplate } from './templates/TimelineActivity/TimelineActivityTemplate';
export { TimelineEvent } from './templates/TimelineActivity/TimelineEvent';
export type {
  TimelineEventData,
  TimelineEventType,
  TimelineEventProps,
} from './templates/TimelineActivity/TimelineEvent';
export { TimelineFilters, createDefaultFilterState } from './templates/TimelineActivity/TimelineFilters';
export type {
  TimelineFilterState,
  TimelineFiltersProps,
} from './templates/TimelineActivity/TimelineFilters';
export { DateGroupHeader, formatDateGroupLabel, toIsoDateString } from './templates/TimelineActivity/DateGroupHeader';
export type { DateGroupHeaderProps } from './templates/TimelineActivity/DateGroupHeader';

// TimelineActivity panel
export { TimelineActivityPanelWrapper, TIMELINE_ACTIVITY_PANEL_TYPE_ID } from './panels/index';

// BuilderPanel (US-136)
export { BuilderPanel } from './components/BuilderPanel';
export type { BuilderPanelProps } from './components/BuilderPanel';
export { BuilderWarningHeader } from './components/BuilderPanel';
export type { BuilderWarningHeaderProps } from './components/BuilderPanel';
export { useBuilderStore } from './stores/builderStore';
export type { BuilderSection } from './stores/builderStore';
export { BUILDER_PANEL_TYPE_ID } from './panels/index';

// SummaryDashboard Template (US-130)
export { SummaryDashboardTemplate, SUMMARY_DASHBOARD_PANEL_TYPE } from './templates/SummaryDashboard/SummaryDashboardTemplate';
export { KPICardRow } from './templates/SummaryDashboard/KPICardRow';
export type { KPICardConfig, KPICardRowProps } from './templates/SummaryDashboard/KPICardRow';
export { ChartRow } from './templates/SummaryDashboard/ChartRow';
export type { ChartDefinition, ChartRowProps } from './templates/SummaryDashboard/ChartRow';
export { MiniSummaryTable } from './templates/SummaryDashboard/MiniSummaryTable';
export type { MiniTableColumn, MiniSummaryTableProps } from './templates/SummaryDashboard/MiniSummaryTable';
export { TimeRangeControl } from './templates/SummaryDashboard/TimeRangeControl';
export type { TimeRange, TimeRangePreset, TimeRangeControlProps } from './templates/SummaryDashboard/TimeRangeControl';

// Dashboard Template (US-137)
export {
  DashboardTemplate,
  DASHBOARD_PANEL_TYPE,
} from './templates/Dashboard';
export type { DashboardTemplateProps } from './templates/Dashboard';
export { DashboardGreeting } from './templates/Dashboard';
export type { DashboardGreetingProps } from './templates/Dashboard';
export { DashboardCard } from './templates/Dashboard';
export type { DashboardCardProps } from './templates/Dashboard';
export { EditGridModeBanner } from './templates/Dashboard';
export type { EditGridModeBannerProps } from './templates/Dashboard';
export { AddCardDialog } from './templates/Dashboard';
export type { AddCardDialogProps } from './templates/Dashboard';
export { PinToDashboardDialog } from './templates/Dashboard';
export type { PinToDashboardDialogProps, PinConfig } from './templates/Dashboard';
export {
  DashboardKPICard,
  DashboardChartCard,
  DashboardTableCard,
  DashboardPipelineCard,
  DashboardQuickActionsCard,
  DashboardAlertCard,
} from './templates/Dashboard';

// dashboardStore (US-137)
export { useDashboardStore, serializeDashboardState, deserializeDashboardState } from './stores/dashboardStore';
export type {
  DashboardCard as DashboardCardDef,
  DashboardCardType,
  CardSize,
  DashboardCardBase,
  KPICardDef,
  ChartCardDef,
  TableCardDef,
  PipelineCardDef,
  QuickActionsCardDef,
  AlertCardDef,
  DashboardChartDataPoint,
} from './stores/dashboardStore';

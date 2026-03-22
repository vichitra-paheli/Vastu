# Phase 1B: Page Templates + Builder Mode -- Todo

> Created: 2026-03-21
> Status: IN PROGRESS
> Total: 19 features + 1 infra task, 67 subtasks
> User stories: US-120 through US-138

---

## Feature Dependency Graph

```
Wave 0 (prerequisites -- blocking everything, all independent within wave):
  US-120  Mode switch rebuild          [#166]  INDEPENDENT
  US-121  View engine fixes            [#167]  INDEPENDENT
  US-122  Filter system fixes          [#168]  INDEPENDENT
  US-123  Context menu fixes           [#169]  INDEPENDENT
  US-124  Design system compliance     [#170]  INDEPENDENT

Wave 1 (infrastructure -- after Wave 0 merges to main):
  US-138  Confirmation dialog system   [#171]  DEPENDS ON: Wave 0 merged to main
  US-135  VastuChart wrapper           [#172]  DEPENDS ON: Wave 0 merged to main
  US-125  Command palette              [#173]  DEPENDS ON: Wave 0 merged to main
  US-126  Global keyboard shortcuts    [#174]  DEPENDS ON: Wave 0 merged to main

Wave 2 (core features -- after Wave 1 merges to main):
  US-128  Record detail drawer         [#175]  DEPENDS ON: Wave 1 merged to main (needs ConfirmDialog)
  INFRA   Template infrastructure      [#222]  DEPENDS ON: Wave 0 merged to main (can start with Wave 1)

Wave 3 (templates -- after US-128 + INFRA + US-135 merge to main, all parallelizable):
  US-129  Table listing template       [#176]  DEPENDS ON: INFRA, US-128 merged to main
  US-130  Summary dashboard template   [#177]  DEPENDS ON: INFRA, US-135 merged to main
  US-131  Multi-tab detail template    [#178]  DEPENDS ON: INFRA, US-128 (VastuTabs) merged to main
  US-132  Data explorer template       [#179]  DEPENDS ON: INFRA, US-135 merged to main
  US-133  Form page template           [#180]  DEPENDS ON: INFRA merged to main
  US-134  Timeline/activity template   [#181]  DEPENDS ON: INFRA merged to main

Wave 4 (builder + dashboard -- after at least one template merges to main):
  US-136  Builder mode config panel    [#182]  DEPENDS ON: US-120, INFRA merged to main
  US-137  Dashboard view (pinned cards)[#183]  DEPENDS ON: INFRA, US-135 merged to main

Wave 5 (E2E testing -- after all features merge to main):
  US-127  Workspace E2E tests          [#184]  DEPENDS ON: all above merged to main
```

**Critical path:** Wave 0 -> Wave 1 (US-135, US-138) -> Wave 2 (US-128, INFRA) -> Wave 3 (templates) -> Wave 4 -> Wave 5

**Maximum parallelism plan:**
1. Start Wave 0: all 5 bug fixes in parallel
2. After Wave 0 merges: start Wave 1 (4 features in parallel) + INFRA
3. After Wave 1 merges + INFRA ready: start US-128
4. After US-128 + INFRA + US-135 merge: start Wave 3 (6 templates in parallel)
5. After templates available: start Wave 4 (US-136, US-137 in parallel)
6. After all merge: start Wave 5 (US-127 E2E)

---

## Features and Tasks

### VASTU-1B-120: Mode switch rebuild [WAVE 0 - INDEPENDENT] -- #166
Branch: `feature/VASTU-1B-120-mode-switch-rebuild`
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~390 lines
Closes: #136

- [ ] VASTU-1B-120a: Rewrite ModeSwitch component for Editor/Builder/Workflow modes (workspace, M) [no deps] -- #185
  - Files: `ModeSwitch.tsx`, `ModeSwitch.module.css`, `types/panel.ts`
- [ ] VASTU-1B-120b: Add panelModes to panelStore and wire to PanelTab (workspace, S) [deps: 120a] -- #186
  - Files: `stores/panelStore.ts`, `DockviewHost/PanelTab.tsx`
- [ ] VASTU-1B-120c: ModeSwitch unit and component tests (workspace, M) [deps: 120a, 120b] -- #187
  - Files: `ModeSwitch/__tests__/ModeSwitch.test.tsx`

---

### VASTU-1B-121: View engine fixes [WAVE 0 - INDEPENDENT] -- #167
Branch: `feature/VASTU-1B-121-view-engine-fixes`
Package: workspace, shared | Agent: dev-engineer + design-engineer | Est: ~240 lines
Closes: #124, #125, #126, #141, #142, #143, #144

- [ ] VASTU-1B-121a: Fix ViewState shape and viewStore saveView/resetView (shared+workspace, S) [no deps] -- #188
  - Files: `shared/types/view.ts`, `stores/viewStore.ts`
- [ ] VASTU-1B-121b: Fix ViewToolbar wiring, modified indicator, reset button (workspace, S) [deps: 121a] -- #189
  - Files: `ViewToolbar/ViewToolbar.tsx`, `ViewToolbar.module.css`, `WorkspaceShell.tsx`
- [ ] VASTU-1B-121c: Add view delete confirmation dialog in ViewSelector (workspace, S) [deps: 121a] -- #190
  - Files: `ViewToolbar/ViewSelector.tsx`
- [ ] VASTU-1B-121d: View engine fix tests (workspace, M) [deps: 121a, 121b, 121c] -- #191
  - Files: `stores/__tests__/viewStore.test.ts`, `ViewToolbar/__tests__/ViewToolbar.test.tsx`

---

### VASTU-1B-122: Filter system fixes [WAVE 0 - INDEPENDENT] -- #168
Branch: `feature/VASTU-1B-122-filter-system-fixes`
Package: workspace, shared | Agent: dev-engineer | Est: ~145 lines
Closes: #123, #138, #160

- [ ] VASTU-1B-122a: Align FilterNode type to Patterns Library spec + runtime normalization (shared+workspace, M) [no deps] -- #192
  - Files: `shared/types/view.ts`, `stores/viewStore.ts`, `FilterSystem/types.ts`
- [ ] VASTU-1B-122b: Fix FilterBar mode propagation and context menu include/exclude (workspace, S) [deps: 122a] -- #193
  - Files: `FilterSystem/FilterBar.tsx`, `VastuTable/VastuTable.tsx`
- [ ] VASTU-1B-122c: Update all filter tests for corrected FilterNode schema (workspace, M) [deps: 122a, 122b] -- #194
  - Files: `FilterSystem/__tests__/FilterBar.test.tsx`, `FilterSystem/__tests__/FilterPill.test.tsx`, `stores/__tests__/viewStore.test.ts`

---

### VASTU-1B-123: Context menu fixes [WAVE 0 - INDEPENDENT] -- #169
Branch: `feature/VASTU-1B-123-context-menu-fixes`
Package: workspace | Agent: dev-engineer | Est: ~30 lines
Closes: #139, #140

- [ ] VASTU-1B-123a: Verify and fix context menu ARIA role and TruncatedText usage (workspace, S) [no deps] -- #195
  - Files: `ContextMenu/ContextMenu.tsx`, `ContextMenu/ContextMenuItem.tsx`, `ContextMenu/__tests__/ContextMenu.test.tsx`

---

### VASTU-1B-124: Design system compliance sweep [WAVE 0 - INDEPENDENT] -- #170
Branch: `feature/VASTU-1B-124-design-system-sweep`
Package: workspace | Agent: design-engineer | Est: ~265 lines
Closes: #114, #115, #161

- [ ] VASTU-1B-124a: Create EmptyState shared component (workspace, M) [no deps] -- #196
  - Files: `EmptyState/EmptyState.tsx`, `EmptyState/EmptyState.module.css`, `EmptyState/__tests__/EmptyState.test.tsx`
- [ ] VASTU-1B-124b: Fix SidebarUserAvatar token and SidebarItem TruncatedText (workspace, S) [no deps, parallel with 124a] -- #197
  - Files: `SidebarNav/SidebarUserAvatar.tsx`, `SidebarNav/SidebarItem.tsx`
- [ ] VASTU-1B-124c: Replace VastuTable inline empty state with EmptyState component (workspace, S) [deps: 124a] -- #198
  - Files: `VastuTable/VastuTable.tsx`
- [ ] VASTU-1B-124d: Design system audit: hex values, font weights, aria-labels (workspace, S) [no deps, parallel with 124a] -- #199
  - Files: All `.tsx` and `.css` files in workspace (audit + fix)

---

### VASTU-1B-138: Confirmation dialog system [WAVE 1 - DEPENDS ON: Wave 0 merged to main] -- #171
Branch: `feature/VASTU-1B-138-confirm-dialog` (branch from main AFTER Wave 0 merges)
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~320 lines

- [ ] VASTU-1B-138a: Create ConfirmDialog component with three variants (workspace, M) [no deps] -- #200
  - Files: `ConfirmDialog/ConfirmDialog.tsx`, `ConfirmDialog/ConfirmDialog.module.css`
- [ ] VASTU-1B-138b: Create useConfirmDialog hook for imperative usage (workspace, M) [deps: 138a] -- #201
  - Files: `ConfirmDialog/useConfirmDialog.ts`, `WorkspaceShell.tsx`
- [ ] VASTU-1B-138c: ConfirmDialog tests (workspace, M) [deps: 138a, 138b] -- #202
  - Files: `ConfirmDialog/__tests__/ConfirmDialog.test.tsx`

---

### VASTU-1B-135: VastuChart wrapper [WAVE 1 - DEPENDS ON: Wave 0 merged to main] -- #172
Branch: `feature/VASTU-1B-135-vastu-chart` (branch from main AFTER Wave 0 merges)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~1370 lines

- [ ] VASTU-1B-135a: VastuChart types, color palette, and base component setup (workspace, M) [no deps] -- #203
  - Files: `VastuChart/types.ts`, `VastuChart/chartColors.ts`, `VastuChart/VastuChart.tsx`, `VastuChart/VastuChart.module.css`, `package.json`
- [ ] VASTU-1B-135b: VastuChart chart type renderers (line, bar, area, donut, sparkline, scatter) (workspace, L) [deps: 135a] -- #204
  - Files: `VastuChart/VastuChart.tsx`
- [ ] VASTU-1B-135c: ChartTooltip and ChartLegend custom components (workspace, M) [deps: 135a] -- #205
  - Files: `VastuChart/ChartTooltip.tsx`, `VastuChart/ChartLegend.tsx`
- [ ] VASTU-1B-135d: ChartConfigPanel collapsible configuration (workspace, L) [deps: 135a] -- #206
  - Files: `VastuChart/ChartConfigPanel.tsx`
- [ ] VASTU-1B-135e: VastuChart tests (workspace, L) [deps: 135b, 135c, 135d] -- #207
  - Files: `VastuChart/__tests__/VastuChart.test.tsx`, `VastuChart/__tests__/ChartLegend.test.tsx`

---

### VASTU-1B-125: Command palette [WAVE 1 - DEPENDS ON: Wave 0 merged to main] -- #173
Branch: `feature/VASTU-1B-125-command-palette` (branch from main AFTER Wave 0 merges)
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~530 lines
Continues: #93

- [ ] VASTU-1B-125a: CommandPalette with Mantine Spotlight integration (workspace, M) [no deps] -- #208
  - Files: `CommandPalette/CommandPalette.tsx`, `CommandPalette/CommandPalette.module.css`, `WorkspaceShell.tsx`, `package.json`
- [ ] VASTU-1B-125b: CommandPaletteResult rendering and useCommandPaletteActions hook (workspace, M) [deps: 125a] -- #209
  - Files: `CommandPalette/CommandPaletteResult.tsx`, `hooks/useCommandPaletteActions.ts`, `TrayBar/TrayBar.tsx`
- [ ] VASTU-1B-125c: CommandPalette keyboard navigation and tests (workspace, M) [deps: 125a, 125b] -- #210
  - Files: `CommandPalette/__tests__/CommandPalette.test.tsx`

---

### VASTU-1B-126: Global keyboard shortcuts [WAVE 1 - DEPENDS ON: Wave 0 merged to main] -- #174
Branch: `feature/VASTU-1B-126-keyboard-shortcuts` (branch from main AFTER Wave 0 merges)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~650 lines
Continues: #94

- [ ] VASTU-1B-126a: Create useKeyboardShortcuts hook with global registrations (workspace, M) [no deps] -- #211
  - Files: `hooks/useKeyboardShortcuts.ts`, `WorkspaceShell.tsx`
- [ ] VASTU-1B-126b: Create ShortcutsModal reference overlay (workspace, M) [deps: 126a] -- #212
  - Files: `ShortcutsModal/ShortcutsModal.tsx`, `ShortcutsModal/ShortcutsModal.module.css`
- [ ] VASTU-1B-126c: Table-specific keyboard shortcuts and focus management (workspace, S) [deps: 126a] -- #213
  - Files: `VastuTable/VastuTable.tsx`
- [ ] VASTU-1B-126d: Keyboard shortcuts tests (workspace, M) [deps: 126a, 126b, 126c] -- #214
  - Files: `hooks/__tests__/useKeyboardShortcuts.test.ts`, `ShortcutsModal/__tests__/ShortcutsModal.test.tsx`

---

### VASTU-1B-128: Record detail drawer [WAVE 2 - DEPENDS ON: Wave 1 merged to main] -- #175
Branch: `feature/VASTU-1B-128-record-drawer` (branch from main AFTER Wave 1 merges)
Package: workspace, shell | Agent: dev-engineer + design-engineer | Est: ~1540 lines

- [ ] VASTU-1B-128a: Create drawerStore and RecordDrawer shell with slide animation (workspace, M) [no deps] -- #215
  - Files: `stores/drawerStore.ts`, `RecordDrawer/RecordDrawer.tsx`, `RecordDrawer/RecordDrawer.module.css`
- [ ] VASTU-1B-128b: RecordDrawerHeader with navigation and actions (workspace, M) [deps: 128a] -- #216
  - Files: `RecordDrawer/RecordDrawerHeader.tsx`
- [ ] VASTU-1B-128c: RecordDrawer tabs: Details and Items + VastuTabs wrapper (workspace, L) [deps: 128a] -- #217
  - Files: `RecordDrawer/tabs/DetailsTab.tsx`, `RecordDrawer/tabs/ItemsTab.tsx`, `VastuTabs/VastuTabs.tsx`
- [ ] VASTU-1B-128d: RecordDrawer tabs: History, Notes, Permissions (workspace, L) [deps: 128a] -- #218
  - Files: `RecordDrawer/tabs/HistoryTab.tsx`, `RecordDrawer/tabs/NotesTab.tsx`, `RecordDrawer/tabs/PermissionsTab.tsx`
- [ ] VASTU-1B-128e: RecordDrawerFooter and drawer-to-panel promotion (workspace, M) [deps: 128a, 128b] -- #219
  - Files: `RecordDrawer/RecordDrawerFooter.tsx`, `hooks/useDrawerToPanel.ts`
- [ ] VASTU-1B-128f: Record API routes (CRUD, history, notes) (shell, M) [no deps, parallel with 128a] -- #220
  - Files: `api/workspace/records/[id]/route.ts`, `api/workspace/records/[id]/history/route.ts`, `api/workspace/records/[id]/notes/route.ts`
- [ ] VASTU-1B-128g: RecordDrawer tests (workspace, L) [deps: 128b, 128c, 128d, 128e] -- #221
  - Files: `RecordDrawer/__tests__/RecordDrawer.test.tsx`, `VastuTabs/__tests__/VastuTabs.test.tsx`

---

### VASTU-1B-INFRA: Template infrastructure [WAVE 2 - DEPENDS ON: Wave 0 merged to main] -- #222
Branch: `feature/VASTU-1B-INFRA-template-infra` (branch from main AFTER Wave 0 merges, can start with Wave 1)
Package: workspace, shared, shell | Agent: dev-engineer | Est: ~410 lines

- [ ] VASTU-1B-INFRA: Template types, registry, useTemplateConfig hook, TemplateSkeleton, PageConfiguration migration, API route
  - Files: `templates/types.ts`, `templates/registry.ts`, `templates/useTemplateConfig.ts`, `templates/TemplateSkeleton.tsx`, `schema.prisma`, `shared/types/page.ts`, `api/workspace/pages/[id]/config/route.ts`

---

### VASTU-1B-129: Table listing template [WAVE 3 - DEPENDS ON: INFRA, US-128 merged to main] -- #176
Branch: `feature/VASTU-1B-129-table-listing` (branch from main AFTER INFRA + US-128 merge)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~620 lines

- [ ] VASTU-1B-129a: TableListingTemplate with VastuTable integration and panel registration (workspace, L) [no deps] -- #223
  - Files: `templates/TableListing/TableListingTemplate.tsx`, `TableListingTemplate.module.css`, `panels/index.ts`
- [ ] VASTU-1B-129b: KPISummaryStrip component + shared KPICard (workspace, M) [no deps, parallel with 129a] -- #224
  - Files: `templates/TableListing/KPISummaryStrip.tsx`, `components/KPICard/KPICard.tsx`
- [ ] VASTU-1B-129c: TableListingTemplate tests (workspace, M) [deps: 129a, 129b] -- #225
  - Files: `templates/TableListing/__tests__/TableListingTemplate.test.tsx`

---

### VASTU-1B-130: Summary dashboard template [WAVE 3 - DEPENDS ON: INFRA, US-135 merged to main] -- #177
Branch: `feature/VASTU-1B-130-summary-dashboard` (branch from main AFTER INFRA + US-135 merge)
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~850 lines

- [ ] VASTU-1B-130a: SummaryDashboardTemplate with time range and KPI cards (workspace, L) [no deps] -- #226
  - Files: `templates/SummaryDashboard/SummaryDashboardTemplate.tsx`, `.module.css`, `TimeRangeControl.tsx`, `KPICardRow.tsx`, `panels/index.ts`
- [ ] VASTU-1B-130b: ChartRow and MiniSummaryTable (workspace, M) [deps: 130a] -- #227
  - Files: `templates/SummaryDashboard/ChartRow.tsx`, `MiniSummaryTable.tsx`
- [ ] VASTU-1B-130c: SummaryDashboardTemplate tests (workspace, M) [deps: 130a, 130b] -- #228
  - Files: `templates/SummaryDashboard/__tests__/SummaryDashboardTemplate.test.tsx`

---

### VASTU-1B-131: Multi-tab detail template [WAVE 3 - DEPENDS ON: INFRA, US-128 merged to main] -- #178
Branch: `feature/VASTU-1B-131-multi-tab-detail` (branch from main AFTER INFRA + US-128 merge)
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~900 lines

- [ ] VASTU-1B-131a: MultiTabDetailTemplate with EntityHeader and VastuTabs (workspace, L) [no deps] -- #229
  - Files: `templates/MultiTabDetail/MultiTabDetailTemplate.tsx`, `.module.css`, `EntityHeader.tsx`, `panels/index.ts`
- [ ] VASTU-1B-131b: MultiTabDetail tab content: Overview, sub-tables, Activity (workspace, M) [deps: 131a] -- #230
  - Files: `templates/MultiTabDetail/tabs/OverviewTab.tsx`
- [ ] VASTU-1B-131c: MultiTabDetailTemplate tests (workspace, M) [deps: 131a, 131b] -- #231
  - Files: `templates/MultiTabDetail/__tests__/MultiTabDetailTemplate.test.tsx`

---

### VASTU-1B-132: Data explorer template [WAVE 3 - DEPENDS ON: INFRA, US-135 merged to main] -- #179
Branch: `feature/VASTU-1B-132-data-explorer` (branch from main AFTER INFRA + US-135 merge)
Package: workspace | Agent: dev-engineer | Est: ~700 lines

- [ ] VASTU-1B-132a: DataExplorerTemplate with controls and chart (workspace, L) [no deps] -- #232
  - Files: `templates/DataExplorer/DataExplorerTemplate.tsx`, `.module.css`, `ExplorerControls.tsx`, `ChartTypeToggle.tsx`, `panels/index.ts`
- [ ] VASTU-1B-132b: Data explorer companion table and export (workspace, M) [deps: 132a] -- #233
  - Files: `templates/DataExplorer/DataExplorerTemplate.tsx`
- [ ] VASTU-1B-132c: DataExplorerTemplate tests (workspace, M) [deps: 132a, 132b] -- #234
  - Files: `templates/DataExplorer/__tests__/DataExplorerTemplate.test.tsx`

---

### VASTU-1B-133: Form page template [WAVE 3 - DEPENDS ON: INFRA merged to main] -- #180
Branch: `feature/VASTU-1B-133-form-page` (branch from main AFTER INFRA merges)
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~1000 lines

- [ ] VASTU-1B-133a: FormPageTemplate single-page mode with validation (workspace, L) [no deps] -- #235
  - Files: `templates/FormPage/FormPageTemplate.tsx`, `FormPageTemplate.module.css`, `panels/index.ts`
- [ ] VASTU-1B-133b: FormWizard multi-step mode with stepper (workspace, L) [deps: 133a] -- #236
  - Files: `templates/FormPage/FormWizard.tsx`, `templates/FormPage/SearchOrCreate.tsx`
- [ ] VASTU-1B-133c: Form auto-save draft and dirty state detection (workspace, M) [deps: 133a] -- #237
  - Files: `templates/FormPage/useFormDraft.ts`
- [ ] VASTU-1B-133d: FormPageTemplate tests (workspace, M) [deps: 133a, 133b, 133c] -- #238
  - Files: `templates/FormPage/__tests__/FormPageTemplate.test.tsx`

---

### VASTU-1B-134: Timeline/activity template [WAVE 3 - DEPENDS ON: INFRA merged to main] -- #181
Branch: `feature/VASTU-1B-134-timeline-activity` (branch from main AFTER INFRA merges)
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~760 lines

- [ ] VASTU-1B-134a: TimelineActivityTemplate with event stream and date grouping (workspace, L) [no deps] -- #239
  - Files: `templates/TimelineActivity/TimelineActivityTemplate.tsx`, `.module.css`, `TimelineEvent.tsx`, `DateGroupHeader.tsx`, `panels/index.ts`
- [ ] VASTU-1B-134b: TimelineFilters and view toolbar integration (workspace, M) [deps: 134a] -- #240
  - Files: `templates/TimelineActivity/TimelineFilters.tsx`
- [ ] VASTU-1B-134c: TimelineActivityTemplate tests (workspace, M) [deps: 134a, 134b] -- #241
  - Files: `templates/TimelineActivity/__tests__/TimelineActivityTemplate.test.tsx`

---

### VASTU-1B-136: Builder mode config panel [WAVE 4 - DEPENDS ON: US-120, INFRA merged to main] -- #182
Branch: `feature/VASTU-1B-136-builder-mode` (branch from main AFTER US-120 + INFRA merge)
Package: workspace, shared, shell | Agent: dev-engineer + design-engineer | Est: ~2310 lines

- [ ] VASTU-1B-136a: BuilderPanel shell, warning header, section navigation, and builderStore (workspace, M) [no deps] -- #242
  - Files: `BuilderPanel/BuilderPanel.tsx`, `.module.css`, `BuilderWarningHeader.tsx`, `stores/builderStore.ts`
- [ ] VASTU-1B-136b: Builder DataSource and FieldConfig sections (workspace, L) [deps: 136a] -- #243
  - Files: `BuilderPanel/sections/DataSourceSection.tsx`, `FieldConfigSection.tsx`
- [ ] VASTU-1B-136c: Builder Sections, DefaultView, Permissions, and Hooks sections (workspace, L) [deps: 136a] -- #244
  - Files: `BuilderPanel/sections/SectionsLayoutSection.tsx`, `DefaultViewSection.tsx`, `PermissionsSection.tsx`, `HooksSection.tsx`
- [ ] VASTU-1B-136d: Builder PageMetadata, EphemeralToggle sections and API route (workspace+shell, M) [deps: 136a] -- #245
  - Files: `BuilderPanel/sections/PageMetadataSection.tsx`, `EphemeralToggleSection.tsx`, `api/workspace/pages/[id]/config/route.ts`
- [ ] VASTU-1B-136e: BuilderPanel tests (workspace, L) [deps: 136a, 136b, 136c, 136d] -- #246
  - Files: `BuilderPanel/__tests__/BuilderPanel.test.tsx`

---

### VASTU-1B-137: Dashboard view (pinned cards) [WAVE 4 - DEPENDS ON: INFRA, US-135 merged to main] -- #183
Branch: `feature/VASTU-1B-137-dashboard-view` (branch from main AFTER INFRA + US-135 merge)
Package: workspace | Agent: design-engineer + dev-engineer | Est: ~2060 lines

- [ ] VASTU-1B-137a: DashboardTemplate with greeting header and card grid (workspace, L) [no deps] -- #247
  - Files: `templates/Dashboard/DashboardTemplate.tsx`, `.module.css`, `DashboardGreeting.tsx`, `DashboardCard.tsx`, `stores/dashboardStore.ts`, `panels/index.ts`
- [ ] VASTU-1B-137b: Dashboard card types (KPI, Chart, Table, Pipeline, QuickActions, Alert) (workspace, L) [deps: 137a] -- #248
  - Files: `templates/Dashboard/cards/KPICard.tsx`, `ChartCard.tsx`, `TableCard.tsx`, `PipelineCard.tsx`, `QuickActionsCard.tsx`, `AlertCard.tsx`
- [ ] VASTU-1B-137c: Dashboard EditGridMode and AddCardDialog (workspace, L) [deps: 137a, 137b] -- #249
  - Files: `templates/Dashboard/EditGridMode.tsx`, `AddCardDialog.tsx`
- [ ] VASTU-1B-137d: PinToDashboardDialog and dashboard tests (workspace, L) [deps: 137a, 137b, 137c] -- #250
  - Files: `templates/Dashboard/PinToDashboardDialog.tsx`, `__tests__/DashboardTemplate.test.tsx`

---

### VASTU-1B-127: Workspace E2E tests [WAVE 5 - DEPENDS ON: all above merged to main] -- #184
Branch: `feature/VASTU-1B-127-e2e-tests` (branch from main AFTER all features merge)
Package: workspace | Agent: qa-engineer | Est: ~830 lines

- [ ] VASTU-1B-127a: E2E fixtures: page objects and seed data (workspace, M) [no deps] -- #251
  - Files: `e2e/fixtures/workspace-page.ts`, `e2e/fixtures/seed-data.ts`
- [ ] VASTU-1B-127b: E2E: workspace load, sidebar, panels, tray (workspace, L) [deps: 127a] -- #252
  - Files: `e2e/workspace.spec.ts`
- [ ] VASTU-1B-127c: E2E: command palette and mode switch (workspace, M) [deps: 127a] -- #253
  - Files: `e2e/command-palette.spec.ts`, `e2e/mode-switch.spec.ts`
- [ ] VASTU-1B-127d: E2E: table interactions and view save/load (workspace, M) [deps: 127a] -- #254
  - Files: `e2e/table-interactions.spec.ts`

---

## Implementation Sequence

### Wave 0: Phase 1A Bug Fixes (all parallel, start immediately)

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-120 Mode switch rebuild | `feature/VASTU-1B-120-mode-switch-rebuild` | design + dev | ~390 |
| US-121 View engine fixes | `feature/VASTU-1B-121-view-engine-fixes` | dev + design | ~240 |
| US-122 Filter system fixes | `feature/VASTU-1B-122-filter-system-fixes` | dev | ~145 |
| US-123 Context menu fixes | `feature/VASTU-1B-123-context-menu-fixes` | dev | ~30 |
| US-124 Design system sweep | `feature/VASTU-1B-124-design-system-sweep` | design | ~265 |

### Wave 1: Infrastructure (after Wave 0 merges to main)

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-138 Confirmation dialog | `feature/VASTU-1B-138-confirm-dialog` | design + dev | ~320 |
| US-135 VastuChart | `feature/VASTU-1B-135-vastu-chart` | dev + design | ~1370 |
| US-125 Command palette | `feature/VASTU-1B-125-command-palette` | design + dev | ~530 |
| US-126 Keyboard shortcuts | `feature/VASTU-1B-126-keyboard-shortcuts` | dev + design | ~650 |

### Wave 2: Core Features (after Wave 1 merges, INFRA can start with Wave 1)

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-128 Record drawer | `feature/VASTU-1B-128-record-drawer` | dev + design | ~1540 |
| INFRA Template infra | `feature/VASTU-1B-INFRA-template-infra` | dev | ~410 |

### Wave 3: Templates (after US-128, INFRA, US-135 merge, all parallel)

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-129 Table listing | `feature/VASTU-1B-129-table-listing` | dev + design | ~620 |
| US-130 Summary dashboard | `feature/VASTU-1B-130-summary-dashboard` | design + dev | ~850 |
| US-131 Multi-tab detail | `feature/VASTU-1B-131-multi-tab-detail` | design + dev | ~900 |
| US-132 Data explorer | `feature/VASTU-1B-132-data-explorer` | dev | ~700 |
| US-133 Form page | `feature/VASTU-1B-133-form-page` | design + dev | ~1000 |
| US-134 Timeline activity | `feature/VASTU-1B-134-timeline-activity` | design + dev | ~760 |

### Wave 4: Builder + Dashboard (after templates available)

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-136 Builder mode | `feature/VASTU-1B-136-builder-mode` | dev + design | ~2310 |
| US-137 Dashboard view | `feature/VASTU-1B-137-dashboard-view` | design + dev | ~2060 |

### Wave 5: E2E Testing (after all features)

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-127 E2E tests | `feature/VASTU-1B-127-e2e-tests` | qa | ~830 |

---

## Task Size Summary

| Size | Count | Description |
|------|-------|-------------|
| S | 11 | < 200 lines |
| M | 34 | 200-500 lines |
| L | 22 | 500+ lines |
| **Total** | **67** | |

## Issue Reference

| Story | GitHub Issue | Status |
|-------|-------------|--------|
| US-120 | #166 | Open |
| US-121 | #167 | Open |
| US-122 | #168 | Open |
| US-123 | #169 | Open |
| US-124 | #170 | Open |
| US-125 | #173 | Open |
| US-126 | #174 | Open |
| US-127 | #184 | Open |
| US-128 | #175 | Open |
| US-129 | #176 | Open |
| US-130 | #177 | Open |
| US-131 | #178 | Open |
| US-132 | #179 | Open |
| US-133 | #180 | Open |
| US-134 | #181 | Open |
| US-135 | #172 | Open |
| US-136 | #182 | Open |
| US-137 | #183 | Open |
| US-138 | #171 | Open |
| INFRA  | #222 | Open |

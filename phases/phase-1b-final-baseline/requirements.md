# Phase 1B: Page Templates + Builder Mode

> Target: Weeks 13–16 (4 weeks)
> References: Wireframes (Groups B, D, F), Design Principles (all), Patterns Library (all sections), Style Guide (full)
> Prerequisite: Phase 1A complete and merged to main
> Carry-overs: US-116, US-117, 15 open bugs from Phase 1A

## Phase goal

When this phase is complete, a developer can open the workspace and interact with fully functional page templates — table listing, summary dashboard, multi-tab detail, data explorer, form page, and timeline — all powered by the view engine, filter system, and VastuTable from Phase 1A. Builder mode allows admins to configure any page's data source, fields, sections, and permissions. The dashboard view shows pinned cards from any view. Command palette and keyboard shortcuts work globally. All Phase 1A bugs are resolved and E2E test coverage exists for the full workspace.

---

## User stories

### Group 1: Phase 1A bug fixes

> These MUST be completed before any new feature work begins. The view engine, filter system, and context menu have spec deviations that will propagate into every template if not fixed first.

#### US-120: Mode switch rebuild
**As a** user, **I want** to switch between Editor, Builder, and Workflow modes on a panel, **so that** I can view data, configure pages, or build workflows from the same panel.

**Acceptance criteria:**
- [ ] AC-1: Remove the incorrect IER filter mode switch component (#136)
- [ ] AC-2: New ModeSwitch as a segmented control in the panel tab bar: Editor / Builder / Workflow
- [ ] AC-3: Editor mode is always available and is the default
- [ ] AC-4: Builder mode requires `builder` or `admin` role (CASL check) — hidden for viewers/editors
- [ ] AC-5: Workflow mode requires `admin` role AND page has ephemeral mode enabled — hidden otherwise
- [ ] AC-6: Switching modes swaps panel content instantly (no loading flash)
- [ ] AC-7: Mode state is per-panel and part of serialized panel state
- [ ] AC-8: Builder and Workflow mode show placeholder content until their features land (later in this phase and Phase 2 respectively)

**Wireframe:** Group A, Screen 1 — mode switch in tab bar
**Closes:** #136

---

#### US-121: View engine fixes
**As a** developer, **I want** the view state store to match the spec and integrate correctly, **so that** page templates can build on a reliable foundation.

**Acceptance criteria:**
- [ ] AC-1: ViewState shape includes all specified fields: `id`, `name`, `colorDot`, `createdBy`, `isShared`, `filters`, `sort`, `columns`, `pagination`, `scrollPosition` (#124)
- [ ] AC-2: Modified indicator implemented: goldenrod dot (`--v-accent-tertiary`) + "Modified" label in view toolbar when state differs from saved (#125)
- [ ] AC-3: `saveView` API accepts `pageId` as part of the view, not as a separate undocumented parameter (#126)
- [ ] AC-4: ViewToolbar wired into WorkspaceShell: `activePageId` flows from Dockview active panel through to ViewToolbar (#141)
- [ ] AC-5: "New View" resets state to blank defaults (#142)
- [ ] AC-6: Reset control is disabled (not hidden) when view is clean (#143)
- [ ] AC-7: View delete in selector shows confirmation dialog (#144)

**Closes:** #124, #125, #126, #141, #142, #143, #144

---

#### US-122: Filter system fixes
**As a** developer, **I want** the filter system to match the Patterns Library spec, **so that** all page templates consume a consistent filter interface.

**Acceptance criteria:**
- [ ] AC-1: `FilterNode` type aligned to Patterns Library §2.4 spec: `{ type: 'condition' | 'group', connector?: 'AND' | 'OR', children?: FilterNode[], column?: string, mode?: 'include' | 'exclude' | 'regex', value?: any }` (#123)
- [ ] AC-2: FilterBar respects active mode when creating new filter conditions — Include/Exclude/Regex selection propagates correctly (#138)
- [ ] AC-3: Cell context menu "Include" and "Exclude" actions pass distinct mode values to the filter engine (#160)
- [ ] AC-4: All existing filter tests updated to use the corrected FilterNode schema
- [ ] AC-5: Existing CompositeFilterBuilder still works with the corrected schema

**Closes:** #123, #138, #160

---

#### US-123: Context menu fixes
**As a** developer, **I want** the context menu to be accessible and use the design system correctly.

**Acceptance criteria:**
- [ ] AC-1: Context menu container has `role="menu"` with `tabIndex={-1}` for focus management (#139)
- [ ] AC-2: ContextMenuItem labels use `TruncatedText` component for long labels instead of raw CSS ellipsis (#140)

**Closes:** #139, #140

---

#### US-124: Design system compliance sweep
**As a** developer, **I want** all Phase 1A components to use design tokens and shared components correctly, **so that** the workspace is visually consistent.

**Acceptance criteria:**
- [ ] AC-1: SidebarUserAvatar uses `--v-accent-primary` token instead of Mantine `color="blue"` (#114)
- [ ] AC-2: SidebarItem nav labels use `TruncatedText` component (#115)
- [ ] AC-3: VastuTable empty state uses the `EmptyState` component with contextual message and action (#161)
- [ ] AC-4: Grep all workspace `.tsx` files for hardcoded hex values — fix any found
- [ ] AC-5: Grep all workspace `.tsx` files for `font-weight: 600` or `font-weight: 700` — fix any found
- [ ] AC-6: Verify all icon-only buttons have `aria-label`

**Closes:** #114, #115, #161

---

### Group 2: Phase 1A carry-overs

#### US-125: Command palette (⌘K)
**As a** user, **I want** a global search and command overlay, **so that** I can quickly navigate to any page, record, or action.

**Acceptance criteria:**
- [ ] AC-1: Opens via ⌘K from anywhere in workspace, or clicking tray bar search button
- [ ] AC-2: Centered modal overlay with search input and grouped results
- [ ] AC-3: Sections: PAGES (fuzzy match, icon + name + template type + row count), RECENT RECORDS (last 10 opened), COMMANDS (prefixed with `>`)
- [ ] AC-4: Keyboard navigation: ↑↓ move between results, Enter opens, Tab opens in new panel, Escape closes
- [ ] AC-5: Footer hints: ↑↓ Navigate, ↵ Open, ⇥ New panel, Esc Close
- [ ] AC-6: Results update as user types (debounced 150ms)
- [ ] AC-7: Built on Mantine Spotlight with custom result rendering

**Wireframe:** Group D, Screen 20 — Command palette
**Continues:** #93

---

#### US-126: Global keyboard shortcuts
**As a** user, **I want** keyboard shortcuts for common workspace actions, **so that** I can work efficiently without a mouse.

**Acceptance criteria:**
- [ ] AC-1: `useKeyboardShortcuts` hook registered at workspace layout level
- [ ] AC-2: Global: `⌘K` command palette, `?` shortcuts modal, `⌘S` save view, `⌘Z` undo, `⌘/` focus search, `⌘B` toggle sidebar, `Esc` close topmost overlay
- [ ] AC-3: Table (when focused): `j`/`↓` next row, `k`/`↑` prev row, `o`/Enter open drawer, `x` toggle checkbox, `/` focus column search, `[`/`]` prev/next page
- [ ] AC-4: Shortcuts reference modal (triggered by `?`): grouped by context, shows shortcut + description
- [ ] AC-5: Shortcuts suppressed when user is typing in input/textarea
- [ ] AC-6: Focus management: tab order sidebar → tab bar → toolbar → content → tray. Focus rings on keyboard nav only.

**Wireframe:** Group F — Keyboard shortcuts reference
**Continues:** #94

---

#### US-127: Workspace E2E tests
**As a** developer, **I want** Playwright E2E tests covering the full workspace, **so that** we have regression protection before building page templates.

**Acceptance criteria:**
- [ ] AC-1: E2E: workspace loads with sidebar and Dockview area
- [ ] AC-2: E2E: sidebar toggle (collapsed ↔ expanded, ⌘B shortcut)
- [ ] AC-3: E2E: open panel from sidebar, verify it appears in Dockview
- [ ] AC-4: E2E: split panels (drag or programmatic), verify both visible
- [ ] AC-5: E2E: minimize panel to tray, verify tray item appears, restore from tray
- [ ] AC-6: E2E: command palette opens (⌘K), search, select result, panel opens
- [ ] AC-7: E2E: VastuTable sort (click column header, verify order changes)
- [ ] AC-8: E2E: VastuTable filter (add filter pill, verify row count changes)
- [ ] AC-9: E2E: view save and load (save current state, reload page, verify state restored)
- [ ] AC-10: E2E: mode switch (toggle Editor/Builder, verify content swaps)

**Notes:** These tests use mock page registrations and seed data. Real data sources come with page templates.

---

### Group 3: Record detail drawer

#### US-128: Record detail drawer
**As a** user, **I want** to click a table row and see a slide-out drawer with the full record detail, **so that** I can inspect and edit records without leaving the table.

**Acceptance criteria:**
- [ ] AC-1: Drawer slides from right (~420px) when a table row is clicked
- [ ] AC-2: Header: ‹/› arrows for prev/next record ("3 of 1,203"), ⬔ pop to panel, ⤢ expand full width, ⋯ overflow (delete, export, audit log), × close
- [ ] AC-3: Entity title + status badge + summary line (item count, total, created date)
- [ ] AC-4: Tabs: Details, Items, History, Notes, Permissions — RBAC-gated (Permissions tab only for admins)
- [ ] AC-5: Details tab: sectioned field list (General, Financials, Shipping) with label/value pairs + inline activity timeline
- [ ] AC-6: Items tab: sub-table of line items (uses VastuTable in compact mode)
- [ ] AC-7: History tab: audit trail from audit_events table, filtered to this record
- [ ] AC-8: Notes tab: rich text editor (Mantine TipTap or similar)
- [ ] AC-9: Permissions tab: object-level ACL editor (inherit/override, user list with access levels)
- [ ] AC-10: Sticky footer: Edit (primary), Archive, Duplicate, ⬔ Panel (promotes drawer to Dockview panel)
- [ ] AC-11: ↑↓ arrow keys navigate between records while drawer is open
- [ ] AC-12: Click outside drawer closes it. Table row stays highlighted.
- [ ] AC-13: ⬔ promotes drawer to panel: drawer slides out, new tab appears, same content + scroll position + active tab preserved

**Wireframe:** Group B, Screen 7 — Record detail drawer
**Patterns:** §4 Drawer-to-panel promotion

---

### Group 4: Page templates

> Each template is a React component in `packages/workspace/src/templates/` that renders inside a Dockview panel in Editor mode. Templates consume VastuTable, the filter system, VastuChart, and the view engine from Phase 1A.

#### US-129: Table listing template
**As a** user, **I want** a data table page that shows records with search, filters, sorting, pagination, and bulk actions, **so that** I can browse and manage large datasets.

**Acceptance criteria:**
- [ ] AC-1: Template registered in panel registry as `table-listing`
- [ ] AC-2: Full VastuTable with all Phase 1A features: global search, per-column filter, IER modes, composable filter pills, sortable columns, column config (resize/reorder/visibility/auto-fit), row selection, bulk actions, server-side pagination, virtual scrolling
- [ ] AC-3: Optional KPI summary strip above table (togglable): cards showing count, sum, avg, etc. for configured metrics
- [ ] AC-4: Click row → opens record detail drawer (US-128)
- [ ] AC-5: Right-click cell → VastuContextMenu with filter/copy/open actions
- [ ] AC-6: View toolbar active: save/load/share views with full filter+sort+column state
- [ ] AC-7: All state serialized to view (filters, sort, columns, page, density, scroll position)
- [ ] AC-8: Skeleton loading state while data fetches
- [ ] AC-9: EmptyState when no records match filters
- [ ] AC-10: Template accepts a configuration object (data source, columns, display types, summary metrics) — this is what builder mode will produce

**Wireframe:** Group B, Screen 4 — Table listing template
**Patterns:** §1 Data tables (entire section)

---

#### US-130: Summary dashboard template
**As a** user, **I want** a dashboard page with KPI cards, charts, and summary tables, **so that** I can get an operational overview at a glance.

**Acceptance criteria:**
- [ ] AC-1: Template registered as `summary-dashboard`
- [ ] AC-2: Time range control at top: dropdown with presets (Last 7d, 30d, 90d, YTD, custom) + comparison toggle ("vs previous period")
- [ ] AC-3: KPI card row: configurable number of metric cards, each showing label, value, delta (with direction arrow + color), optional sparkline
- [ ] AC-4: Chart row: 1-2 charts side by side. Chart types: line, area, bar, donut. Configurable via template config.
- [ ] AC-5: Bottom section: mini summary table (top N records by metric) + additional chart or donut
- [ ] AC-6: All charts use Recharts with the chart discrete series palette
- [ ] AC-7: Chart hover: tooltip with exact values for all series at that point
- [ ] AC-8: Chart legend: custom HTML legend (not Recharts default) — square swatches, click to toggle series
- [ ] AC-9: "View all →" links on mini tables open the full table listing page in a new panel
- [ ] AC-10: Auto-refresh toggle (configurable interval, default off)
- [ ] AC-11: View toolbar active: save/load dashboard layouts
- [ ] AC-12: Skeleton loading for each card/chart independently

**Wireframe:** Group D, Screen 16 — Summary dashboard template
**Patterns:** §3 Charts (entire section)

---

#### US-131: Multi-tab detail template
**As a** user, **I want** an entity detail page with a header and multiple tabs, **so that** I can deep-dive into a customer, product, or account.

**Acceptance criteria:**
- [ ] AC-1: Template registered as `multi-tab-detail`
- [ ] AC-2: Entity header band: large avatar/initials, entity name, status badge, summary stats (e.g., "47 orders · $128K lifetime"), action buttons (Edit, Actions dropdown, Merge)
- [ ] AC-3: Horizontal tab bar below header with RBAC-gated tab visibility
- [ ] AC-4: Default tabs: Overview, Orders (sub-table), Contacts, Billing, Activity (timeline), Notes (rich text), Permissions, Files
- [ ] AC-5: Overview tab: two-column layout — detail fields (left), mini charts + recent records (right)
- [ ] AC-6: Sub-table tabs use VastuTable in compact mode scoped to the parent entity
- [ ] AC-7: Activity tab uses the timeline/activity pattern (date-grouped events)
- [ ] AC-8: Tab list configurable via template config (builder can add/remove/reorder tabs)
- [ ] AC-9: URL updates with active tab for deep-linking: `?tab=orders`
- [ ] AC-10: Skeleton loading per-tab (not entire page)

**Wireframe:** Group D, Screen 17 — Multi-tab detail template

---

#### US-132: Data explorer template
**As a** user, **I want** a chart-first analytics page with controls for metric, grouping, and time, **so that** I can explore data visually.

**Acceptance criteria:**
- [ ] AC-1: Template registered as `data-explorer`
- [ ] AC-2: Controls bar: metric picker, group-by dimension picker, time resolution (hourly/daily/weekly/monthly), composable filter pills
- [ ] AC-3: Chart type toggle: Line / Bar / Table (segmented control)
- [ ] AC-4: Main chart area: multi-series chart using Recharts with the discrete series palette
- [ ] AC-5: Chart interaction: hover tooltip (all series values), click for drill-down, brush/zoom on time axis, legend toggle/solo
- [ ] AC-6: Companion data table below chart: same data in tabular form, sortable, exportable
- [ ] AC-7: Chart and table stay synced — filtering the chart filters the table and vice versa
- [ ] AC-8: Export: PNG (chart image), CSV (data table)
- [ ] AC-9: View toolbar active: save metric/group/filter combinations as views
- [ ] AC-10: "Reset zoom" button appears when chart is zoomed

**Wireframe:** Group D, Screen 18 — Data explorer template
**Patterns:** §3 Charts

---

#### US-133: Form page template
**As a** user, **I want** a form page for data entry with multi-step wizard support, **so that** I can create and edit records with validation.

**Acceptance criteria:**
- [ ] AC-1: Template registered as `form-page`
- [ ] AC-2: Single-page form mode: centered form with field groups, validation, save button
- [ ] AC-3: Multi-step wizard mode: step indicator (numbered circles connected by lines), Back/Next buttons, step count, progress preserved on back
- [ ] AC-4: Search-or-create pattern: search input to find existing entity + "or create new" separator + form fields
- [ ] AC-5: Field types: text input, select, multi-select, number, date, textarea, file upload, checkbox, radio group
- [ ] AC-6: All validation via `@mantine/form`: inline on blur, required fields marked with `*`, error messages below field
- [ ] AC-7: Password strength indicator on password fields
- [ ] AC-8: Auto-save draft every 30s (stored in localStorage, restored on return)
- [ ] AC-9: Dirty state detection: "You have unsaved changes" confirmation on navigate away
- [ ] AC-10: Submit writes audit event
- [ ] AC-11: URL updates per step for multi-step: `?step=2`

**Wireframe:** Group F — Form page template
**Patterns:** §9 Form patterns

---

#### US-134: Timeline / activity template
**As a** user, **I want** an activity stream page with date grouping and type filters, **so that** I can see what happened across the system.

**Acceptance criteria:**
- [ ] AC-1: Template registered as `timeline-activity`
- [ ] AC-2: Event stream with date group headers ("Today, Mar 21", "Yesterday, Mar 20")
- [ ] AC-3: Each event: type-colored dot (green=order, blue=payment, gray=system, purple=agent), title, type badge, description, timestamp, user avatar
- [ ] AC-4: Filters: search input, type pills (Orders, System, Users, Agent — toggle on/off), date range picker, user dropdown
- [ ] AC-5: Click event → open related record (detail drawer or new panel)
- [ ] AC-6: Expandable event detail on click: full payload, related events
- [ ] AC-7: Infinite scroll or server-side pagination (load more on scroll)
- [ ] AC-8: View toolbar active: save filter combinations as views
- [ ] AC-9: EmptyState: "No activity recorded yet" with contextual message

**Wireframe:** Group F — Timeline activity template

---

### Group 5: VastuChart component

#### US-135: VastuChart wrapper
**As a** developer, **I want** a chart component that wraps Recharts with Vastu's config system, color palette, and interaction patterns, **so that** all charts are consistent.

**Acceptance criteria:**
- [ ] AC-1: `VastuChart` wrapping Recharts with Mantine styling
- [ ] AC-2: Chart types: line, area, bar (vertical + horizontal), stacked bar, donut, sparkline, scatter
- [ ] AC-3: Automatic color assignment from `CHART_SERIES_COLORS` palette (in order, never skip)
- [ ] AC-4: Custom HTML legend (square swatches, click to toggle, double-click to solo)
- [ ] AC-5: Hover tooltip: all series values at that x-position, sorted by value descending, `--v-bg-elevated` + `--v-shadow-sm`
- [ ] AC-6: Right-click chart segment → VastuContextMenu: filter to value, exclude, drill down, copy value
- [ ] AC-7: Responsive: resizes to container width, height configurable (default 240px inline, 360px full-width)
- [ ] AC-8: Loading state: skeleton rect matching chart dimensions
- [ ] AC-9: Error state: error message with retry button
- [ ] AC-10: Empty state: "No data matches current filters" with action
- [ ] AC-11: Accessible: `aria-label` describing chart, "View as table" toggle, keyboard-navigable data points
- [ ] AC-12: Collapsible config panel (gear icon): basic (chart type, data source, color scheme) + advanced (axis min/max, scale, per-series overrides, grid lines, annotations)

**Wireframe:** Group D — charts in dashboard and explorer templates
**Patterns:** §3 Charts (entire section)

---

### Group 6: Builder mode

#### US-136: Builder mode config panel
**As an** admin, **I want** to configure a page's data source, fields, sections, and permissions without writing code, **so that** I can set up pages for my team.

**Acceptance criteria:**
- [ ] AC-1: Switching to Builder mode (via ModeSwitch from US-120) replaces the panel content with a two-column config panel
- [ ] AC-2: Left column: section navigation (Data source, Field configuration, Sections & layout, Default view, Permissions, Hooks, Page metadata, Ephemeral toggle)
- [ ] AC-3: Warning header bar (amber tint): "Page configuration — changes apply to all users. Requires builder or admin role." + Discard / Save config buttons
- [ ] AC-4: **Data source section:** DB connection picker (with health indicator from settings), table picker (with row count), auto-detected relations (toggle active/inactive), custom query toggle, live schema preview (column, type, nullable, key, mapped-to)
- [ ] AC-5: **Field configuration section:** per-column settings: visible toggle, label override, display type picker (text/badge/currency/date/avatar/monospace/boolean/link), sortable toggle, filterable toggle
- [ ] AC-6: **Sections & layout section:** toggle switches for: summary strip, advanced search, bulk actions, detail drawer. Drag-to-reorder sections.
- [ ] AC-7: **Default view section:** set initial filter/sort/column state that new users see when opening this page
- [ ] AC-8: **Permissions section:** per-role matrix: view/edit/delete/export. Per-field visibility by role.
- [ ] AC-9: **Hooks section:** list of attached hooks (onPageLoad, onRecordClick, onSave, onDelete) with code editor (Monaco) and sandboxed preview. (Hook execution engine is Phase 3 — this is the UI only.)
- [ ] AC-10: **Page metadata section:** name, icon picker, description, nav order in sidebar
- [ ] AC-11: **Ephemeral toggle:** enables/disables Workflow mode tab for this page
- [ ] AC-12: Config saves to `page_configurations` table. Every save writes an audit event.
- [ ] AC-13: Config is runtime — takes effect immediately on save, no deployment needed
- [ ] AC-14: Other users see the updated page configuration on their next page load

**Wireframe:** Group B, Screen 8 — Builder config panel
**Notes:** Hook execution is UI-only in this phase. The actual sandboxed execution engine comes in Phase 3.

---

### Group 7: Dashboard view

#### US-137: Dashboard view (pinned cards)
**As a** user, **I want** a dashboard home screen with cards pinned from my views, **so that** I can see my most important data at a glance.

**Acceptance criteria:**
- [ ] AC-1: Dashboard is a first-class panel type, opened from sidebar or as the default panel
- [ ] AC-2: Greeting header: "Good afternoon, {name}" + date + alert count + pending review count
- [ ] AC-3: Card grid: responsive columns (auto-fill, min 280px per card)
- [ ] AC-4: Card types: KPI card (value + delta + sparkline), chart card (mini chart), table card (mini table with "View all →"), pipeline card (horizontal stacked bar), quick actions card (action buttons list), alert card (warning strip)
- [ ] AC-5: "+ Add card" button opens card type picker
- [ ] AC-6: "Edit grid" mode: drag-to-reorder cards, resize handles (1×1, 2×1, 1×2), remove button per card
- [ ] AC-7: Cards sourced from: pinned views (via view toolbar overflow → "Pin to dashboard"), builder-configured dashboard pages, or manual "Add card"
- [ ] AC-8: Pin-to-dashboard dialog: card type selector (KPI/chart/table), metric picker (for KPI), size picker (1×1/2×1), target dashboard
- [ ] AC-9: Alert card: shows system alerts (DB idle, API rate limits, SLA at-risk) with "View all →"
- [ ] AC-10: View toolbar active on dashboard: save/load dashboard layouts as views
- [ ] AC-11: Dashboard state (card positions, sizes, configuration) serialized to view state

**Wireframe:** Group D, Screen 19 — Dashboard view; Group F — Pin-to-dashboard dialog

---

### Group 8: Confirmation dialogs

#### US-138: Confirmation dialog system
**As a** user, **I want** clear confirmation prompts before destructive actions, **so that** I don't accidentally delete or revoke something important.

**Acceptance criteria:**
- [ ] AC-1: `ConfirmDialog` shared component with three variants: delete (red action button), warning (amber), info (blue)
- [ ] AC-2: Every destructive action across the workspace uses `ConfirmDialog`: view delete, record delete, bulk delete, API key revoke, panel close (if unsaved), card remove from dashboard
- [ ] AC-3: Dialog shows: title, impact description (what will happen), cancel button, action button (color-coded)
- [ ] AC-4: Escape and click-outside cancel the dialog (do not confirm)
- [ ] AC-5: Focus trapped inside dialog, action button is NOT auto-focused (prevent accidental Enter)

**Wireframe:** Group F — Confirmation dialogs
**Patterns:** §10 Toast and notification patterns (confirmation before destructive toasts)

---

## Technical constraints

- All page templates are React components registered in the panel registry. They render inside Dockview panels in Editor mode.
- Templates consume a configuration object (produced by Builder mode). Templates must render with sensible defaults when no configuration exists (zero-config first render).
- All charts use `VastuChart` wrapper — never raw Recharts.
- All tables in templates use `VastuTable` — never raw TanStack Table.
- Builder mode config writes to `page_configurations` table (Prisma). Config is JSON — no code generation.
- Hook editor UI uses Monaco. Hook execution is NOT implemented in this phase (Phase 3). The UI stores the hook code in the config; a placeholder "Hooks coming in Phase 2" message shows in the execution area.
- Dashboard card positions use CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`. No drag-and-drop library — use HTML5 drag API for reorder in edit mode.

## Out of scope

- Workflow mode content (Phase 2)
- Agent panel / AG-UI (Phase 2)
- Hook execution engine (Phase 2)
- MCP tools for workspace interactions (Phase 2)
- Real external DB queries via configured connections (Phase 2 — templates use mock data + Prisma seed data)
- OpenTelemetry / monitoring (Phase 3)
- Notification subsystem beyond toasts (Phase 2)
- Object permission editor in drawer Permissions tab connects to CASL but does NOT enforce row-level security on queries (Phase 2)

## Definition of done

- [ ] All 19 user stories implemented with acceptance criteria met
- [ ] All 15 Phase 1A bugs closed (verified by QA)
- [ ] Unit test coverage ≥ 80% on new code
- [ ] E2E tests: workspace load, sidebar, panels, tray, command palette, table interactions, view save/load, mode switch, each template's happy path, builder save/load, dashboard card management
- [ ] All code passes lint, typecheck, CI
- [ ] Design system compliance: tokens, TruncatedText, loading choreography, context menus, keyboard nav, EmptyState
- [ ] 6 page templates render with default configuration (zero-config)
- [ ] Builder mode config saves and applies to templates immediately
- [ ] Dashboard view displays pinned cards correctly
- [ ] VastuChart renders all chart types with correct color palette
- [ ] All Phase 1A carry-over features (command palette, keyboard shortcuts) working
- [ ] Fumadocs updated with: template usage guide, VastuTable API, VastuChart API, builder mode guide, filter system API
- [ ] Phase completion document produced

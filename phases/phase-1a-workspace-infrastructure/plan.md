# Phase 1A: Workspace Infrastructure

> Target: Weeks 9–12 (4 weeks)
> References: Wireframes (Groups A, B), Design Principles (all), Patterns Library (§1 Tables, §2 Filters, §5 Context menus, §6 Loading, §7 Truncation, §11 Keyboard nav, §12 Panel management)
> Prerequisite: Phase 0 complete and merged to main

## Phase goal

When this phase is complete, a developer can open `/workspace` and interact with a fully functional Dockview workspace: open panels from the sidebar, split/float/tab/minimize them, use the tray bar to restore minimized panels, search via ⌘K command palette, and view a data table with TanStack Table integration (VastuTable), right-click context menus, composable filters, and serializable view state. No page templates exist yet — that's Phase 1B — but the infrastructure they plug into is complete and tested.

---

## User stories

### Group 1: Phase 0 cleanup

#### US-101: Replace i18n stub
**As a** developer, **I want** a proper i18n library replacing the flat Record stub, **so that** internationalization works correctly as we add more pages.

**Acceptance criteria:**
- [ ] AC-1: `next-intl` installed and configured with Next.js App Router integration
- [ ] AC-2: All existing 700+ `t('key')` calls work without changes (backward-compatible key format)
- [ ] AC-3: Default locale `en` with messages in `/messages/en.json`
- [ ] AC-4: Locale detection from browser `Accept-Language` header (no user-facing language switcher yet — that exists in appearance settings)
- [ ] AC-5: Developer docs page: "Adding translations" in Fumadocs

**Notes:** This must land first — every subsequent feature adds more strings.

---

#### US-102: MFA enforcement separation
**As an** admin, **I want** MFA enforcement to be a separate setting from SSO requirement, **so that** I can require MFA without requiring SSO.

**Acceptance criteria:**
- [ ] AC-1: New `mfa_required` boolean column on `organizations` table (Prisma migration)
- [ ] AC-2: SSO config page shows two separate toggles: "Require SSO for all users" and "Require MFA for all users"
- [ ] AC-3: When `mfa_required` is true and user has no MFA configured, redirect to MFA setup after login
- [ ] AC-4: Both toggles can be independently enabled/disabled
- [ ] AC-5: Existing `sso_required` behavior unchanged

---

#### US-103: Session expiry detection
**As a** user, **I want** to see a "Session expired" toast and redirect to login when my session times out, **so that** I'm not confused by a broken page.

**Acceptance criteria:**
- [ ] AC-1: Client-side session check on a 60-second interval (via next-auth `useSession` with `required: true`)
- [ ] AC-2: When session is expired/invalid: toast "Your session has expired. Please sign in again.", redirect to `/login?expired=true`
- [ ] AC-3: Login page shows "Session expired" message when `?expired=true` is present
- [ ] AC-4: No redirect loop — if already on login page, don't check session

---

#### US-104: CI coverage comments
**As a** developer, **I want** test coverage posted as a comment on my PR, **so that** I can see coverage impact without opening the CI logs.

**Acceptance criteria:**
- [ ] AC-1: Coverage summary (lines, branches, functions) posted as a sticky PR comment
- [ ] AC-2: Shows delta vs main branch ("+2.3% lines", "-0.1% branches")
- [ ] AC-3: Uses `marocchino/sticky-pull-request-comment` or equivalent action
- [ ] AC-4: Comment updates on subsequent pushes (doesn't create new comments)

---

#### US-105: Fumadocs setup
**As a** developer, **I want** a documentation site built with Fumadocs, **so that** project documentation is browsable and searchable.

**Acceptance criteria:**
- [ ] AC-1: `docs` package added to monorepo with Fumadocs configured
- [ ] AC-2: MDX content in `docs/content/` renders as a Next.js site on `localhost:3001` (separate port from main app)
- [ ] AC-3: Initial pages migrated from our existing markdown docs: getting started (installation, docker setup, project structure), architecture overview, design system overview
- [ ] AC-4: Built-in search works across all pages
- [ ] AC-5: Navigation sidebar auto-generated from directory structure
- [ ] AC-6: `pnpm docs:dev` starts the docs dev server
- [ ] AC-7: ADR files from Phase 0 migrated to `docs/content/decisions/`

**Notes:** The docs-engineer agent will add content with each subsequent feature. This story just sets up the infrastructure and seeds it with existing content.

---

### Group 2: Workspace package activation

#### US-106: Workspace package and layout
**As a** developer, **I want** the workspace package activated with its own layout and routing, **so that** the Dockview workspace has a proper home.

**Acceptance criteria:**
- [ ] AC-1: `packages/workspace` is a functioning Next.js route segment (not a stub)
- [ ] AC-2: `/workspace` route renders from the workspace package with its own layout
- [ ] AC-3: Layout includes: workspace sidebar (left), main content area (center/right), tray bar (bottom)
- [ ] AC-4: Workspace layout is client-side rendered (`"use client"`) — this is the client-heavy surface
- [ ] AC-5: Auth middleware protects `/workspace` — unauthenticated users redirect to login
- [ ] AC-6: Zustand store provider wraps the workspace layout (for panel state, view state, UI state)
- [ ] AC-7: TanStack Query provider wraps the workspace layout (for server data fetching)
- [ ] AC-8: Theme and design tokens carry over from the shell (same MantineProvider, same CSS tokens)

**Wireframe:** Group A, Screen 1 — Workspace shell

---

### Group 3: Dockview integration

#### US-107: Dockview panel host
**As a** user, **I want** panels that I can open, arrange, split, float, and tab together, **so that** I can organize my workspace the way I want.

**Acceptance criteria:**
- [ ] AC-1: Dockview integrated as the main content area of the workspace
- [ ] AC-2: Panels can be opened programmatically (from sidebar clicks, command palette, links)
- [ ] AC-3: Panel tab bar shows: panel title, close button (×), active tab highlight
- [ ] AC-4: Drag a tab to the edge of another panel to split (left/right/top/bottom) with visual drop indicator
- [ ] AC-5: Drag a tab away from the tab bar to create a floating panel
- [ ] AC-6: Drag a tab onto another panel's tab bar to merge into that panel's tab group
- [ ] AC-7: Panel state (which panels are open, their positions, sizes, split ratios, active tab) serializable to JSON
- [ ] AC-8: Panel state persisted to localStorage on every change, restored on page load
- [ ] AC-9: Panel state serializable to URL (for sharing workspace layouts)
- [ ] AC-10: Panel registry: each panel type registered with an ID, title, icon, and React component

**Wireframe:** Group A, Screen 1 — Workspace shell (Dockview area)
**Patterns:** §12 Panel and window management

---

#### US-108: Mode switch
**As a** user, **I want** to switch between Editor, Builder, and Workflow modes on a panel, **so that** I can view data, configure pages, or run workflows from the same panel.

**Acceptance criteria:**
- [ ] AC-1: Segmented control in the panel tab bar: Editor / Builder / Workflow
- [ ] AC-2: Editor mode is the default and always available
- [ ] AC-3: Builder mode requires `builder` or `admin` role (CASL check). Hidden for viewers/editors.
- [ ] AC-4: Workflow mode requires `admin` role AND the page has ephemeral mode enabled. Hidden otherwise.
- [ ] AC-5: Switching modes replaces the panel content — no loading flash (instant swap)
- [ ] AC-6: Mode state is per-panel (different panels can be in different modes)
- [ ] AC-7: Mode state is part of the serialized panel state

**Wireframe:** Group A, Screen 1 — mode switch in tab bar
**Notes:** Builder and Workflow mode content comes in Phase 1B and Phase 2 respectively. This story just builds the switching mechanism with placeholder content for those modes.

---

### Group 4: Workspace sidebar

#### US-109: Workspace sidebar navigation
**As a** user, **I want** a sidebar that shows my pages and lets me navigate between them, **so that** I can quickly access any page in the workspace.

**Acceptance criteria:**
- [ ] AC-1: Sidebar in two states: collapsed (48px icon rail) and expanded (200px with labels)
- [ ] AC-2: Toggle between states: click the hamburger/collapse icon, or `⌘B` keyboard shortcut
- [ ] AC-3: Sidebar state persisted to localStorage
- [ ] AC-4: Collapsed state: Vastu logo at top, icon-only buttons with tooltip on hover (page name), user avatar at bottom
- [ ] AC-5: Expanded state: Vastu logo + "Vastu" text, sections (PAGES, SYSTEM, ADMIN) with page list, pin toggle per page, search input at top, user avatar + name + role at bottom
- [ ] AC-6: PAGES section shows all registered pages (from page registry)
- [ ] AC-7: SYSTEM section: Settings link (opens `/settings` in new browser tab, not in Dockview)
- [ ] AC-8: ADMIN section: visible only for admin role (CASL check)
- [ ] AC-9: Click a page → opens as a new Dockview panel (or focuses existing panel if already open)
- [ ] AC-10: Active page highlighted with accent-primary background

**Wireframe:** Group A, Screen 3 — Sidebar navigation (both states)
**Patterns:** §11 Keyboard navigation (⌘B toggle)

---

### Group 5: View state engine

#### US-110: View state store
**As a** developer, **I want** a Zustand store that manages serializable view state, **so that** filters, sort, columns, and scroll position can be saved, shared, and restored.

**Acceptance criteria:**
- [ ] AC-1: `useViewStore` Zustand store in `packages/workspace/src/stores/viewStore.ts`
- [ ] AC-2: View state shape: `{ id, name, filters, sort, columns, pagination, scrollPosition, colorDot, createdBy, isShared }`
- [ ] AC-3: Filters stored as the `FilterNode` tree structure from Patterns Library §2.4
- [ ] AC-4: State serializable to JSON (no functions, no circular refs, no DOM refs)
- [ ] AC-5: `saveView(name)` persists view state to the database (via API route)
- [ ] AC-6: `loadView(id)` restores view state from database
- [ ] AC-7: `resetView()` reverts to the saved state (discards unsaved modifications)
- [ ] AC-8: `isModified` computed property: true when current state differs from last saved state
- [ ] AC-9: View state changes produce a "Modified" indicator (goldenrod dot, per accent system)
- [ ] AC-10: Database table: `views` (id, name, page_id, state_json, created_by, is_shared, color_dot, created_at, updated_at)

**Patterns:** View toolbar (Group B, Screen 5), entire view system from Patterns Library

---

#### US-111: View toolbar
**As a** user, **I want** a toolbar to save, share, and switch between views, **so that** I can preserve different ways of looking at my data.

**Acceptance criteria:**
- [ ] AC-1: View toolbar below the tab bar in every panel: view picker dropdown + Save / Save as / Share / Export / ⋯ overflow
- [ ] AC-2: View picker shows: search input, "MY VIEWS" section, "SHARED WITH ME" section, "+ Create new view" action
- [ ] AC-3: Each view in the picker has: color dot, name, ⋯ menu (rename, delete), active view highlighted
- [ ] AC-4: "Modified" state: goldenrod dot + "Modified" label + "Reset" link when current state differs from saved
- [ ] AC-5: Save button: disabled (dimmed) when no changes, primary blue when modified
- [ ] AC-6: Share dialog: shareable URL with copy button, access control toggle (anyone with link / specific people)
- [ ] AC-7: Export options: JSON (view definition), CSV (data), PNG (if chart)
- [ ] AC-8: Overflow menu: Import view (JSON), Export view, Duplicate, View history, Pin to dashboard, Delete
- [ ] AC-9: All toolbar state serialized as part of panel state
- [ ] AC-10: Keyboard shortcut: `⌘S` saves current view

**Wireframe:** Group B, Screen 5 — View toolbar states
**Patterns:** §12.2 Layout serialization

---

### Group 6: Core workspace components

#### US-112: VastuTable
**As a** developer, **I want** a table component that wraps TanStack Table with Vastu's view engine, filtering, and interaction patterns, **so that** all tables in the workspace are consistent and powerful.

**Acceptance criteria:**
- [ ] AC-1: `VastuTable` component wrapping TanStack Table with Mantine styling
- [ ] AC-2: Global text search (debounced 300ms, highlights matching fragments)
- [ ] AC-3: Per-column filtering via column header dropdown (adapts to data type: text/number/date/enum/boolean)
- [ ] AC-4: Filter modes: Include / Exclude / Regex (IER) on every filter
- [ ] AC-5: Composable filter pills below search: column name + mode indicator (I/E/R) + value summary + × remove
- [ ] AC-6: Sortable columns: click header for asc, click again for desc, third click removes. Multi-sort with Shift+click.
- [ ] AC-7: Column configuration: resize (drag border), reorder (drag header), visibility (column picker), auto-fit (double-click border)
- [ ] AC-8: Three row density levels: compact (24px), comfortable (32px), spacious (40px) via toolbar toggle
- [ ] AC-9: Row selection with checkboxes. Bulk action bar appears on selection: N selected + Export / Bulk edit / Delete + Select all + Clear
- [ ] AC-10: Server-side pagination: "Showing 1-25 of N" + rows-per-page dropdown (10/25/50/100) + page navigation
- [ ] AC-11: Virtual scrolling for tables over 50 rows (TanStack Virtual)
- [ ] AC-12: All table state (filters, sort, columns, page, density) synced to the view store
- [ ] AC-13: Cell rendering adapts to display type from config: text, number, currency, date, relative date, badge, avatar, boolean, link, monospace
- [ ] AC-14: Null/empty values render as "—" in `--v-text-tertiary`, sort last regardless of direction
- [ ] AC-15: Click row → callback (for opening detail drawer/panel)
- [ ] AC-16: Loading state: `TableSkeleton` matching table dimensions

**Wireframe:** Group B, Screen 4 — Table listing template
**Patterns:** §1 Data tables (entire section), §2 Filters, §6 Loading choreography

---

#### US-113: VastuContextMenu
**As a** user, **I want** to right-click any data element and see relevant actions, **so that** I can filter, copy, drill down, or ask the agent without leaving context.

**Acceptance criteria:**
- [ ] AC-1: `VastuContextMenu` component that captures `onContextMenu` on `[data-context]` elements
- [ ] AC-2: Menu content adapts to click target type (cell, row, header, badge — from `data-context-type` attribute)
- [ ] AC-3: Table cell menu: Copy value, Include filter, Exclude filter, Filter to only this, Open record, Ask agent (disabled until Phase 2)
- [ ] AC-4: Table row menu: Open record, Open in new panel, Edit, Duplicate, Delete, Copy row as JSON
- [ ] AC-5: Table header menu: Sort ascending, Sort descending, Remove sort, Filter this column, Hide column, Auto-fit width, Reset width
- [ ] AC-6: Badge/status menu: Include filter, Exclude filter, Copy value
- [ ] AC-7: Menu follows consistent structure: primary actions → separator → filter actions → separator → utility → separator → destructive (red, at bottom)
- [ ] AC-8: Keyboard shortcut hints shown right-aligned in menu items where applicable
- [ ] AC-9: Position-aware: menu flips when near viewport edge
- [ ] AC-10: Keyboard navigation within menu: arrow keys, Enter to select, Escape to close

**Wireframe:** Throughout all workspace screens (described in Patterns Library §5)
**Patterns:** §5 Right-click context menus

---

#### US-114: Composable filter system
**As a** user, **I want** powerful filters with include/exclude/regex modes and composite grouping, **so that** I can find exactly the data I need.

**Acceptance criteria:**
- [ ] AC-1: Filter engine as a standalone module in workspace (used by VastuTable and future chart/dashboard filters)
- [ ] AC-2: Three modes on every filter: Include (I), Exclude (E), Regex (R) — toggled via dropdown in filter input
- [ ] AC-3: Filter input adapts to data type: multi-value tags for strings, range slider + min/max for numbers, date range picker with presets for dates, checkbox list for enums, three-state toggle for booleans
- [ ] AC-4: Active filter pills in the filter bar: column name + mode indicator (color-coded I=blue, E=red, R=purple) + value summary + count + × remove
- [ ] AC-5: "+ Add filter" button opens dimension picker
- [ ] AC-6: "Advanced" toggle switches to composite filter builder: conditions + groups with AND/OR connectors, nestable to 3 levels, drag-and-drop reorder
- [ ] AC-7: Composite filter serialized as `FilterNode` JSON tree (per Patterns Library §2.4)
- [ ] AC-8: "Convert to simple" collapses back to pills when filter is flat (no OR groups)
- [ ] AC-9: Filter state is part of the serializable view state
- [ ] AC-10: "Filters active (N)" indicator in view toolbar when any filter is applied
- [ ] AC-11: Table row count updates to reflect filtered total: "Showing 1-25 of 47 (1,203 total)"

**Wireframe:** Group B, Screen 4 — filter pills; Patterns Library §2 (entire section)
**Patterns:** §2 Filters

---

### Group 7: Tray bar

#### US-115: Tray bar
**As a** user, **I want** a tray bar at the bottom of the workspace where minimized panels live, **so that** I can minimize panels I'm not actively using and restore them easily.

**Acceptance criteria:**
- [ ] AC-1: Tray bar fixed at bottom of workspace, 44px height
- [ ] AC-2: Click minimize (–) on a panel → panel shrinks to a tray item (pill with icon + title)
- [ ] AC-3: Click tray item → restores panel to its previous position and size
- [ ] AC-4: Hover tray item → preview tooltip: panel name, view name, last updated, Restore/Close buttons
- [ ] AC-5: Right-click tray item → context menu: Restore (default), Restore as split, Restore as float, Close panel
- [ ] AC-6: Notification badges persist on tray items (e.g., unread count on a panel)
- [ ] AC-7: Overflow: when items exceed tray width, a "+N" pill appears. Click opens dropdown of hidden panels.
- [ ] AC-8: Empty state: "No minimized panels" centered text when tray is empty
- [ ] AC-9: ⌘K shortcut button always visible on the right end of the tray
- [ ] AC-10: Tray item × button closes the panel entirely (removes from workspace, not just minimizes)
- [ ] AC-11: Animation: minimize (180ms ease-out), restore (200ms ease-out), per motion tokens

**Wireframe:** Group B, Screen 6 — Tray bar states
**Patterns:** §12 Panel management, §7 Motion with purpose

---

### Group 8: Command palette

#### US-116: Command palette (⌘K)
**As a** user, **I want** a global search and command overlay, **so that** I can quickly navigate to any page, record, or action from anywhere in the workspace.

**Acceptance criteria:**
- [ ] AC-1: Opens via ⌘K shortcut from anywhere in the workspace, or clicking the tray bar search button
- [ ] AC-2: Centered modal overlay with search input and grouped results
- [ ] AC-3: Sections: PAGES (fuzzy match on page names with template type + row count), RECENT RECORDS (last 10 opened), COMMANDS (prefixed with `>`)
- [ ] AC-4: Page results show icon + name + template type badge + row count
- [ ] AC-5: Recent records show entity name + key identifier + "opened Xh ago"
- [ ] AC-6: Commands: `> New order`, `> Settings`, `> Switch theme`, `> Invite user`, `> Keyboard shortcuts`
- [ ] AC-7: Keyboard navigation: ↑↓ to move between results, Enter to open, Tab to open in new Dockview panel, Escape to close
- [ ] AC-8: Footer hints showing keyboard shortcuts: ↑↓ Navigate, ↵ Open, ⇥ New panel, Esc Close
- [ ] AC-9: Results update as user types (debounced 150ms)
- [ ] AC-10: Built on Mantine Spotlight with custom result rendering

**Wireframe:** Group D, Screen 20 — Command palette
**Patterns:** §11 Keyboard navigation

---

### Group 9: Keyboard navigation foundation

#### US-117: Global keyboard shortcuts
**As a** user, **I want** keyboard shortcuts for common workspace actions, **so that** I can work efficiently without a mouse.

**Acceptance criteria:**
- [ ] AC-1: Global shortcuts registered at workspace layout level (not per-component)
- [ ] AC-2: `⌘K` → command palette, `?` → shortcuts reference modal, `⌘S` → save view, `⌘Z` → undo, `⌘/` → focus search, `⌘B` → toggle sidebar, `Esc` → close topmost overlay
- [ ] AC-3: Table shortcuts when a table panel is focused: `j`/`↓` next row, `k`/`↑` prev row, `o`/Enter open drawer, `x` toggle checkbox, `/` focus column search, `[`/`]` prev/next page
- [ ] AC-4: Shortcuts reference modal (triggered by `?`): grouped by context (General, Table, Panel, Sidebar), showing shortcut + action description
- [ ] AC-5: Shortcuts don't fire when user is typing in an input/textarea (check `document.activeElement`)
- [ ] AC-6: Focus management: Tab order follows visual layout (sidebar → tab bar → toolbar → content → tray). Focus rings visible on keyboard nav only.

**Wireframe:** Group F — Keyboard shortcuts reference
**Patterns:** §11 Keyboard navigation

---

## Technical constraints

- Workspace package is entirely client-rendered (`"use client"` at layout level). No SSR for workspace content.
- Dockview is the only window management library. Do not build a custom panel system.
- TanStack Table is the only table engine. VastuTable wraps it — no alternative table implementations.
- Zustand for all client state (panel state, view state, sidebar state, tray state). No Redux, no Context API for state management.
- TanStack Query for all server data in the workspace. No `useEffect` + `fetch` patterns.
- All animations use the motion tokens from the style guide (durations, easings). No hardcoded values.
- `VastuTable` and `VastuContextMenu` are reusable across ALL future page templates — design them as general-purpose, not table-listing-specific.

## Out of scope

- Page templates: table listing, dashboard, detail, explorer, form, timeline (Phase 1B)
- Builder mode config panel content (Phase 1B — the mode switch toggle exists, content is placeholder)
- Workflow mode (Phase 2)
- Agent panel / AG-UI (Phase 2)
- Record detail drawer (Phase 1B — depends on page templates)
- Dashboard view with pinned cards (Phase 1B)
- MCP tools for workspace interactions (Phase 2 — but document the intended tool surface in code comments)
- Real data sources — use seed data and mock page registrations for testing Dockview, VastuTable, etc.

## Definition of done

- [ ] All 17 user stories implemented with acceptance criteria met
- [ ] Unit test coverage ≥ 80% on new code
- [ ] E2E tests for: workspace loads, sidebar toggle, open panel from sidebar, split panels, minimize to tray, restore from tray, command palette search and navigate, table sort/filter/paginate, view save/load/share, keyboard shortcuts
- [ ] All code passes lint, typecheck, and CI pipeline
- [ ] Design system compliance: all tokens, TruncatedText, loading states, context menus, keyboard nav
- [ ] Dockview panel state persists across page refresh
- [ ] View state serializes and deserializes correctly (save → reload → identical state)
- [ ] VastuTable handles 1,000+ rows without performance degradation (virtual scrolling)
- [ ] Filter system handles composite filters with 3 levels of nesting
- [ ] All Phase 0 cleanup items resolved (i18n, MFA, session expiry, CI coverage)
- [ ] Fumadocs site running with initial content
- [ ] Phase completion document produced with story-by-story verification

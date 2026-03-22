# Phase 1B: Page Templates + Builder Mode -- Implementation Plan

> Produced: 2026-03-21
> Phase: 1B (Weeks 13-16)
> Prerequisite: Phase 1A merged to main
> User stories: 19 (US-120 through US-138)
> Carry-overs from 1A: US-116 (command palette), US-117 (keyboard shortcuts), 15 bugs

---

## Table of contents

1. [Dependency order](#dependency-order)
2. [Group 1: Phase 1A bug fixes](#group-1-phase-1a-bug-fixes)
   - US-120: Mode switch rebuild
   - US-121: View engine fixes
   - US-122: Filter system fixes
   - US-123: Context menu fixes
   - US-124: Design system compliance sweep
3. [Group 2: Phase 1A carry-overs](#group-2-phase-1a-carry-overs)
   - US-125: Command palette
   - US-126: Global keyboard shortcuts
   - US-127: Workspace E2E tests
4. [Group 3: Record detail drawer](#group-3-record-detail-drawer)
   - US-128: Record detail drawer
5. [Group 4: Page templates](#group-4-page-templates)
   - US-129: Table listing template
   - US-130: Summary dashboard template
   - US-131: Multi-tab detail template
   - US-132: Data explorer template
   - US-133: Form page template
   - US-134: Timeline/activity template
6. [Group 5: VastuChart component](#group-5-vastuchart-component)
   - US-135: VastuChart wrapper
7. [Group 6: Builder mode](#group-6-builder-mode)
   - US-136: Builder mode config panel
8. [Group 7: Dashboard view](#group-7-dashboard-view)
   - US-137: Dashboard view (pinned cards)
9. [Group 8: Confirmation dialogs](#group-8-confirmation-dialogs)
   - US-138: Confirmation dialog system
10. [Database changes summary](#database-changes-summary)
11. [Cross-cutting issues](#cross-cutting-issues)
12. [Risk assessment](#risk-assessment)
13. [Architecture Decision Records](#architecture-decision-records)

---

## Dependency order

The stories have the following dependency chain. Numbers indicate priority wave (must complete wave N before N+1 can start).

```
Wave 0 (prerequisites -- blocking everything):
  US-122  Filter system fixes (FilterNode schema alignment)
  US-120  Mode switch rebuild (replaces incorrect IER component)
  US-121  View engine fixes (ViewState shape, modified indicator)
  US-123  Context menu fixes (ARIA, TruncatedText)
  US-124  Design system compliance sweep

Wave 1 (infrastructure):
  US-138  Confirmation dialog system (used by everything with destructive actions)
  US-135  VastuChart wrapper (used by dashboard, explorer, detail templates)
  US-125  Command palette (needs panel registry)
  US-126  Global keyboard shortcuts (needs workspace layout)

Wave 2 (core features):
  US-128  Record detail drawer (used by table listing, timeline)
  DB migration: page_configurations table (needed by US-136 and all templates)

Wave 3 (templates -- parallelizable after Wave 2):
  US-129  Table listing template
  US-130  Summary dashboard template
  US-131  Multi-tab detail template
  US-132  Data explorer template
  US-133  Form page template
  US-134  Timeline/activity template

Wave 4 (builder + dashboard -- depends on templates existing):
  US-136  Builder mode config panel
  US-137  Dashboard view (pinned cards)

Wave 5 (testing -- after all features):
  US-127  Workspace E2E tests
```

---

## Group 1: Phase 1A bug fixes

### US-120: Mode switch rebuild

**Summary:** Remove the incorrect IER filter ModeSwitch component and replace it with an Editor/Builder/Workflow panel mode switch in the Dockview tab bar.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/ModeSwitch/ModeSwitch.tsx` | **Rewrite** | workspace | Replace IER segmented control with Editor/Builder/Workflow segmented control |
| `packages/workspace/src/components/ModeSwitch/ModeSwitch.module.css` | **Modify** | workspace | Update styles for 3-mode panel switch |
| `packages/workspace/src/components/ModeSwitch/__tests__/ModeSwitch.test.tsx` | **Rewrite** | workspace | New test cases for Editor/Builder/Workflow modes with CASL gating |
| `packages/workspace/src/components/DockviewHost/PanelTab.tsx` | **Modify** | workspace | Add ModeSwitch to the tab bar area (rendered inline with the tab) |
| `packages/workspace/src/stores/panelStore.ts` | **Modify** | workspace | Add `panelModes: Record<PanelId, PanelMode>` to track per-panel mode state |
| `packages/workspace/src/types/panel.ts` | **Modify** | workspace | Add `PanelMode = 'editor' | 'builder' | 'workflow'` type |

#### Database changes

None.

#### API/MCP surface

None.

#### State management

- `panelStore` gains a `panelModes` map: `Record<PanelId, PanelMode>`, defaulting to `'editor'`.
- Actions: `setPanelMode(panelId, mode)`, `getPanelMode(panelId)`.
- Mode state is included in panel serialization for layout persistence.

#### Component hierarchy

```
PanelTab
  -> ModeSwitch (props: panelId, ability)
       reads panelStore.panelModes[panelId]
       calls panelStore.setPanelMode on change
       CASL check: builder requires 'configure' on 'Page' or 'manage' on 'all'
       CASL check: workflow requires 'manage' on 'all' AND page has ephemeral enabled
```

#### Design system mapping

- Wireframe: Group A, Screen 1 -- mode switch in tab bar.
- Mantine `SegmentedControl` component (Style Guide SS9.1).
- Active segment uses `--v-accent-primary` for Editor, `--v-accent-secondary` for Builder, `--v-accent-quaternary` for Workflow.

#### Edge cases

- User without builder/admin role: Builder and Workflow segments are not rendered (hidden, not disabled).
- Workflow mode hidden unless page has `ephemeralEnabled` flag in its config.
- Switching modes with unsaved changes in builder: prompt via `ConfirmDialog` (from US-138, or deferred until US-138 lands).
- Mode state survives panel minimize-to-tray and restore.

#### Testing strategy

- **Unit:** CASL gating (viewer sees only Editor; builder sees Editor+Builder; admin sees all three). Mode change callback fires correctly. Per-panel isolation.
- **Component:** Render ModeSwitch with mock abilities, verify correct segments visible. Verify serialization round-trip.
- Key scenarios: 3 tests for role visibility, 2 for mode switching, 1 for serialization.

#### Estimated complexity

- ModeSwitch.tsx rewrite: **M** (~150 lines)
- PanelTab.tsx modification: **S** (~40 lines)
- panelStore.ts modification: **S** (~50 lines)
- Tests: **M** (~150 lines)

---

### US-121: View engine fixes

**Summary:** Fix ViewState shape, modified indicator, saveView API, ViewToolbar wiring, "New View" behavior, reset control, and view delete confirmation.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/shared/src/types/view.ts` | **Modify** | shared | Add `colorDot` to ViewState type; ensure `id`, `name`, `createdBy`, `isShared` fields are on the View type (already present) |
| `packages/workspace/src/stores/viewStore.ts` | **Modify** | workspace | Fix `saveView` signature (accept `pageId` as part of the view body, not separate). Fix "New View" to reset to blank defaults. |
| `packages/workspace/src/components/ViewToolbar/ViewToolbar.tsx` | **Modify** | workspace | Wire `activePageId` from WorkspaceShell. Fix reset button to be disabled (not hidden) when view is clean. |
| `packages/workspace/src/components/ViewToolbar/ViewToolbar.module.css` | **Modify** | workspace | Add disabled state style for reset link. Fix modified dot to use `--v-accent-tertiary` (goldenrod). |
| `packages/workspace/src/components/ViewToolbar/ViewSelector.tsx` | **Modify** | workspace | Add confirmation dialog before view delete. |
| `packages/workspace/src/components/WorkspaceShell.tsx` | **Modify** | workspace | Pass `activePageId` from Dockview active panel through to ViewToolbar. |

#### Database changes

None (View model already has all fields).

#### API/MCP surface

- Modify `POST /api/workspace/views` to accept `pageId` in the request body (it may already -- verify the route handler accepts it inline).

#### State management

- `viewStore.saveView(name, pageId)` signature unchanged but ensure `pageId` is sent as part of the JSON body (not as a query param or separate call).
- `viewStore.setViewState()` when "New View" is clicked should set `currentViewId: null`, `savedState: null`, `currentState: DEFAULT_VIEW_STATE`.

#### Component hierarchy

```
WorkspaceShell
  -> ViewToolbar (props: pageId from activePanelId resolution, currentUserId)
       -> ViewSelector (props: onDelete triggers ConfirmDialog)
       -> Modified indicator (goldenrod dot + "Modified" + Reset link)
       -> Reset link: disabled={!isModified()} instead of hidden
```

#### Design system mapping

- Modified indicator dot: `--v-accent-tertiary` (goldenrod) per Style Guide SS1.2.
- Reset link disabled state: `--v-text-tertiary` color, `cursor: not-allowed`.

#### Edge cases

- View delete confirmation: "Delete view '{name}'. This cannot be undone." with red action button.
- "New View" when current view has unsaved changes: clear without prompting (the old state is still saved on the server).
- `activePageId` is null during initial workspace load (no panel active): ViewToolbar shows default state, save is disabled.

#### Testing strategy

- **Unit:** `viewStore` -- saveView sends pageId in body. resetView reverts to savedState. New view resets to defaults. isModified returns false when clean.
- **Component:** ViewToolbar shows disabled reset when clean. ViewSelector shows ConfirmDialog on delete click.
- 5 key scenarios.

#### Estimated complexity

- viewStore.ts fix: **S** (~30 lines changed)
- ViewToolbar.tsx fix: **S** (~40 lines changed)
- ViewSelector.tsx delete confirmation: **S** (~30 lines added)
- WorkspaceShell.tsx wiring: **S** (~20 lines changed)
- Tests: **M** (~120 lines)

---

### US-122: Filter system fixes

**Summary:** Align FilterNode type to Patterns Library SS2.4 spec. Fix mode propagation in FilterBar and cell context menu.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/shared/src/types/view.ts` | **Modify** | shared | Align FilterGroup to use `connector: 'AND' \| 'OR'` (not `operator: 'and' \| 'or'`). Align FilterCondition to use `column` (not `field`). |
| `packages/workspace/src/components/FilterSystem/types.ts` | **Verify** | workspace | Already uses `connector` and `column` -- confirm no changes needed. |
| `packages/workspace/src/components/FilterSystem/FilterBar.tsx` | **Modify** | workspace | `handleAddFilter` must pass the active IER mode from `viewFilterStore` when creating a new condition. |
| `packages/workspace/src/components/VastuTable/VastuTable.tsx` | **Modify** | workspace | Cell context menu "Include" and "Exclude" actions must pass distinct `mode` values (`'include'` vs `'exclude'`). |
| `packages/workspace/src/components/FilterSystem/CompositeFilterBuilder.tsx` | **Verify** | workspace | Confirm it works with the corrected schema. |
| `packages/workspace/src/components/FilterSystem/__tests__/FilterBar.test.tsx` | **Modify** | workspace | Update tests to use corrected FilterNode schema. |
| `packages/workspace/src/components/FilterSystem/__tests__/FilterPill.test.tsx` | **Modify** | workspace | Update tests. |
| `packages/workspace/src/stores/__tests__/viewStore.test.ts` | **Modify** | workspace | Update test fixtures if they use the old schema. |

#### Database changes

None (view stateJson is stored as JSON -- existing saved views with old schema will need to be handled gracefully).

**WARNING:** This is a breaking change to the shared FilterNode type. Any existing persisted views in the database that use `operator`/`field` instead of `connector`/`column` will break.

> **HUMAN DECISION NEEDED:** Decide migration strategy for existing persisted views:
> (A) Write a one-time DB migration script to rewrite `state_json` in the `views` table, transforming `operator` to `connector` and `field` to `column`.
> (B) Add runtime normalization in `viewStore.loadView()` that maps old schema to new on read.
> (C) Both A and B (belt and suspenders).
> Recommendation: Option C -- migration script for correctness, runtime normalization for resilience.

#### API/MCP surface

None.

#### State management

No store changes. The types flow from shared into the filter system.

#### Component hierarchy

No hierarchy changes. FilterBar.handleAddFilter now reads `useViewFilterStore.getMode(viewId)` and passes it to `createCondition()`.

#### Design system mapping

- Patterns Library SS2.4: FilterNode spec `{ type, connector?, children?, column?, mode?, value? }`.
- Patterns Library SS2.1: IER mode propagation.

#### Edge cases

- Existing views with old `operator`/`field` keys: runtime normalization prevents crash.
- Regex mode disabled for number/date/boolean: `createCondition` falls back to `'include'` if mode is `'regex'` on unsupported type.

#### Testing strategy

- **Unit:** FilterNode round-trip serialization/deserialization. createCondition with active mode. FilterBar passes mode to new conditions. Context menu include/exclude pass correct mode.
- 6 key scenarios.

#### Estimated complexity

- shared/types/view.ts: **S** (~20 lines changed)
- FilterBar.tsx: **S** (~10 lines changed)
- VastuTable.tsx context menu: **S** (~15 lines changed)
- Test updates: **M** (~100 lines)

---

### US-123: Context menu fixes

**Summary:** Add `role="menu"` with `tabIndex={-1}` to context menu container. Use `TruncatedText` in ContextMenuItem.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/ContextMenu/ContextMenu.tsx` | **Verify** | workspace | Already has `role="menu"` and `tabIndex={-1}` on line 284. Confirm compliance. |
| `packages/workspace/src/components/ContextMenu/ContextMenuItem.tsx` | **Verify** | workspace | Already uses `TruncatedText` on line 205. Confirm compliance. |

**Analysis:** Reading the existing code, ContextMenu.tsx already has `role="menu"` (line 283) and `tabIndex={-1}` (line 284). ContextMenuItem.tsx already uses `<TruncatedText>` for the label (line 205). Both bugs (#139, #140) may have already been fixed in a later commit. Verification is needed but no code changes are expected.

#### Database changes

None.

#### Testing strategy

- **Unit:** Verify `role="menu"` attribute renders. Verify `TruncatedText` wraps labels. Snapshot test or attribute assertion.
- 2 key scenarios.

#### Estimated complexity

- Verification only: **S** (~0 lines if already fixed, ~10 lines if not)
- Test verification: **S** (~20 lines)

---

### US-124: Design system compliance sweep

**Summary:** Fix token usage, TruncatedText usage, EmptyState component usage, and audit all workspace `.tsx` and `.css` files.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/SidebarNav/SidebarUserAvatar.tsx` | **Modify** | workspace | Change `color: 'var(--v-text-on-accent)'` to `color: 'var(--v-text-inverted)'` (AC-1, #114). Token `--v-text-on-accent` does not exist in the style guide. |
| `packages/workspace/src/components/SidebarNav/SidebarItem.tsx` | **Modify** | workspace | Wrap nav labels in `TruncatedText` component instead of relying on CSS `title` attribute (AC-2, #115). Line 88: `<span className={classes.navItemLabel} title={label}>{label}</span>` should become `<TruncatedText maxWidth={120}>{label}</TruncatedText>`. |
| `packages/workspace/src/components/EmptyState/EmptyState.tsx` | **Create** | workspace | New shared component per Style Guide SS9.3 and Patterns Library SS8. Icon + message + action button. |
| `packages/workspace/src/components/EmptyState/EmptyState.module.css` | **Create** | workspace | Styles for centered layout, icon, message, action. |
| `packages/workspace/src/components/EmptyState/__tests__/EmptyState.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/components/VastuTable/VastuTable.tsx` | **Modify** | workspace | Replace inline empty state (IconTableOff) with `EmptyState` component (AC-3, #161). |
| All `.tsx` files in workspace | **Audit** | workspace | Grep for hardcoded hex values (AC-4), font-weight 600/700 (AC-5), icon-only buttons without aria-label (AC-6). |

#### Database changes

None.

#### Design system mapping

- Patterns Library SS8: Empty states -- icon (32px, `--v-text-tertiary`), message (`--v-text-secondary`), action button.
- Style Guide SS1.1: `--v-text-inverted` for text on filled backgrounds.
- Patterns Library SS7: TruncatedText for all data-driven text in constrained containers.

#### Edge cases

- EmptyState must be responsive and center in its container regardless of size.
- EmptyState action prop is optional (some contexts are informational only).

#### Testing strategy

- **Component:** EmptyState renders icon, message, action. Verify centering. VastuTable empty state uses EmptyState.
- **Audit:** Automated grep for violations (can be a test or CI check).
- 4 key scenarios.

#### Estimated complexity

- EmptyState component: **M** (~100 lines)
- SidebarUserAvatar fix: **S** (~5 lines)
- SidebarItem TruncatedText: **S** (~10 lines)
- VastuTable empty state: **S** (~20 lines)
- Audit + fixes: **S** (~30 lines)
- Tests: **M** (~100 lines)

---

## Group 2: Phase 1A carry-overs

### US-125: Command palette

**Summary:** Global search and command overlay via Cmd+K, built on Mantine Spotlight.

> **HUMAN DECISION NEEDED:** `@mantine/spotlight` is NOT currently in workspace dependencies (only shell has `@mantine/notifications`). Need to add `@mantine/spotlight` to `packages/workspace/package.json`. This is a new external dependency.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/CommandPalette/CommandPalette.tsx` | **Create** | workspace | Mantine Spotlight wrapper with custom result rendering. |
| `packages/workspace/src/components/CommandPalette/CommandPalette.module.css` | **Create** | workspace | Custom styling over Spotlight defaults. |
| `packages/workspace/src/components/CommandPalette/CommandPaletteResult.tsx` | **Create** | workspace | Custom result item: icon + name + template type + row count for pages; record title + type for recent records; command name for commands. |
| `packages/workspace/src/components/CommandPalette/__tests__/CommandPalette.test.tsx` | **Create** | workspace | Tests for search, grouping, keyboard nav. |
| `packages/workspace/src/hooks/useCommandPaletteActions.ts` | **Create** | workspace | Hook to aggregate page list (from registry), recent records (from localStorage), and commands (static list). |
| `packages/workspace/src/components/WorkspaceShell.tsx` | **Modify** | workspace | Mount CommandPalette at workspace root. |
| `packages/workspace/src/components/TrayBar/TrayBar.tsx` | **Modify** | workspace | Add search button that triggers Spotlight open. |
| `packages/workspace/package.json` | **Modify** | workspace | Add `@mantine/spotlight` dependency. |

#### Database changes

None.

#### API/MCP surface

None directly. In future phases, command palette will be an MCP tool (`spotlight.open`, `spotlight.search`).

#### State management

- Recent records stored in `localStorage` (key: `vastu-recent-records`, value: array of `{ id, title, type, pageId, timestamp }`).
- No Zustand store needed -- Spotlight manages its own open/close state.

#### Component hierarchy

```
WorkspaceShell
  -> CommandPalette (always mounted, portal-based)
       -> SpotlightProvider (Mantine)
            -> Custom search input (debounced 150ms)
            -> Grouped results:
                 PAGES section -> CommandPaletteResult (icon + name + templateType + rowCount)
                 RECENT RECORDS -> CommandPaletteResult (title + type)
                 COMMANDS -> CommandPaletteResult (prefixed ">")
            -> Footer hints: arrow-key icons + descriptions
```

#### Design system mapping

- Wireframe: Group D, Screen 20.
- Style Guide SS6: `--v-z-spotlight` (70) for z-index.
- Style Guide SS5: `--v-shadow-md` for floating panel.
- Patterns Library SS11.1: `Cmd+K` global shortcut.

#### Edge cases

- No results: show "No results for '{query}'" empty state.
- User types ">" prefix: switch to commands-only mode.
- Cmd+K while Spotlight is open: close it (toggle behavior).
- Escape closes Spotlight. Focus returns to previous element.
- Tab key on a result: opens in new panel (splits instead of replacing).

#### Testing strategy

- **Component:** Spotlight opens on trigger. Search filters results. Keyboard navigation (up/down/enter/tab/escape). Result grouping. Footer hints render.
- 6 key scenarios.

#### Estimated complexity

- CommandPalette.tsx: **M** (~200 lines)
- CommandPaletteResult.tsx: **S** (~80 lines)
- useCommandPaletteActions.ts: **M** (~100 lines)
- Tests: **M** (~150 lines)

---

### US-126: Global keyboard shortcuts

**Summary:** Register keyboard shortcuts at the workspace layout level with context-aware suppression.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/hooks/useKeyboardShortcuts.ts` | **Create** | workspace | Central keyboard shortcut registration hook. |
| `packages/workspace/src/hooks/__tests__/useKeyboardShortcuts.test.ts` | **Create** | workspace | Tests for shortcut handling, suppression, context. |
| `packages/workspace/src/components/ShortcutsModal/ShortcutsModal.tsx` | **Create** | workspace | Reference modal showing all shortcuts grouped by context. |
| `packages/workspace/src/components/ShortcutsModal/ShortcutsModal.module.css` | **Create** | workspace | Modal styles. |
| `packages/workspace/src/components/ShortcutsModal/__tests__/ShortcutsModal.test.tsx` | **Create** | workspace | Component test. |
| `packages/workspace/src/components/WorkspaceShell.tsx` | **Modify** | workspace | Mount `useKeyboardShortcuts` hook and `ShortcutsModal`. |
| `packages/workspace/src/components/VastuTable/VastuTable.tsx` | **Modify** | workspace | Add table-specific keyboard bindings (j/k/o/x/[/]) when table is focused. |

#### Database changes

None.

#### State management

- `ShortcutsModal` open state: local React state in WorkspaceShell or a simple Zustand atom.
- No persistent state.

#### Component hierarchy

```
WorkspaceShell
  -> useKeyboardShortcuts() (registers global handlers)
  -> ShortcutsModal (triggered by "?")
       -> Grouped sections: General, Table, Drawer, Sidebar
       -> Each row: Kbd component + description
```

#### Design system mapping

- Wireframe: Group F -- Keyboard shortcuts reference.
- Style Guide SS9.1: Mantine `Kbd` component for shortcut display.
- Style Guide SS9.1: Mantine `Modal` for the reference overlay.
- Patterns Library SS11: All shortcuts listed.

#### Edge cases

- Shortcuts suppressed when focus is in `<input>`, `<textarea>`, `<select>`, or `[contenteditable]`.
- Exception: Cmd+K and Cmd+S work even in inputs (they are meta-key combinations).
- "?" shortcut must not fire when typing "?" in an input.
- Focus management: tab order follows sidebar -> tab bar -> toolbar -> content -> tray.
- Focus rings visible only on `:focus-visible`.

#### Testing strategy

- **Unit:** Shortcut fires callback. Suppressed in input. Meta shortcuts work in input. Context-specific shortcuts only fire when context element is focused.
- **Component:** ShortcutsModal renders all groups. "?" opens modal. Escape closes.
- 6 key scenarios.

#### Estimated complexity

- useKeyboardShortcuts.ts: **M** (~200 lines)
- ShortcutsModal.tsx: **M** (~150 lines)
- WorkspaceShell.tsx modification: **S** (~20 lines)
- VastuTable keyboard bindings: **S** (~80 lines)
- Tests: **M** (~200 lines)

---

### US-127: Workspace E2E tests

**Summary:** Playwright E2E tests for the full workspace surface.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/e2e/workspace.spec.ts` | **Create** | workspace | Core workspace E2E tests: load, sidebar, panels, tray. |
| `packages/workspace/e2e/command-palette.spec.ts` | **Create** | workspace | Command palette E2E. |
| `packages/workspace/e2e/table-interactions.spec.ts` | **Create** | workspace | VastuTable sort, filter, view save/load. |
| `packages/workspace/e2e/mode-switch.spec.ts` | **Create** | workspace | Mode switch toggle. |
| `packages/workspace/e2e/fixtures/workspace-page.ts` | **Create** | workspace | Page object model for workspace. |
| `packages/workspace/e2e/fixtures/seed-data.ts` | **Create** | workspace | Mock page registrations and seed data setup. |

#### Database changes

None.

#### Testing strategy

- AC-1: Workspace loads with sidebar + Dockview area.
- AC-2: Sidebar toggle via click and Cmd+B.
- AC-3: Open panel from sidebar, verify tab appears.
- AC-4: Split panels, verify both visible.
- AC-5: Minimize to tray, verify tray item, restore.
- AC-6: Command palette opens, search, select, panel opens.
- AC-7: Table sort -- click header, verify order.
- AC-8: Table filter -- add pill, verify row count.
- AC-9: View save/load -- save, reload, verify state.
- AC-10: Mode switch -- toggle Editor/Builder.

#### Estimated complexity

- workspace.spec.ts: **L** (~300 lines)
- command-palette.spec.ts: **M** (~100 lines)
- table-interactions.spec.ts: **M** (~200 lines)
- mode-switch.spec.ts: **S** (~80 lines)
- Fixtures: **M** (~150 lines)

---

## Group 3: Record detail drawer

### US-128: Record detail drawer

**Summary:** Slide-out drawer from the right when a table row is clicked. Tabs for Details, Items, History, Notes, Permissions. Drawer-to-panel promotion.

> **HUMAN DECISION NEEDED:** The Notes tab requires a rich text editor. The requirements mention "Mantine TipTap or similar." `@mantine/tiptap` and its peer dependencies (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, etc.) are NOT in the dependency tree. Options:
> (A) Add `@mantine/tiptap` + TipTap peer deps (~5 packages).
> (B) Use a simple `<Textarea>` for Phase 1B and defer rich text to Phase 2.
> (C) Use Mantine's built-in `Textarea` with auto-resize as a placeholder, with a TODO for TipTap.
> Recommendation: Option A for full spec compliance, but option C reduces scope significantly.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/RecordDrawer/RecordDrawer.tsx` | **Create** | workspace | Main drawer container with header, tabs, footer. |
| `packages/workspace/src/components/RecordDrawer/RecordDrawer.module.css` | **Create** | workspace | Drawer styles: 420px width, slide animation. |
| `packages/workspace/src/components/RecordDrawer/RecordDrawerHeader.tsx` | **Create** | workspace | Prev/next arrows, pop-to-panel, expand, overflow, close. |
| `packages/workspace/src/components/RecordDrawer/RecordDrawerFooter.tsx` | **Create** | workspace | Sticky footer: Edit, Archive, Duplicate, Panel buttons. |
| `packages/workspace/src/components/RecordDrawer/tabs/DetailsTab.tsx` | **Create** | workspace | Sectioned field list with label/value pairs. |
| `packages/workspace/src/components/RecordDrawer/tabs/ItemsTab.tsx` | **Create** | workspace | VastuTable in compact mode. |
| `packages/workspace/src/components/RecordDrawer/tabs/HistoryTab.tsx` | **Create** | workspace | Audit trail from audit_events, filtered to record. |
| `packages/workspace/src/components/RecordDrawer/tabs/NotesTab.tsx` | **Create** | workspace | Rich text editor or placeholder textarea. |
| `packages/workspace/src/components/RecordDrawer/tabs/PermissionsTab.tsx` | **Create** | workspace | Object-level ACL editor (UI only, enforcement in Phase 2). |
| `packages/workspace/src/components/RecordDrawer/__tests__/RecordDrawer.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/stores/drawerStore.ts` | **Create** | workspace | Zustand store for drawer open/close state, current record, active tab. |
| `packages/workspace/src/hooks/useDrawerToPanel.ts` | **Create** | workspace | Hook implementing drawer-to-panel promotion logic. |

#### Database changes

None. History tab reads from existing `audit_events` table via API.

#### API/MCP surface

- `GET /api/workspace/records/:id` -- fetch record detail (new route).
- `GET /api/workspace/records/:id/history` -- fetch audit events for a record (new route).
- `PATCH /api/workspace/records/:id` -- update record (new route, for edit).
- `POST /api/workspace/records/:id/notes` -- save notes (new route).

New API route files:
- `packages/shell/src/app/api/workspace/records/[id]/route.ts`
- `packages/shell/src/app/api/workspace/records/[id]/history/route.ts`
- `packages/shell/src/app/api/workspace/records/[id]/notes/route.ts`

#### State management

New `drawerStore` (Zustand):
```
{
  isOpen: boolean;
  recordId: string | null;
  activeTab: string;
  recordIndex: number;  // position in the current table data
  totalRecords: number;
  scrollPosition: number;
  openDrawer(recordId, index, total): void;
  closeDrawer(): void;
  setActiveTab(tab): void;
  navigateRecord(direction: 'prev' | 'next'): void;
}
```

#### Component hierarchy

```
TableListingTemplate (or any template with table)
  -> VastuTable (onRowClick -> openDrawer)
  -> RecordDrawer (reads drawerStore)
       -> RecordDrawerHeader
            -> prev/next arrows (drawerStore.navigateRecord)
            -> pop-to-panel button (useDrawerToPanel)
            -> expand full width button
            -> overflow menu (ContextMenu)
            -> close button
       -> Mantine Tabs (RBAC-gated via VastuTabs)
            -> DetailsTab
            -> ItemsTab (VastuTable compact)
            -> HistoryTab
            -> NotesTab
            -> PermissionsTab (admin only)
       -> RecordDrawerFooter
            -> Edit (primary), Archive, Duplicate, Panel
```

#### Design system mapping

- Wireframe: Group B, Screen 7.
- Patterns Library SS4: Drawer-to-panel promotion (animation spec: 200ms ease-in for close, 300ms for tab highlight).
- Style Guide SS6: `--v-z-drawer` (50) for z-index.
- Style Guide SS7: `--v-transition-slide` for drawer animation.
- Style Guide SS3.1: Card (detail/settings) padding = 24px.

#### Edge cases

- Click outside drawer closes it. Table row stays highlighted.
- Arrow key navigation at bounds: first record -> prev wraps or disabled; last record -> next wraps or disabled.
- Promote to panel: drawer slides out, panel opens with same tab + scroll position + dirty state.
- Permissions tab hidden for non-admin users (CASL check).
- Record deleted while drawer is open: show error state with "Record not found" message.
- Network error loading record detail: error state with retry button.
- Empty Items tab: EmptyState "No line items for this record."
- Empty History tab: EmptyState "No events recorded yet."

#### Testing strategy

- **Component:** Drawer opens on row click. Tabs render correct content. RBAC hides Permissions tab. Prev/next navigation. Promote to panel. Close on outside click.
- 8 key scenarios.

#### Estimated complexity

- RecordDrawer.tsx: **L** (~300 lines)
- RecordDrawerHeader.tsx: **M** (~150 lines)
- RecordDrawerFooter.tsx: **S** (~80 lines)
- DetailsTab.tsx: **M** (~150 lines)
- ItemsTab.tsx: **M** (~100 lines)
- HistoryTab.tsx: **M** (~120 lines)
- NotesTab.tsx: **S** (~80 lines)
- PermissionsTab.tsx: **M** (~120 lines)
- drawerStore.ts: **S** (~80 lines)
- useDrawerToPanel.ts: **M** (~100 lines)
- API routes (3 files): **S** each (~60 lines each)
- Tests: **L** (~300 lines)

---

## Group 4: Page templates

### Template infrastructure (shared across all templates)

Before individual templates, a shared template infrastructure is needed.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/types.ts` | **Create** | workspace | `TemplateConfig` base interface, `TemplateProps` interface, template registry types. |
| `packages/workspace/src/templates/registry.ts` | **Create** | workspace | Template-to-panel registration helper. Each template auto-registers in the panel registry. |
| `packages/workspace/src/templates/useTemplateConfig.ts` | **Create** | workspace | Hook to fetch page configuration from `page_configurations` table, with fallback to sensible defaults. |
| `packages/workspace/src/templates/TemplateSkeleton.tsx` | **Create** | workspace | Shared loading skeleton wrapper for all templates. |

#### Estimated complexity

- types.ts: **S** (~60 lines)
- registry.ts: **S** (~40 lines)
- useTemplateConfig.ts: **M** (~100 lines)
- TemplateSkeleton.tsx: **S** (~50 lines)

---

### US-129: Table listing template

**Summary:** Full data table page with all Phase 1A features + KPI summary strip + record drawer integration.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/TableListing/TableListingTemplate.tsx` | **Create** | workspace | Main template component. |
| `packages/workspace/src/templates/TableListing/TableListingTemplate.module.css` | **Create** | workspace | Template styles. |
| `packages/workspace/src/templates/TableListing/KPISummaryStrip.tsx` | **Create** | workspace | Optional KPI cards above the table. |
| `packages/workspace/src/templates/TableListing/__tests__/TableListingTemplate.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/panels/index.ts` | **Modify** | workspace | Register `table-listing` panel type. |

#### Database changes

None (template reads from `page_configurations` for its config).

#### Component hierarchy

```
TableListingTemplate (registered as 'table-listing' panel)
  -> useTemplateConfig(pageId) -> config or defaults
  -> KPISummaryStrip (if config.summaryStrip enabled)
       -> KPICard[] (count, sum, avg)
  -> FilterBar (from Phase 1A)
  -> VastuTable (from Phase 1A, with all features)
       onRowClick -> RecordDrawer (US-128)
       onContextMenu -> VastuContextMenu
  -> Pagination (from VastuTable)
  -> ViewToolbar (from Phase 1A, active)
```

#### Design system mapping

- Wireframe: Group B, Screen 4.
- Patterns Library SS1 (entire section).
- Patterns Library SS6: Loading state choreography -- skeleton for table + cards independently.
- Patterns Library SS8: EmptyState when no records match filters.

#### Edge cases

- Zero-config render: template renders with default columns derived from data shape.
- No data source configured: EmptyState "No data source configured. Open builder mode to connect a data source."
- KPI strip toggleable via config; hidden by default.
- Loading: skeleton for KPI strip and table independently.

#### Testing strategy

- **Component:** Renders with default config. KPI strip shown/hidden via config. Row click opens drawer. Context menu works. View toolbar active.
- 5 key scenarios.

#### Estimated complexity

- TableListingTemplate.tsx: **L** (~350 lines)
- KPISummaryStrip.tsx: **M** (~120 lines)
- Tests: **M** (~150 lines)

---

### US-130: Summary dashboard template

**Summary:** Dashboard with KPI cards, charts, and summary tables. Time range controls.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/SummaryDashboard/SummaryDashboardTemplate.tsx` | **Create** | workspace | Main template. |
| `packages/workspace/src/templates/SummaryDashboard/SummaryDashboardTemplate.module.css` | **Create** | workspace | Layout styles. |
| `packages/workspace/src/templates/SummaryDashboard/TimeRangeControl.tsx` | **Create** | workspace | Dropdown with presets + comparison toggle. |
| `packages/workspace/src/templates/SummaryDashboard/KPICardRow.tsx` | **Create** | workspace | Row of metric cards with sparklines. |
| `packages/workspace/src/templates/SummaryDashboard/ChartRow.tsx` | **Create** | workspace | 1-2 charts side by side. |
| `packages/workspace/src/templates/SummaryDashboard/MiniSummaryTable.tsx` | **Create** | workspace | Top N records table with "View all" link. |
| `packages/workspace/src/templates/SummaryDashboard/__tests__/SummaryDashboardTemplate.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/panels/index.ts` | **Modify** | workspace | Register `summary-dashboard` panel type. |

#### Database changes

None.

#### Component hierarchy

```
SummaryDashboardTemplate (registered as 'summary-dashboard')
  -> TimeRangeControl (presets dropdown + comparison toggle)
  -> KPICardRow
       -> KPICard[] (label, value, delta, sparkline via VastuChart)
  -> ChartRow
       -> VastuChart[] (line/area/bar/donut from config)
  -> MiniSummaryTable (VastuTable compact) + optional chart
  -> ViewToolbar (active)
  -> Auto-refresh toggle
```

#### Design system mapping

- Wireframe: Group D, Screen 16.
- Patterns Library SS3 (entire section).
- Style Guide SS10: Chart data visualization, CHART_SERIES_COLORS palette.
- Style Guide SS2.2: `--v-text-2xl` for KPI numbers, `--v-text-3xl` for hero KPIs.

#### Edge cases

- Zero-config: show placeholder KPI cards with "Configure in builder" message.
- Auto-refresh off by default; configurable interval.
- Time range "vs previous period" toggle: shows delta percentage on KPI cards.
- Skeleton loading per card/chart independently.
- "View all" links open table listing in new panel (via panelStore.openPanel).

#### Testing strategy

- **Component:** Renders with defaults. Time range changes trigger data refetch. KPI cards show values. Charts render. Auto-refresh toggle.
- 5 key scenarios.

#### Estimated complexity

- SummaryDashboardTemplate.tsx: **L** (~300 lines)
- TimeRangeControl.tsx: **M** (~120 lines)
- KPICardRow.tsx: **M** (~100 lines)
- ChartRow.tsx: **S** (~80 lines)
- MiniSummaryTable.tsx: **M** (~100 lines)
- Tests: **M** (~150 lines)

---

### US-131: Multi-tab detail template

**Summary:** Entity detail page with header band and RBAC-gated horizontal tabs.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/MultiTabDetail/MultiTabDetailTemplate.tsx` | **Create** | workspace | Main template. |
| `packages/workspace/src/templates/MultiTabDetail/MultiTabDetailTemplate.module.css` | **Create** | workspace | Layout styles. |
| `packages/workspace/src/templates/MultiTabDetail/EntityHeader.tsx` | **Create** | workspace | Avatar, name, status badge, summary stats, actions. |
| `packages/workspace/src/templates/MultiTabDetail/tabs/OverviewTab.tsx` | **Create** | workspace | Two-column: fields + mini charts. |
| `packages/workspace/src/components/VastuTabs/VastuTabs.tsx` | **Create** | workspace | RBAC-gated Mantine Tabs wrapper. Hides tabs user cannot access. |
| `packages/workspace/src/components/VastuTabs/__tests__/VastuTabs.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/templates/MultiTabDetail/__tests__/MultiTabDetailTemplate.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/panels/index.ts` | **Modify** | workspace | Register `multi-tab-detail` panel type. |

#### Database changes

None.

#### Component hierarchy

```
MultiTabDetailTemplate (registered as 'multi-tab-detail')
  -> EntityHeader (avatar, name, status, stats, actions)
  -> VastuTabs (RBAC-gated)
       -> OverviewTab (two-column: fields + mini charts)
       -> sub-table tabs (VastuTable compact)
       -> ActivityTab (timeline pattern)
       -> NotesTab (rich text)
       -> PermissionsTab (admin only)
       -> FilesTab (file list)
  -> URL updates with ?tab= for deep-linking
```

#### Design system mapping

- Wireframe: Group D, Screen 17.
- Style Guide SS2.2: `--v-text-xl` for entity name.
- Patterns Library SS6: Per-tab skeleton loading.

#### Edge cases

- Tab deep-link: URL `?tab=orders` selects the Orders tab on load.
- RBAC: Permissions tab hidden for non-admins.
- Tab list configurable via builder config (add/remove/reorder).
- Entity not found: error state with back button.

#### Testing strategy

- **Component:** Renders header. Tabs visible per RBAC. URL updates on tab switch. Per-tab skeleton loading.
- 5 key scenarios.

#### Estimated complexity

- MultiTabDetailTemplate.tsx: **L** (~300 lines)
- EntityHeader.tsx: **M** (~150 lines)
- OverviewTab.tsx: **M** (~150 lines)
- VastuTabs.tsx: **M** (~100 lines)
- Tests: **M** (~200 lines)

---

### US-132: Data explorer template

**Summary:** Chart-first analytics page with metric/grouping/time controls and companion table.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/DataExplorer/DataExplorerTemplate.tsx` | **Create** | workspace | Main template. |
| `packages/workspace/src/templates/DataExplorer/DataExplorerTemplate.module.css` | **Create** | workspace | Layout styles. |
| `packages/workspace/src/templates/DataExplorer/ExplorerControls.tsx` | **Create** | workspace | Metric picker, group-by, time resolution, filter pills. |
| `packages/workspace/src/templates/DataExplorer/ChartTypeToggle.tsx` | **Create** | workspace | Line/Bar/Table segmented control. |
| `packages/workspace/src/templates/DataExplorer/__tests__/DataExplorerTemplate.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/panels/index.ts` | **Modify** | workspace | Register `data-explorer` panel type. |

#### Database changes

None.

#### Component hierarchy

```
DataExplorerTemplate (registered as 'data-explorer')
  -> ExplorerControls (metric, group-by, time resolution, filters)
  -> ChartTypeToggle (Line / Bar / Table segmented control)
  -> VastuChart (main chart, configurable type)
       -> Brush/zoom on time axis
       -> "Reset zoom" button when zoomed
  -> VastuTable (companion table, same data, sortable)
  -> Export: PNG (chart), CSV (table)
  -> ViewToolbar (active)
```

#### Design system mapping

- Wireframe: Group D, Screen 18.
- Patterns Library SS3: Charts.
- Style Guide SS9.1: Mantine `SegmentedControl` for chart type toggle.

#### Edge cases

- Chart and table stay synced: filtering chart filters table and vice versa.
- Brush zoom: temporary state, not saved to view.
- "Reset zoom" appears only when zoomed.
- Export PNG: use html-to-image or Recharts built-in SVG export.

> **HUMAN DECISION NEEDED:** PNG export of charts. Options:
> (A) Use Recharts' built-in SVG serialization (no new dependency).
> (B) Add `html-to-image` or `html2canvas` (new dependency).
> Recommendation: Option A -- serialize Recharts SVG to PNG via canvas. No new dependency.

#### Testing strategy

- **Component:** Controls update chart. Chart type toggle switches. Table syncs with chart. Export buttons work.
- 5 key scenarios.

#### Estimated complexity

- DataExplorerTemplate.tsx: **L** (~350 lines)
- ExplorerControls.tsx: **M** (~150 lines)
- ChartTypeToggle.tsx: **S** (~50 lines)
- Tests: **M** (~150 lines)

---

### US-133: Form page template

**Summary:** Data entry form with single-page and multi-step wizard modes.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/FormPage/FormPageTemplate.tsx` | **Create** | workspace | Main template with mode switching (single/wizard). |
| `packages/workspace/src/templates/FormPage/FormPageTemplate.module.css` | **Create** | workspace | Layout styles. |
| `packages/workspace/src/templates/FormPage/FormWizard.tsx` | **Create** | workspace | Multi-step wizard with Mantine Stepper. |
| `packages/workspace/src/templates/FormPage/SearchOrCreate.tsx` | **Create** | workspace | Search-or-create pattern component. |
| `packages/workspace/src/templates/FormPage/useFormDraft.ts` | **Create** | workspace | Hook for auto-save draft to localStorage every 30s. |
| `packages/workspace/src/templates/FormPage/__tests__/FormPageTemplate.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/panels/index.ts` | **Modify** | workspace | Register `form-page` panel type. |

#### Database changes

None.

#### Component hierarchy

```
FormPageTemplate (registered as 'form-page')
  -> config.mode === 'wizard' ? FormWizard : SinglePageForm
  -> SinglePageForm
       -> @mantine/form with field groups
       -> Field types: TextInput, Select, MultiSelect, NumberInput, DatePickerInput, Textarea, FileInput, Checkbox, Radio
       -> Validation: inline on blur, required marked with *
       -> Save button
  -> FormWizard
       -> Mantine Stepper (step indicator)
       -> Per-step field groups
       -> Back/Next buttons (sticky footer)
       -> Step validation before "Next"
       -> URL: ?step=N
  -> SearchOrCreate (search existing + "or create new")
  -> useFormDraft (auto-save 30s, restore on return)
  -> Dirty state detection: beforeunload + navigation guard
```

#### Design system mapping

- Wireframe: Group F -- Form page template.
- Patterns Library SS9 (entire section).
- Style Guide SS9.1: Mantine `Stepper` for multi-step.
- Patterns Library SS9.1: Inline on blur validation.
- Patterns Library SS9.3: Dirty state with goldenrod indicator.

#### Edge cases

- Auto-save draft key: `vastu-form-draft-{pageId}`. Cleared on successful submit.
- Navigate away with dirty state: ConfirmDialog "You have unsaved changes."
- Multi-step back: preserves all field values (no data loss).
- Password field: strength indicator (use Mantine Progress with color segments).
- File upload: placeholder UI (actual upload infrastructure in Phase 2).
- Submit writes audit event via API.

#### Testing strategy

- **Component:** Single form validates on blur. Wizard step navigation. Draft auto-save/restore. Dirty state detection. SearchOrCreate pattern.
- 6 key scenarios.

#### Estimated complexity

- FormPageTemplate.tsx: **L** (~300 lines)
- FormWizard.tsx: **L** (~300 lines)
- SearchOrCreate.tsx: **M** (~120 lines)
- useFormDraft.ts: **M** (~80 lines)
- Tests: **M** (~200 lines)

---

### US-134: Timeline/activity template

**Summary:** Activity stream with date grouping, type filters, and infinite scroll.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/TimelineActivity/TimelineActivityTemplate.tsx` | **Create** | workspace | Main template. |
| `packages/workspace/src/templates/TimelineActivity/TimelineActivityTemplate.module.css` | **Create** | workspace | Layout styles. |
| `packages/workspace/src/templates/TimelineActivity/TimelineEvent.tsx` | **Create** | workspace | Single event: colored dot, title, badge, description, timestamp, avatar. |
| `packages/workspace/src/templates/TimelineActivity/DateGroupHeader.tsx` | **Create** | workspace | "Today, Mar 21" group header. |
| `packages/workspace/src/templates/TimelineActivity/TimelineFilters.tsx` | **Create** | workspace | Search, type pills, date range, user dropdown. |
| `packages/workspace/src/templates/TimelineActivity/__tests__/TimelineActivityTemplate.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/panels/index.ts` | **Modify** | workspace | Register `timeline-activity` panel type. |

#### Database changes

None (reads from `audit_events` table).

#### Component hierarchy

```
TimelineActivityTemplate (registered as 'timeline-activity')
  -> TimelineFilters (search, type pills, date range, user)
  -> DateGroupHeader ("Today, Mar 21")
       -> TimelineEvent[] (dot, title, badge, desc, timestamp, avatar)
            -> Click: open related record (drawer or new panel)
            -> Expandable detail: full payload, related events
  -> Infinite scroll (IntersectionObserver for load-more)
  -> EmptyState: "No activity recorded yet"
  -> ViewToolbar (active)
```

#### Design system mapping

- Wireframe: Group F -- Timeline activity template.
- Event type colors: green=order (#1D9E75), blue=payment (#2378CB), gray=system (#666666), purple=agent (#7B61A6).
- Patterns Library SS8: EmptyState for no events.

#### Edge cases

- Infinite scroll: load 50 events per page. IntersectionObserver on a sentinel element.
- Type filter pills: toggle on/off (multi-select).
- Click event with no related record: no navigation, just expand detail.
- Long event descriptions: TruncatedText with expand on click.

#### Testing strategy

- **Component:** Renders events grouped by date. Type filter toggles. Infinite scroll loads more. Expand event detail. EmptyState.
- 5 key scenarios.

#### Estimated complexity

- TimelineActivityTemplate.tsx: **L** (~300 lines)
- TimelineEvent.tsx: **M** (~120 lines)
- DateGroupHeader.tsx: **S** (~40 lines)
- TimelineFilters.tsx: **M** (~150 lines)
- Tests: **M** (~150 lines)

---

## Group 5: VastuChart component

### US-135: VastuChart wrapper

**Summary:** Recharts wrapper with consistent config, color palette, and interaction patterns.

> **HUMAN DECISION NEEDED:** `recharts` is NOT currently in `packages/workspace/package.json` dependencies. It needs to be added. This is a new external dependency.
> Also need `recharts` types: `@types/recharts` or Recharts v2+ has built-in types.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/VastuChart/VastuChart.tsx` | **Create** | workspace | Main chart wrapper. |
| `packages/workspace/src/components/VastuChart/VastuChart.module.css` | **Create** | workspace | Chart container, legend, tooltip styles. |
| `packages/workspace/src/components/VastuChart/ChartTooltip.tsx` | **Create** | workspace | Custom tooltip: all series values, sorted by value desc. |
| `packages/workspace/src/components/VastuChart/ChartLegend.tsx` | **Create** | workspace | Custom HTML legend: square swatches, click toggle, double-click solo. |
| `packages/workspace/src/components/VastuChart/ChartConfigPanel.tsx` | **Create** | workspace | Collapsible config panel (gear icon): basic + advanced tiers. |
| `packages/workspace/src/components/VastuChart/chartColors.ts` | **Create** | workspace | `CHART_SERIES_COLORS` array and helper functions. |
| `packages/workspace/src/components/VastuChart/types.ts` | **Create** | workspace | ChartConfig, ChartType, SeriesConfig types. |
| `packages/workspace/src/components/VastuChart/__tests__/VastuChart.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/components/VastuChart/__tests__/ChartLegend.test.tsx` | **Create** | workspace | Legend interaction tests. |
| `packages/workspace/package.json` | **Modify** | workspace | Add `recharts` dependency. |

#### Database changes

None.

#### Component hierarchy

```
VastuChart (props: type, data, series, config, onConfigChange)
  -> Responsive container (resizes to parent width)
  -> Recharts [LineChart | BarChart | AreaChart | PieChart | ScatterChart]
       -> Automatic color assignment from CHART_SERIES_COLORS
       -> Custom tooltip (ChartTooltip)
       -> Right-click -> VastuContextMenu (filter, exclude, drill, copy)
  -> ChartLegend (custom HTML, click toggle, double-click solo)
  -> ChartConfigPanel (gear icon, collapsible, basic/advanced)
  -> Loading: skeleton rect
  -> Error: error message + retry
  -> Empty: "No data matches current filters"
  -> Accessible: aria-label, "View as table" toggle, keyboard nav
```

#### Design system mapping

- Patterns Library SS3 (entire section).
- Style Guide SS10: Chart discrete series palette, styling tokens.
- Style Guide SS10.5: Axis line color, grid line color, tooltip bg, legend font, bar corner radius, line stroke width, area fill opacity, dot radius.

#### Edge cases

- More than 10 series: group tail into "Other" with `--v-text-tertiary` color.
- Legend toggle: series color preserved when hidden (next series doesn't shift).
- Double-click legend: solo series (hide all others), double-click again to restore.
- Container width below 400px: hide legend, reduce axis labels, remove grid lines.
- `prefers-reduced-motion`: disable chart animations.
- Sparkline variant: minimal chart for KPI cards (no axes, no legend, single series).

#### Testing strategy

- **Component:** Renders each chart type (line, bar, area, donut, sparkline). Color assignment correct. Tooltip shows all series. Legend toggle/solo. Config panel open/close. Loading/error/empty states. Accessibility: aria-label, "View as table".
- 10 key scenarios.

#### Estimated complexity

- VastuChart.tsx: **L** (~400 lines)
- ChartTooltip.tsx: **M** (~100 lines)
- ChartLegend.tsx: **M** (~150 lines)
- ChartConfigPanel.tsx: **L** (~300 lines)
- chartColors.ts: **S** (~40 lines)
- types.ts: **S** (~80 lines)
- Tests: **L** (~300 lines)

---

## Group 6: Builder mode

### US-136: Builder mode config panel

**Summary:** Two-column config panel for page configuration: data source, fields, sections, permissions, hooks, metadata, ephemeral toggle.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/BuilderPanel/BuilderPanel.tsx` | **Create** | workspace | Two-column layout: section nav + config form. |
| `packages/workspace/src/components/BuilderPanel/BuilderPanel.module.css` | **Create** | workspace | Layout styles with warning header. |
| `packages/workspace/src/components/BuilderPanel/BuilderWarningHeader.tsx` | **Create** | workspace | Amber warning bar with discard/save buttons. |
| `packages/workspace/src/components/BuilderPanel/sections/DataSourceSection.tsx` | **Create** | workspace | DB connection picker, table picker, relations, schema preview. |
| `packages/workspace/src/components/BuilderPanel/sections/FieldConfigSection.tsx` | **Create** | workspace | Per-column settings: visible, label, display type, sortable, filterable. |
| `packages/workspace/src/components/BuilderPanel/sections/SectionsLayoutSection.tsx` | **Create** | workspace | Toggle switches for summary strip, search, bulk actions, drawer. |
| `packages/workspace/src/components/BuilderPanel/sections/DefaultViewSection.tsx` | **Create** | workspace | Initial filter/sort/column state editor. |
| `packages/workspace/src/components/BuilderPanel/sections/PermissionsSection.tsx` | **Create** | workspace | Per-role matrix: view/edit/delete/export. Per-field visibility. |
| `packages/workspace/src/components/BuilderPanel/sections/HooksSection.tsx` | **Create** | workspace | Hook list with Monaco code editor (UI only). |
| `packages/workspace/src/components/BuilderPanel/sections/PageMetadataSection.tsx` | **Create** | workspace | Name, icon picker, description, nav order. |
| `packages/workspace/src/components/BuilderPanel/sections/EphemeralToggleSection.tsx` | **Create** | workspace | Single switch to enable/disable workflow mode. |
| `packages/workspace/src/components/BuilderPanel/__tests__/BuilderPanel.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/stores/builderStore.ts` | **Create** | workspace | Zustand store for builder config editing state. |

> **HUMAN DECISION NEEDED:** Monaco editor for hooks section. `@monaco-editor/react` is NOT in the dependency tree. Options:
> (A) Add `@monaco-editor/react` (~200KB gzipped, lazy-loaded).
> (B) Use a simple `<Textarea>` with monospace font as a placeholder for Phase 1B, add Monaco in Phase 2 when hooks actually execute.
> Recommendation: Option B reduces scope. Monaco is heavyweight for a UI-only feature. The textarea can use `--v-font-mono` and basic syntax highlighting is not needed until hooks execute.

#### Database changes

**New table: `page_configurations`**

```prisma
model PageConfiguration {
  id             String    @id @default(uuid())
  pageId         String    @unique @map("page_id")
  configJson     Json      @map("config_json")
  organizationId String    @map("organization_id")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  page           Page      @relation(fields: [pageId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([pageId])
  @@index([organizationId])
  @@map("page_configurations")
}
```

Note: This IS mentioned in the requirements (US-136 AC-12). The `configJson` field stores the entire page configuration as a JSON object with typed sections (dataSource, fields, sections, defaultView, permissions, hooks, metadata, ephemeral).

Also need to add the reverse relation on `Page` and `Organization` models.

#### API/MCP surface

- `GET /api/workspace/pages/:id/config` -- fetch page configuration.
- `PUT /api/workspace/pages/:id/config` -- save page configuration (writes audit event).
- New route files:
  - `packages/shell/src/app/api/workspace/pages/[id]/config/route.ts`

#### State management

New `builderStore` (Zustand):
```
{
  pageId: string | null;
  originalConfig: PageConfig | null;  // last saved
  editingConfig: PageConfig | null;   // working copy
  activeSection: string;              // which section nav is active
  isDirty: boolean;                   // computed
  loadConfig(pageId): Promise<void>;
  updateSection(section, data): void;
  saveConfig(): Promise<void>;
  discardChanges(): void;
}
```

#### Component hierarchy

```
BuilderPanel (shown when ModeSwitch is 'builder')
  -> BuilderWarningHeader (amber bar + Discard/Save)
  -> Left column: section nav (clickable list)
  -> Right column: active section form
       -> DataSourceSection
       -> FieldConfigSection
       -> SectionsLayoutSection
       -> DefaultViewSection
       -> PermissionsSection
       -> HooksSection (textarea placeholder, not Monaco)
       -> PageMetadataSection
       -> EphemeralToggleSection
```

#### Design system mapping

- Wireframe: Group B, Screen 8.
- Warning header: `--v-status-warning-light` background, `--v-status-warning` text.
- Style Guide SS9.1: Mantine Accordion for collapsible sections, Switch for toggles.
- Patterns Library SS9: Form patterns for all config inputs.

#### Edge cases

- Config saves write audit event. Every save is timestamped.
- Config is runtime -- takes effect on next page load for other users.
- Builder panel dirty state: navigating away shows ConfirmDialog.
- Concurrent editing: last-write-wins (no optimistic locking in Phase 1B).
- No config exists yet: show default empty config with sensible placeholders.
- Hooks section shows "Hook execution coming in Phase 2" placeholder below the textarea.

#### Testing strategy

- **Component:** Section navigation works. Each section renders correct inputs. Save sends to API. Discard reverts. Warning header shows. Audit event written.
- 8 key scenarios.

#### Estimated complexity

- BuilderPanel.tsx: **M** (~200 lines)
- BuilderWarningHeader.tsx: **S** (~60 lines)
- DataSourceSection.tsx: **L** (~350 lines)
- FieldConfigSection.tsx: **L** (~300 lines)
- SectionsLayoutSection.tsx: **M** (~120 lines)
- DefaultViewSection.tsx: **M** (~150 lines)
- PermissionsSection.tsx: **L** (~300 lines)
- HooksSection.tsx: **M** (~150 lines)
- PageMetadataSection.tsx: **M** (~120 lines)
- EphemeralToggleSection.tsx: **S** (~40 lines)
- builderStore.ts: **M** (~120 lines)
- API route: **M** (~100 lines)
- Tests: **L** (~300 lines)

---

## Group 7: Dashboard view

### US-137: Dashboard view (pinned cards)

**Summary:** Dashboard home screen with card grid, greeting header, card types, edit mode.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/templates/Dashboard/DashboardTemplate.tsx` | **Create** | workspace | Main dashboard panel. |
| `packages/workspace/src/templates/Dashboard/DashboardTemplate.module.css` | **Create** | workspace | CSS Grid layout. |
| `packages/workspace/src/templates/Dashboard/DashboardGreeting.tsx` | **Create** | workspace | "Good afternoon, {name}" + date + counts. |
| `packages/workspace/src/templates/Dashboard/DashboardCard.tsx` | **Create** | workspace | Card wrapper with type-specific content rendering. |
| `packages/workspace/src/templates/Dashboard/cards/KPICard.tsx` | **Create** | workspace | Value + delta + sparkline. |
| `packages/workspace/src/templates/Dashboard/cards/ChartCard.tsx` | **Create** | workspace | Mini VastuChart in a card. |
| `packages/workspace/src/templates/Dashboard/cards/TableCard.tsx` | **Create** | workspace | Mini VastuTable with "View all" link. |
| `packages/workspace/src/templates/Dashboard/cards/PipelineCard.tsx` | **Create** | workspace | Horizontal stacked bar. |
| `packages/workspace/src/templates/Dashboard/cards/QuickActionsCard.tsx` | **Create** | workspace | Action buttons list. |
| `packages/workspace/src/templates/Dashboard/cards/AlertCard.tsx` | **Create** | workspace | Warning strip with "View all". |
| `packages/workspace/src/templates/Dashboard/AddCardDialog.tsx` | **Create** | workspace | Card type picker dialog. |
| `packages/workspace/src/templates/Dashboard/EditGridMode.tsx` | **Create** | workspace | Drag-to-reorder overlay with resize handles. |
| `packages/workspace/src/templates/Dashboard/PinToDashboardDialog.tsx` | **Create** | workspace | Pin-to-dashboard dialog with card type, metric, size pickers. |
| `packages/workspace/src/templates/Dashboard/__tests__/DashboardTemplate.test.tsx` | **Create** | workspace | Component tests. |
| `packages/workspace/src/stores/dashboardStore.ts` | **Create** | workspace | Zustand store for card positions, sizes, config. |
| `packages/workspace/src/panels/index.ts` | **Modify** | workspace | Register `dashboard` panel type. |

#### Database changes

Dashboard state is stored as part of the view state (ViewState.stateJson). No new tables needed -- dashboard card positions, sizes, and configurations are JSON inside the view.

#### Component hierarchy

```
DashboardTemplate (registered as 'dashboard', default panel)
  -> DashboardGreeting ("Good afternoon, {name}")
  -> CSS Grid (auto-fill, minmax(280px, 1fr))
       -> DashboardCard[] (type-specific rendering)
            -> KPICard | ChartCard | TableCard | PipelineCard | QuickActionsCard | AlertCard
  -> "+ Add card" button -> AddCardDialog
  -> "Edit grid" button -> EditGridMode overlay
       -> HTML5 drag API for reorder
       -> Resize handles (1x1, 2x1, 1x2)
       -> Remove button per card
  -> ViewToolbar (active: save/load dashboard layouts)
```

#### Design system mapping

- Wireframe: Group D, Screen 19; Group F -- Pin-to-dashboard dialog.
- Style Guide SS2.2: `--v-text-2xl` for greeting.
- Style Guide SS3.1: Card padding 16px, grid gap 40px (--v-space-10).
- CSS Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`.
- No drag-and-drop library -- use HTML5 drag API per technical constraints.

#### Edge cases

- Empty dashboard: EmptyState "Your dashboard is empty. Pin views from any page to build it out." + [+ Add card].
- Card data loading: per-card skeleton.
- Edit grid mode: visual overlay with handles. Exit via "Done" button or Escape.
- Pin-to-dashboard from view toolbar overflow: opens PinToDashboardDialog.
- Dashboard state serialized to view for save/load.
- Greeting time of day: morning/afternoon/evening based on local time.

#### Testing strategy

- **Component:** Renders greeting. Card grid renders cards. Add card dialog. Edit mode drag. Remove card. Pin-to-dashboard dialog. Empty state.
- 7 key scenarios.

#### Estimated complexity

- DashboardTemplate.tsx: **L** (~350 lines)
- DashboardGreeting.tsx: **S** (~60 lines)
- DashboardCard.tsx: **M** (~100 lines)
- KPICard.tsx: **M** (~120 lines) (existing from Style Guide SS9.3, formalize)
- ChartCard.tsx: **S** (~80 lines)
- TableCard.tsx: **M** (~100 lines)
- PipelineCard.tsx: **S** (~80 lines)
- QuickActionsCard.tsx: **S** (~60 lines)
- AlertCard.tsx: **S** (~60 lines)
- AddCardDialog.tsx: **M** (~120 lines)
- EditGridMode.tsx: **L** (~300 lines)
- PinToDashboardDialog.tsx: **M** (~150 lines)
- dashboardStore.ts: **M** (~100 lines)
- Tests: **L** (~300 lines)

---

## Group 8: Confirmation dialogs

### US-138: Confirmation dialog system

**Summary:** Shared confirmation component for all destructive actions, with three variants.

#### Components to create or modify

| File | Action | Package | Notes |
|------|--------|---------|-------|
| `packages/workspace/src/components/ConfirmDialog/ConfirmDialog.tsx` | **Create** | workspace | Three variants: delete (red), warning (amber), info (blue). |
| `packages/workspace/src/components/ConfirmDialog/ConfirmDialog.module.css` | **Create** | workspace | Dialog styles. |
| `packages/workspace/src/components/ConfirmDialog/useConfirmDialog.ts` | **Create** | workspace | Hook for imperative dialog usage: `const confirm = useConfirmDialog(); await confirm({ title, description, variant })`. |
| `packages/workspace/src/components/ConfirmDialog/__tests__/ConfirmDialog.test.tsx` | **Create** | workspace | Component tests. |

#### Database changes

None.

#### Component hierarchy

```
ConfirmDialog (Mantine Modal base)
  -> Title
  -> Impact description
  -> Cancel button (left)
  -> Action button (right, color-coded: red/amber/blue)
  -> Focus trapped, action NOT auto-focused
  -> Escape and click-outside = cancel
```

#### Design system mapping

- Wireframe: Group F -- Confirmation dialogs.
- Style Guide SS6: `--v-z-modal` (60) for z-index.
- Patterns Library SS10: Toast patterns -- confirmation before destructive toasts.
- Style Guide SS4: `--v-radius-lg` for modal border radius.
- Delete variant: `--v-status-error` action button.
- Warning variant: `--v-accent-tertiary` action button.
- Info variant: `--v-accent-primary` action button.

#### Edge cases

- Focus management: focus trapped inside dialog. Action button NOT auto-focused (prevents accidental Enter).
- Tab cycles between cancel and action only.
- Escape = cancel. Click outside = cancel.
- Multiple confirms: queue or stack (only one visible at a time).

#### Testing strategy

- **Component:** Renders three variants. Escape cancels. Click outside cancels. Action button fires callback. Focus trap. Action not auto-focused.
- 5 key scenarios.

#### Estimated complexity

- ConfirmDialog.tsx: **M** (~120 lines)
- useConfirmDialog.ts: **M** (~100 lines)
- Tests: **M** (~100 lines)

---

## Database changes summary

### New table

| Table | Purpose | Mentioned in requirements |
|-------|---------|--------------------------|
| `page_configurations` | Stores page configuration JSON (data source, fields, sections, permissions, hooks, metadata) | US-136 AC-12 |

### Schema modifications

| Model | Change | Story |
|-------|--------|-------|
| `Page` | Add `pageConfiguration` relation (one-to-one) | US-136 |
| `Organization` | Add `pageConfigurations` relation | US-136 |

### Type modifications

| File | Change | Story |
|------|--------|-------|
| `packages/shared/src/types/view.ts` | Rename FilterGroup.operator to .connector; FilterCondition.field to .column; uppercase AND/OR | US-122 |
| `packages/shared/src/types/page.ts` | Add PageConfiguration type, PageConfig interface | US-136 |

### Migration

One Prisma migration needed for the `page_configurations` table.

---

## Cross-cutting issues

### 1. New dependencies (HITL triggers)

| Package | Used by | Status |
|---------|---------|--------|
| `recharts` | US-135 VastuChart | **NOT in dependency tree. Must add.** |
| `@mantine/spotlight` | US-125 Command palette | **NOT in dependency tree. Must add.** |
| `@mantine/tiptap` + TipTap peers | US-128 Notes tab | **NOT in dependency tree. Decision needed (see US-128 HUMAN DECISION).** |
| `@monaco-editor/react` | US-136 Hooks section | **NOT in dependency tree. Recommend deferring (see US-136 HUMAN DECISION).** |

### 2. FilterNode schema alignment (breaking change)

US-122 changes the shared `FilterNode` type. This affects:
- `packages/shared/src/types/view.ts` (source of truth)
- `packages/workspace/src/components/FilterSystem/types.ts` (already correct)
- `packages/workspace/src/stores/viewStore.ts` (uses shared types)
- `packages/workspace/src/stores/viewFilterStore.ts` (uses workspace types)
- All filter-related test files
- Any persisted view JSON in the database

**Must complete before any template work begins** (Wave 0).

### 3. Template registration pattern

All 6 templates + dashboard must follow the same registration pattern:
1. Export a component from `packages/workspace/src/templates/{Name}/{Name}Template.tsx`
2. Register in `packages/workspace/src/panels/index.ts` via `registerPanel()`
3. Accept a `TemplateConfig` prop (from `useTemplateConfig` hook)
4. Render with sensible defaults when no config exists

### 4. Shared sub-components used across templates

| Component | Used by | Create in |
|-----------|---------|-----------|
| `VastuTabs` | US-128 drawer, US-131 multi-tab detail | `packages/workspace/src/components/VastuTabs/` |
| `EmptyState` | US-124, US-129, US-130, US-134, US-137 | `packages/workspace/src/components/EmptyState/` |
| `ConfirmDialog` | US-121, US-128, US-133, US-136, US-137, US-138 | `packages/workspace/src/components/ConfirmDialog/` |
| `KPICard` | US-129 strip, US-130 dashboard, US-137 dashboard | `packages/workspace/src/components/KPICard/` |

These should be built as reusable workspace components, not template-specific.

### 5. API routes to create

| Route | Method | Story |
|-------|--------|-------|
| `/api/workspace/pages/:id/config` | GET, PUT | US-136 |
| `/api/workspace/records/:id` | GET, PATCH | US-128 |
| `/api/workspace/records/:id/history` | GET | US-128 |
| `/api/workspace/records/:id/notes` | POST | US-128 |

All routes in `packages/shell/src/app/api/workspace/`.

### 6. Zustand stores to create

| Store | Purpose | Story |
|-------|---------|-------|
| `drawerStore` | Record drawer open/close, active tab, record navigation | US-128 |
| `builderStore` | Builder config editing state | US-136 |
| `dashboardStore` | Dashboard card positions, sizes, config | US-137 |

Existing stores to modify:
| Store | Change | Story |
|-------|--------|-------|
| `panelStore` | Add `panelModes` map for Editor/Builder/Workflow | US-120 |

### 7. i18n keys

All new components must add translation keys to `packages/workspace/messages/en.json`. Estimate ~200 new keys across all stories.

---

## Risk assessment

### High risk

1. **VastuChart scope (US-135):** This is the largest single component. Supporting 8+ chart types with custom tooltip, legend, config panel, accessibility, and all interaction patterns is significant. Risk: timeline overrun.
   - Mitigation: Break into subtasks by chart type. Start with line + bar, add others incrementally.

2. **Builder mode scope (US-136):** 8 config sections with complex forms. The Data Source section alone (DB picker, table picker, relation detection, schema preview) is substantial.
   - Mitigation: Build section by section. DataSource and FieldConfig are the critical path; others can be simpler.

3. **FilterNode breaking change (US-122):** Affects shared types, existing tests, and persisted data.
   - Mitigation: Complete in Wave 0 before anything else. Write migration script and runtime normalization.

### Medium risk

4. **Dashboard edit mode (US-137):** HTML5 drag API for card reorder without a library is tricky to get right (ghost elements, drop zones, resize handles).
   - Mitigation: Keep edit mode simple -- reorder only in Phase 1B, add resize in Phase 2 if needed.

5. **Drawer-to-panel promotion (US-128):** State preservation (tab, scroll, dirty state) during drawer-to-panel transition requires careful coordination between drawerStore and panelStore.
   - Mitigation: Design the data flow carefully. Use a shared "record context" object that both drawer and panel consume.

### Low risk

6. **Bug fixes (US-120-124):** Well-scoped with clear before/after. Low uncertainty.

7. **Command palette (US-125):** Built on Mantine Spotlight, well-documented API. Main work is custom result rendering.

8. **Confirmation dialog (US-138):** Small, self-contained component.

---

## Architecture Decision Records

### ADR-001: Defer Monaco editor to Phase 2

**Status:** Proposed

**Context:** US-136 (Builder mode) AC-9 calls for a Monaco code editor in the Hooks section. However, hook execution is explicitly out of scope for Phase 1B (Phase 2/3). Monaco is a ~200KB gzipped dependency that would be loaded for a UI-only feature with no execution capability.

**Decision:** Use a monospace `<Textarea>` with `font-family: var(--v-font-mono)` for the Hooks section in Phase 1B. Add `@monaco-editor/react` in Phase 2 when hook execution lands.

**Consequences:** The hooks editing experience is basic (no syntax highlighting, no autocomplete) but functional for storing code. The dependency tree stays lean.

**File:** `d:\Vastu\docs\decisions\ADR-001-defer-monaco.md`

---

### ADR-002: Rich text editor approach for Notes

**Status:** Proposed

**Context:** US-128 (Record drawer) AC-8 calls for a rich text editor in the Notes tab. `@mantine/tiptap` with TipTap peer deps would add ~5 packages.

**Decision options:**
- (A) Add `@mantine/tiptap` now -- full rich text.
- (B) Use `<Textarea>` with auto-resize -- plain text, swap to TipTap in Phase 2.

**Recommendation:** Option A if rich text is critical to the Phase 1B demo. Option B if we want to minimize scope.

**File:** `d:\Vastu\docs\decisions\ADR-002-notes-editor.md`

---

### ADR-003: Chart PNG export without new dependencies

**Status:** Proposed

**Context:** US-132 (Data explorer) AC-8 requires PNG export of charts. Options: (A) serialize Recharts SVG to Canvas to PNG blob (no dependency), (B) use `html-to-image` library.

**Decision:** Option A. Recharts renders SVG. We can serialize the SVG element to a canvas via `Image` + `canvas.drawImage()`, then `canvas.toBlob('image/png')`. This is a well-known pattern that requires no new dependency.

**Consequences:** Works for Recharts SVG-based charts. May need adjustment if we add non-SVG chart types in the future.

**File:** `d:\Vastu\docs\decisions\ADR-003-chart-export.md`

---

### ADR-004: Dashboard card reorder via HTML5 Drag API

**Status:** Proposed

**Context:** US-137 requires drag-to-reorder cards in edit mode. Technical constraints say "No drag-and-drop library -- use HTML5 drag API."

**Decision:** Use HTML5 Drag API (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) for card reorder. CSS Grid handles layout. Visual feedback via `dragenter`/`dragleave` classes.

**Consequences:** HTML5 Drag API has known quirks (ghost image customization, mobile support). Acceptable for desktop-first enterprise app. Touch/mobile drag can be added later with a polyfill.

**File:** `d:\Vastu\docs\decisions\ADR-004-dashboard-drag.md`

---

## Subtask breakdown for lead engineer

Total estimated subtasks: ~55 (varying S/M/L complexity).
Recommended team size: 3-4 dev engineers working in parallel across waves.

Wave 0 subtasks (blocking): ~8 subtasks, ~1 week
Wave 1 subtasks (infrastructure): ~10 subtasks, ~1 week
Wave 2 subtasks (core): ~8 subtasks, ~1 week
Wave 3-4 subtasks (templates + builder + dashboard): ~22 subtasks, ~2 weeks
Wave 5 subtasks (E2E): ~7 subtasks, ~0.5 weeks

Total: ~4 weeks aligns with the phase target (Weeks 13-16).

---

The relevant files for this plan are:

- Phase requirements: `d:\Vastu\phases\phase-1b-final-baseline\requirements.md`
- Design principles: `d:\Vastu\docs\design-principles.md`
- Style guide: `d:\Vastu\docs\style-guide.md`
- Patterns library: `d:\Vastu\docs\patterns-library.md`
- Existing workspace shell: `d:\Vastu\packages\workspace\src\components\WorkspaceShell.tsx`
- Panel registry: `d:\Vastu\packages\workspace\src\panels\registry.ts`
- Panel types: `d:\Vastu\packages\workspace\src\types\panel.ts`
- View store: `d:\Vastu\packages\workspace\src\stores\viewStore.ts`
- View filter store: `d:\Vastu\packages\workspace\src\stores\viewFilterStore.ts`
- Panel store: `d:\Vastu\packages\workspace\src\stores\panelStore.ts`
- Filter system types: `d:\Vastu\packages\workspace\src\components\FilterSystem\types.ts`
- Shared view types (needs alignment): `d:\Vastu\packages\shared\src\types\view.ts`
- Shared page types: `d:\Vastu\packages\shared\src\types\page.ts`
- Permissions: `d:\Vastu\packages\shared\src\permissions\abilities.ts`
- ModeSwitch (to rewrite): `d:\Vastu\packages\workspace\src\components\ModeSwitch\ModeSwitch.tsx`
- Context menu: `d:\Vastu\packages\workspace\src\components\ContextMenu\ContextMenu.tsx`
- Context menu item (already has TruncatedText): `d:\Vastu\packages\workspace\src\components\ContextMenu\ContextMenuItem.tsx`
- SidebarUserAvatar (token fix needed): `d:\Vastu\packages\workspace\src\components\SidebarNav\SidebarUserAvatar.tsx`
- SidebarItem (TruncatedText fix needed): `d:\Vastu\packages\workspace\src\components\SidebarNav\SidebarItem.tsx`
- VastuTable: `d:\Vastu\packages\workspace\src\components\VastuTable\VastuTable.tsx`
- VastuTable types: `d:\Vastu\packages\workspace\src\components\VastuTable\types.ts`
- FilterBar: `d:\Vastu\packages\workspace\src\components\FilterSystem\FilterBar.tsx`
- ViewToolbar: `d:\Vastu\packages\workspace\src\components\ViewToolbar\ViewToolbar.tsx`
- Prisma schema: `d:\Vastu\packages\shared\src\prisma\schema.prisma`
- Workspace package.json (needs recharts, spotlight): `d:\Vastu\packages\workspace\package.json`

The plan document above should be saved to `d:\Vastu\phases\phase-1b-final-baseline\plan.md`. I was unable to write the file directly as I only have read/search tools available. Please save this content to that path.
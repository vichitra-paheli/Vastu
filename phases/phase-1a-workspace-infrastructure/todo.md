# Phase 1A: Workspace Infrastructure -- Todo

> Created: 2026-03-20
> Status: Planning complete, ready for implementation
> Total: 17 features, 59 subtasks, ~9,450 estimated lines

---

## Feature Dependency Graph

```
Stream 1 -- Phase 0 Cleanup (all independent, can start immediately):
  US-101 (i18n)              [#78]  INDEPENDENT
  US-102 (MFA toggle)        [#79]  INDEPENDENT
  US-103 (session expiry)    [#80]  INDEPENDENT
  US-104 (CI coverage)       [#81]  INDEPENDENT
  US-105 (Fumadocs)          [#82]  INDEPENDENT

Stream 2 -- Workspace Core (sequential):
  US-106 (workspace package) [#83]  DEPENDS ON: US-101 merged to main (critical), others nice-to-have
  US-107 (Dockview host)     [#84]  DEPENDS ON: US-106 merged to main
  US-108 (mode switch)       [#85]  DEPENDS ON: US-107 merged to main

Stream 3 -- Sidebar (after US-106):
  US-109 (sidebar nav)       [#86]  DEPENDS ON: US-106 merged to main

Stream 4 -- View Engine (after US-106):
  US-110 (view store)        [#87]  DEPENDS ON: US-106 merged to main
  US-111 (view toolbar)      [#88]  DEPENDS ON: US-110 merged to main

Stream 5 -- Filters and Table (after US-106):
  US-114 (filter system)     [#91]  DEPENDS ON: US-106 merged to main
  US-112 (VastuTable)        [#89]  DEPENDS ON: US-114, US-110 merged to main

Stream 6 -- Workspace UI (after US-107):
  US-113 (context menu)      [#90]  DEPENDS ON: US-107 merged to main
  US-115 (tray bar)          [#92]  DEPENDS ON: US-107 merged to main
  US-116 (command palette)   [#93]  DEPENDS ON: US-107 + US-109 merged to main

Stream 7 -- Final Integration:
  US-117 (keyboard shortcuts)[#94]  DEPENDS ON: all above merged to main
```

**Critical path:** US-101 -> US-106 -> US-107 -> US-108 (longest sequential chain)

**Maximum parallelism plan:**
1. Start Stream 1 (5 features in parallel)
2. After US-101 merges: start US-106
3. After US-106 merges: start US-107, US-109, US-110, US-114 in parallel
4. After US-107 merges: start US-108, US-113, US-115 in parallel
5. After US-107 + US-109 merge: start US-116
6. After US-110 merges: start US-111
7. After US-114 + US-110 merge: start US-112
8. After all merge: start US-117

---

## Features and Tasks

### VASTU-1A-101: Replace i18n stub [INDEPENDENT] -- #78
Branch: `feature/VASTU-1A-101-i18n-next-intl`
Package: shell | Agent: dev-engineer | Est: ~500 lines

- [ ] VASTU-1A-101a: Extract translations record to `messages/en.json`, install `next-intl`, create request config (shell, M) [no deps]
  - Files: `packages/shell/package.json`, `packages/shell/messages/en.json`, `packages/shell/src/i18n.ts`
- [ ] VASTU-1A-101b: Rewrite `i18n.ts` wrapper, update middleware, `layout.tsx`, `next.config.mjs` (shell, M) [deps: 101a]
  - Files: `packages/shell/src/lib/i18n.ts`, `packages/shell/src/middleware.ts`, `packages/shell/src/app/layout.tsx`, `packages/shell/next.config.mjs`
- [ ] VASTU-1A-101c: Verify all existing pages render, fix breakage, add unit tests (shell, S) [deps: 101b]
  - Files: `packages/shell/src/lib/__tests__/i18n.test.ts`

---

### VASTU-1A-102: MFA enforcement separation [INDEPENDENT] -- #79
Branch: `feature/VASTU-1A-102-mfa-enforcement`
Package: shell, shared | Agent: dev-engineer | Est: ~500 lines

- [ ] VASTU-1A-102a: Schema migration + type update + API route modification (shared, S) [no deps]
  - Files: `packages/shared/src/prisma/schema.prisma`, `packages/shared/src/types/tenant.ts`, `packages/shell/src/app/api/settings/organization/route.ts`
- [ ] VASTU-1A-102b: UI toggle in SsoProviderList + i18n strings + unit tests (shell, M) [deps: 102a]
  - Files: `packages/shell/src/components/settings/SsoProviderList.tsx`, i18n strings
- [ ] VASTU-1A-102c: MFA redirect logic in session callback + middleware + E2E test (shell, M) [deps: 102b]
  - Files: `packages/shell/src/middleware.ts`, `packages/shell/src/lib/auth.ts`

---

### VASTU-1A-103: Session expiry detection [INDEPENDENT] -- #80
Branch: `feature/VASTU-1A-103-session-expiry`
Package: shell | Agent: dev-engineer | Est: ~150 lines

- [ ] VASTU-1A-103a: Create `SessionGuard` component with polling logic (shell, S) [no deps]
  - Files: `packages/shell/src/components/auth/SessionGuard.tsx`
- [ ] VASTU-1A-103b: Integrate into layouts + login page expired state + tests (shell, S) [deps: 103a]
  - Files: `packages/shell/src/app/(shell)/layout.tsx`, `packages/shell/src/app/workspace/layout.tsx`, `packages/shell/src/app/(auth)/login/page.tsx`

---

### VASTU-1A-104: CI coverage comments [INDEPENDENT] -- #81
Branch: `feature/VASTU-1A-104-ci-coverage`
Package: root | Agent: devops-engineer | Est: ~200 lines

- [ ] VASTU-1A-104a: Add Vitest JSON coverage reporter, configure sticky PR comment action, compute delta (root, M) [no deps]
  - Files: `.github/workflows/ci-test.yml` or `.github/workflows/ci-coverage-comment.yml`

---

### VASTU-1A-105: Fumadocs setup [INDEPENDENT] -- #82
Branch: `feature/VASTU-1A-105-fumadocs`
Package: docs (new) | Agent: dev-engineer | Est: ~400 lines

- [ ] VASTU-1A-105a: Create `packages/docs` package with fumadocs config, layout, catch-all page (docs, M) [no deps]
  - Files: `packages/docs/package.json`, `packages/docs/next.config.mjs`, `packages/docs/src/app/layout.tsx`, `packages/docs/src/app/docs/[[...slug]]/page.tsx`, `packages/docs/tsconfig.json`
- [ ] VASTU-1A-105b: Migrate existing docs content to MDX pages, add `docs:dev` script to root (docs, M) [deps: 105a]
  - Files: `packages/docs/content/docs/**/*.mdx`, `package.json` (root), `turbo.json`

---

### VASTU-1A-106: Workspace package and layout [DEPENDS ON: US-101 merged to main] -- #83
Branch: `feature/VASTU-1A-106-workspace-layout` (branch from main AFTER US-101 merges)
Package: workspace, shell | Agent: dev-engineer | Est: ~500 lines

- [ ] VASTU-1A-106a: Activate workspace package: dependencies, tsconfig, scripts, test-utils (workspace, M) [no deps]
  - Files: `packages/workspace/package.json`, `packages/workspace/tsconfig.json`, `packages/workspace/src/index.ts`, `packages/workspace/src/test-utils/providers.tsx`
- [ ] VASTU-1A-106b: Create WorkspaceProviders (Zustand + TanStack Query wrappers) (workspace, S) [deps: 106a]
  - Files: `packages/workspace/src/providers/WorkspaceProviders.tsx`
- [ ] VASTU-1A-106c: Create WorkspaceShell layout + sidebarStore + update shell route files (workspace/shell, M) [deps: 106b]
  - Files: `packages/workspace/src/components/WorkspaceShell.tsx`, `packages/workspace/src/stores/sidebarStore.ts`, `packages/workspace/src/stores/panelStore.ts` (stub), `packages/workspace/src/stores/trayStore.ts` (stub), `packages/workspace/src/types/panel.ts`, `packages/shell/src/app/workspace/layout.tsx`, `packages/shell/src/app/workspace/page.tsx`
- [ ] VASTU-1A-106d: Integration tests + E2E (workspace, S) [deps: 106c]

---

### VASTU-1A-107: Dockview panel host [DEPENDS ON: US-106 merged to main] -- #84
Branch: `feature/VASTU-1A-107-dockview-host` (branch from main AFTER US-106 merges)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~900 lines

- [ ] VASTU-1A-107a: Create panel type definitions + panel registry + WelcomePanel (workspace, S) [no deps]
  - Files: `packages/workspace/src/types/panel.ts`, `packages/workspace/src/panels/registry.ts`, `packages/workspace/src/panels/WelcomePanel.tsx`
- [ ] VASTU-1A-107b: Create DockviewHost component with Dockview integration (workspace, L) [deps: 107a]
  - Files: `packages/workspace/src/components/DockviewHost/DockviewHost.tsx`, `packages/workspace/src/components/DockviewHost/DockviewHost.module.css`
  - Agent: design-engineer (complex UI with Dockview styling)
- [ ] VASTU-1A-107c: Create PanelTab custom renderer + DropIndicator (workspace, M) [deps: 107b]
  - Files: `packages/workspace/src/components/DockviewHost/PanelTab.tsx`, `packages/workspace/src/components/DockviewHost/DropIndicator.tsx`
  - Agent: design-engineer
- [ ] VASTU-1A-107d: Implement panelStore with localStorage persistence + URL serialization (workspace, M) [deps: 107a]
  - Files: `packages/workspace/src/stores/panelStore.ts`, `packages/workspace/src/hooks/usePanelPersistence.ts`
  - Note: Can run in parallel with 107b/107c (different files)
- [ ] VASTU-1A-107e: Integrate DockviewHost into WorkspaceShell + tests (workspace, M) [deps: 107b, 107c, 107d]
  - Files: `packages/workspace/src/components/WorkspaceShell.tsx`, `packages/workspace/src/test-utils/mock-dockview.ts`

---

### VASTU-1A-108: Mode switch [DEPENDS ON: US-107 merged to main] -- #85
Branch: `feature/VASTU-1A-108-mode-switch` (branch from main AFTER US-107 merges)
Package: workspace | Agent: design-engineer | Est: ~300 lines

- [ ] VASTU-1A-108a: Create ModeSwitch component with CASL gating + ModePlaceholder (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/DockviewHost/ModeSwitch.tsx`, `packages/workspace/src/components/DockviewHost/ModePlaceholder.tsx`
- [ ] VASTU-1A-108b: Integrate into PanelTab + serialize mode in panel state + tests (workspace, S) [deps: 108a]
  - Files: `packages/workspace/src/components/DockviewHost/PanelTab.tsx`, `packages/workspace/src/types/panel.ts`

---

### VASTU-1A-109: Workspace sidebar navigation [DEPENDS ON: US-106 merged to main] -- #86
Branch: `feature/VASTU-1A-109-sidebar-nav` (branch from main AFTER US-106 merges)
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [ ] VASTU-1A-109a: Create SidebarNav shell with collapsed/expanded states + CSS animations (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/SidebarNav/SidebarNav.tsx`, `packages/workspace/src/components/SidebarNav/SidebarNav.module.css`
- [ ] VASTU-1A-109b: Create SidebarSection + SidebarItem + SidebarSearch + CASL gating (workspace, M) [deps: 109a]
  - Files: `packages/workspace/src/components/SidebarNav/SidebarSection.tsx`, `packages/workspace/src/components/SidebarNav/SidebarItem.tsx`, `packages/workspace/src/components/SidebarNav/SidebarSearch.tsx`
- [ ] VASTU-1A-109c: Create SidebarUserAvatar + wire to panelStore + tests (workspace, M) [deps: 109b]
  - Files: `packages/workspace/src/components/SidebarNav/SidebarUserAvatar.tsx`, `packages/workspace/src/stores/sidebarStore.ts`

---

### VASTU-1A-110: View state store [DEPENDS ON: US-106 merged to main] -- #87
Branch: `feature/VASTU-1A-110-view-store` (branch from main AFTER US-106 merges)
Package: workspace, shared, shell | Agent: dev-engineer | Est: ~700 lines

- [ ] VASTU-1A-110a: Prisma schema: Page + View models, migration, seed mock pages (shared, M) [no deps]
  - Files: `packages/shared/src/prisma/schema.prisma`, `packages/shared/src/prisma/seed.ts`, migration files
- [ ] VASTU-1A-110b: Shared types: View, Page, FilterNode, ViewState types (shared, S) [no deps, parallel with 110a]
  - Files: `packages/shared/src/types/view.ts`, `packages/shared/src/types/page.ts`, `packages/shared/src/types/index.ts`
- [ ] VASTU-1A-110c: API routes: views CRUD endpoints (shell, M) [deps: 110a, 110b]
  - Files: `packages/shell/src/app/api/workspace/views/route.ts`, `packages/shell/src/app/api/workspace/views/[id]/route.ts`
- [ ] VASTU-1A-110d: viewStore Zustand implementation + unit tests (workspace, L) [deps: 110b, 110c]
  - Files: `packages/workspace/src/stores/viewStore.ts`, `packages/workspace/src/types/view.ts`, `packages/workspace/src/types/filter.ts`

---

### VASTU-1A-111: View toolbar [DEPENDS ON: US-110 merged to main] -- #88
Branch: `feature/VASTU-1A-111-view-toolbar` (branch from main AFTER US-110 merges)
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [ ] VASTU-1A-111a: Create ViewToolbar shell + ModifiedIndicator + Save/SaveAs buttons (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/ViewToolbar/ViewToolbar.tsx`, `packages/workspace/src/components/ViewToolbar/ViewToolbar.module.css`, `packages/workspace/src/components/ViewToolbar/ModifiedIndicator.tsx`
- [ ] VASTU-1A-111b: Create ViewPicker dropdown with sections, search, create action (workspace, M) [deps: 111a]
  - Files: `packages/workspace/src/components/ViewToolbar/ViewPicker.tsx`, `packages/workspace/src/components/ViewToolbar/ViewPickerItem.tsx`
- [ ] VASTU-1A-111c: Create ShareDialog + ExportMenu + overflow menu + tests (workspace, M) [deps: 111a]
  - Files: `packages/workspace/src/components/ViewToolbar/ShareDialog.tsx`, `packages/workspace/src/components/ViewToolbar/ExportMenu.tsx`
  - Note: Can run in parallel with 111b (different files)

---

### VASTU-1A-112: VastuTable [DEPENDS ON: US-114, US-110 merged to main] -- #89
Branch: `feature/VASTU-1A-112-vastu-table` (branch from main AFTER US-114 and US-110 merge)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~1500 lines

- [ ] VASTU-1A-112a: VastuTable types, column definition, TanStack Table core setup (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/VastuTable/VastuTable.tsx`, `packages/workspace/src/components/VastuTable/types.ts`
- [ ] VASTU-1A-112b: TableHeader with sort, resize, drag-reorder (workspace, L) [deps: 112a]
  - Files: `packages/workspace/src/components/VastuTable/TableHeader.tsx`
  - Agent: design-engineer (complex interactive UI)
- [ ] VASTU-1A-112c: Cell renderer registry + all 8 cell renderers (workspace, M) [deps: 112a]
  - Files: `packages/workspace/src/components/VastuTable/cellRenderers/*.tsx`, `packages/workspace/src/components/VastuTable/TableCell.tsx`
  - Note: Can run in parallel with 112b
- [ ] VASTU-1A-112d: TableSearchBar (debounced, highlight) + TableDensityToggle + TableColumnPicker (workspace, M) [deps: 112a]
  - Files: `packages/workspace/src/components/VastuTable/TableSearchBar.tsx`, `packages/workspace/src/components/VastuTable/TableDensityToggle.tsx`, `packages/workspace/src/components/VastuTable/TableColumnPicker.tsx`
  - Note: Can run in parallel with 112b/112c
- [ ] VASTU-1A-112e: TablePagination + TableBulkActionBar (workspace, M) [deps: 112a]
  - Files: `packages/workspace/src/components/VastuTable/TablePagination.tsx`, `packages/workspace/src/components/VastuTable/TableBulkActionBar.tsx`
  - Note: Can run in parallel with 112b/112c/112d
- [ ] VASTU-1A-112f: Virtual scrolling (TanStack Virtual) + TableSkeleton (workspace, M) [deps: 112a]
  - Files: `packages/workspace/src/hooks/useVirtualRows.ts`, `packages/workspace/src/components/VastuTable/TableSkeleton.tsx`
  - Note: Can run in parallel with 112b-112e
- [ ] VASTU-1A-112g: View store sync (bidirectional state binding) + comprehensive tests (workspace, M) [deps: 112b, 112c, 112d, 112e, 112f]
  - Files: `packages/workspace/src/components/VastuTable/VastuTable.tsx` (update)

---

### VASTU-1A-113: VastuContextMenu [DEPENDS ON: US-107 merged to main] -- #90
Branch: `feature/VASTU-1A-113-context-menu` (branch from main AFTER US-107 merges)
Package: workspace | Agent: dev-engineer | Est: ~600 lines

- [ ] VASTU-1A-113a: Create ContextMenuProvider + VastuContextMenu component + types (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/VastuContextMenu/ContextMenuProvider.tsx`, `packages/workspace/src/components/VastuContextMenu/VastuContextMenu.tsx`, `packages/workspace/src/components/VastuContextMenu/VastuContextMenu.module.css`, `packages/workspace/src/components/VastuContextMenu/types.ts`
- [ ] VASTU-1A-113b: Create menuConfigs for cell, row, header, badge targets (workspace, M) [deps: 113a]
  - Files: `packages/workspace/src/components/VastuContextMenu/menuConfigs.ts`, `packages/workspace/src/hooks/useContextMenu.ts`
- [ ] VASTU-1A-113c: Integrate with VastuTable (data attributes) + tests (workspace, M) [deps: 113b]

---

### VASTU-1A-114: Composable filter system [DEPENDS ON: US-106 merged to main] -- #91
Branch: `feature/VASTU-1A-114-filter-system` (branch from main AFTER US-106 merges)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~1200 lines

- [ ] VASTU-1A-114a: FilterEngine standalone module + FilterNode types + unit tests (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/FilterSystem/FilterEngine.ts`, `packages/workspace/src/components/FilterSystem/types.ts`
  - Agent: dev-engineer (pure logic)
- [ ] VASTU-1A-114b: FilterPill + FilterModeSelector + FilterBar shell (workspace, M) [deps: 114a]
  - Files: `packages/workspace/src/components/FilterSystem/FilterBar.tsx`, `packages/workspace/src/components/FilterSystem/FilterBar.module.css`, `packages/workspace/src/components/FilterSystem/FilterPill.tsx`, `packages/workspace/src/components/FilterSystem/FilterModeSelector.tsx`
  - Agent: design-engineer
- [ ] VASTU-1A-114c: Type-specific filter inputs (Text, Number, Date, Enum, Boolean) (workspace, L) [deps: 114b]
  - Files: `packages/workspace/src/components/FilterSystem/inputs/*.tsx`, `packages/workspace/src/components/FilterSystem/FilterInput.tsx`
  - Agent: design-engineer
- [ ] VASTU-1A-114d: DimensionPicker + "+ Add filter" flow (workspace, S) [deps: 114b]
  - Files: `packages/workspace/src/components/FilterSystem/DimensionPicker.tsx`
  - Agent: design-engineer
  - Note: Can run in parallel with 114c
- [ ] VASTU-1A-114e: CompositeFilterBuilder with nested AND/OR groups + drag reorder (workspace, L) [deps: 114c]
  - Files: `packages/workspace/src/components/FilterSystem/CompositeFilterBuilder.tsx`
  - Agent: dev-engineer (complex logic + UI)
- [ ] VASTU-1A-114f: Integration with VastuTable + viewStore sync + E2E tests (workspace, M) [deps: 114e]

---

### VASTU-1A-115: Tray bar [DEPENDS ON: US-107 merged to main] -- #92
Branch: `feature/VASTU-1A-115-tray-bar` (branch from main AFTER US-107 merges)
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [ ] VASTU-1A-115a: Create TrayBar shell + TrayItem + styles + animations (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/TrayBar/TrayBar.tsx`, `packages/workspace/src/components/TrayBar/TrayBar.module.css`, `packages/workspace/src/components/TrayBar/TrayItem.tsx`
- [ ] VASTU-1A-115b: Create TrayItemPreview (HoverCard) + right-click context menu (workspace, M) [deps: 115a]
  - Files: `packages/workspace/src/components/TrayBar/TrayItemPreview.tsx`
- [ ] VASTU-1A-115c: Create TrayOverflow + empty state + Cmd+K button (workspace, S) [deps: 115a]
  - Files: `packages/workspace/src/components/TrayBar/TrayOverflow.tsx`
  - Note: Can run in parallel with 115b
- [ ] VASTU-1A-115d: Wire trayStore to panelStore minimize/restore + tests (workspace, M) [deps: 115b, 115c]
  - Files: `packages/workspace/src/stores/trayStore.ts`, `packages/workspace/src/stores/panelStore.ts`

---

### VASTU-1A-116: Command palette [DEPENDS ON: US-107, US-109 merged to main] -- #93
Branch: `feature/VASTU-1A-116-command-palette` (branch from main AFTER US-107 and US-109 merge)
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [ ] VASTU-1A-116a: Create CommandPalette with Spotlight integration + PageResult rendering (workspace, M) [no deps]
  - Files: `packages/workspace/src/components/CommandPalette/CommandPalette.tsx`, `packages/workspace/src/components/CommandPalette/CommandPalette.module.css`, `packages/workspace/src/components/CommandPalette/PageResult.tsx`
- [ ] VASTU-1A-116b: Create RecentResult + CommandResult + commandRegistry (workspace, M) [deps: 116a]
  - Files: `packages/workspace/src/components/CommandPalette/RecentResult.tsx`, `packages/workspace/src/components/CommandPalette/CommandResult.tsx`, `packages/workspace/src/components/CommandPalette/commandRegistry.ts`, `packages/workspace/src/hooks/useRecentRecords.ts`
- [ ] VASTU-1A-116c: Keyboard navigation (Tab for new panel) + footer hints + tests (workspace, M) [deps: 116b]

---

### VASTU-1A-117: Global keyboard shortcuts [DEPENDS ON: all above merged to main] -- #94
Branch: `feature/VASTU-1A-117-keyboard-shortcuts` (branch from main AFTER all features merge)
Package: workspace | Agent: dev-engineer | Est: ~600 lines

- [ ] VASTU-1A-117a: Create useKeyboardShortcuts hook with global registrations (workspace, M) [no deps]
  - Files: `packages/workspace/src/hooks/useKeyboardShortcuts.ts`
- [ ] VASTU-1A-117b: Create useTableShortcuts hook for table-specific shortcuts (workspace, S) [no deps, parallel with 117a]
  - Files: `packages/workspace/src/hooks/useTableShortcuts.ts`
- [ ] VASTU-1A-117c: Create ShortcutsModal with grouped display + OS detection (workspace, M) [deps: 117a]
  - Files: `packages/workspace/src/components/ShortcutsModal/ShortcutsModal.tsx`, `packages/workspace/src/components/ShortcutsModal/ShortcutGroup.tsx`
- [ ] VASTU-1A-117d: Focus management (tab order, focus rings, overlay stack) + tests (workspace, M) [deps: 117a, 117b, 117c]
  - Files: `packages/workspace/src/components/WorkspaceShell.tsx`

---

## Implementation Sequence

### Wave 1: Stream 1 -- Phase 0 Cleanup (parallel)
All five features can begin immediately. No dependencies between them.

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-101 i18n | `feature/VASTU-1A-101-i18n-next-intl` | dev-engineer | ~500 |
| US-102 MFA | `feature/VASTU-1A-102-mfa-enforcement` | dev-engineer | ~500 |
| US-103 Session | `feature/VASTU-1A-103-session-expiry` | dev-engineer | ~150 |
| US-104 CI | `feature/VASTU-1A-104-ci-coverage` | devops-engineer | ~200 |
| US-105 Docs | `feature/VASTU-1A-105-fumadocs` | dev-engineer | ~400 |

### Wave 2: Workspace Foundation
After US-101 merges to main. US-106 is the gateway for all workspace work.

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-106 Workspace layout | `feature/VASTU-1A-106-workspace-layout` | dev-engineer | ~500 |

### Wave 3: Workspace Features (parallel after US-106 merges)

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-107 Dockview | `feature/VASTU-1A-107-dockview-host` | dev + design | ~900 |
| US-109 Sidebar | `feature/VASTU-1A-109-sidebar-nav` | design-engineer | ~600 |
| US-110 View store | `feature/VASTU-1A-110-view-store` | dev-engineer | ~700 |
| US-114 Filters | `feature/VASTU-1A-114-filter-system` | dev + design | ~1200 |

### Wave 4: Features dependent on Wave 3

| Feature | Waits for | Branch | Agent | Est |
|---------|-----------|--------|-------|-----|
| US-108 Mode switch | US-107 | `feature/VASTU-1A-108-mode-switch` | design-engineer | ~300 |
| US-111 View toolbar | US-110 | `feature/VASTU-1A-111-view-toolbar` | design-engineer | ~600 |
| US-112 VastuTable | US-114+110 | `feature/VASTU-1A-112-vastu-table` | dev + design | ~1500 |
| US-113 Context menu | US-107 | `feature/VASTU-1A-113-context-menu` | dev-engineer | ~600 |
| US-115 Tray bar | US-107 | `feature/VASTU-1A-115-tray-bar` | design-engineer | ~600 |
| US-116 Command palette | US-107+109 | `feature/VASTU-1A-116-command-palette` | design-engineer | ~600 |

### Wave 5: Final Integration
After all above merge to main.

| Feature | Branch | Agent | Est |
|---------|--------|-------|-----|
| US-117 Keyboard shortcuts | `feature/VASTU-1A-117-keyboard-shortcuts` | dev-engineer | ~600 |

---

## Task Size Summary

| Size | Count | Description |
|------|-------|-------------|
| S | 12 | < 200 lines |
| M | 37 | 200-500 lines |
| L | 10 | 500+ lines |
| **Total** | **59** | |

## Issue Reference

| Story | GitHub Issue | Status |
|-------|-------------|--------|
| US-101 | #78 | Pending |
| US-102 | #79 | Pending |
| US-103 | #80 | Pending |
| US-104 | #81 | Pending |
| US-105 | #82 | Pending |
| US-106 | #83 | Pending |
| US-107 | #84 | Pending |
| US-108 | #85 | Pending |
| US-109 | #86 | Pending |
| US-110 | #87 | Pending |
| US-111 | #88 | Pending |
| US-112 | #89 | Pending |
| US-113 | #90 | Pending |
| US-114 | #91 | Pending |
| US-115 | #92 | Pending |
| US-116 | #93 | Pending |
| US-117 | #94 | Pending |

# Phase 1A: Workspace Infrastructure -- Todo

> Created: 2026-03-20
> Status: COMPLETE (14/17 stories delivered, 2 not started, 1 partial)
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

### VASTU-1A-101: Replace i18n stub [INDEPENDENT] -- #78 -- COMPLETE
Branch: `feature/VASTU-1A-101-i18n-next-intl`
Package: shell | Agent: dev-engineer | Est: ~500 lines

- [x] VASTU-1A-101a: Extract translations record to `messages/en.json`, install `next-intl`, create request config (shell, M) [no deps] -- PR #96
  - Files: `packages/shell/package.json`, `packages/shell/messages/en.json`, `packages/shell/src/i18n.ts`
- [x] VASTU-1A-101b: Rewrite `i18n.ts` wrapper, update middleware, `layout.tsx`, `next.config.mjs` (shell, M) [deps: 101a] -- PR #98
  - Files: `packages/shell/src/lib/i18n.ts`, `packages/shell/src/middleware.ts`, `packages/shell/src/app/layout.tsx`, `packages/shell/next.config.mjs`
- [x] VASTU-1A-101c: Verify all existing pages render, fix breakage, add unit tests (shell, S) [deps: 101b] -- PR #100
  - Files: `packages/shell/src/lib/__tests__/i18n.test.ts`

---

### VASTU-1A-102: MFA enforcement separation [INDEPENDENT] -- #79 -- COMPLETE
Branch: `feature/VASTU-1A-102-mfa-enforcement`
Package: shell, shared | Agent: dev-engineer | Est: ~500 lines

- [x] VASTU-1A-102a: Schema migration + type update + API route modification (shared, S) [no deps] -- PR #106
  - Files: `packages/shared/src/prisma/schema.prisma`, `packages/shared/src/types/tenant.ts`, `packages/shell/src/app/api/settings/organization/route.ts`
- [x] VASTU-1A-102b: UI toggle in SsoProviderList + i18n strings + unit tests (shell, M) [deps: 102a] -- PR #106
  - Files: `packages/shell/src/components/settings/SsoProviderList.tsx`, i18n strings
- [x] VASTU-1A-102c: MFA redirect logic in session callback + middleware + E2E test (shell, M) [deps: 102b] -- PR #107
  - Files: `packages/shell/src/middleware.ts`, `packages/shell/src/lib/auth.ts`

---

### VASTU-1A-103: Session expiry detection [INDEPENDENT] -- #80 -- COMPLETE
Branch: `feature/VASTU-1A-103-session-expiry`
Package: shell | Agent: dev-engineer | Est: ~150 lines

- [x] VASTU-1A-103a: Create `SessionGuard` component with polling logic (shell, S) [no deps] -- PR #105
  - Files: `packages/shell/src/components/auth/SessionGuard.tsx`
- [x] VASTU-1A-103b: Integrate into layouts + login page expired state + tests (shell, S) [deps: 103a] -- PR #108
  - Files: `packages/shell/src/app/(shell)/layout.tsx`, `packages/shell/src/app/workspace/layout.tsx`, `packages/shell/src/app/(auth)/login/page.tsx`

---

### VASTU-1A-104: CI coverage comments [INDEPENDENT] -- #81 -- COMPLETE
Branch: `feature/VASTU-1A-104-ci-coverage`
Package: root | Agent: devops-engineer | Est: ~200 lines

- [x] VASTU-1A-104a: Add Vitest JSON coverage reporter, configure sticky PR comment action, compute delta (root, M) [no deps] -- PR #95, #101, #102
  - Files: `.github/workflows/ci-coverage-comment.yml`

---

### VASTU-1A-105: Fumadocs setup [INDEPENDENT] -- #82 -- COMPLETE
Branch: `feature/VASTU-1A-105-fumadocs`
Package: docs (new) | Agent: dev-engineer | Est: ~400 lines

- [x] VASTU-1A-105a: Create `packages/docs` package with fumadocs config, layout, catch-all page (docs, M) [no deps] -- PR #97
  - Files: `packages/docs/package.json`, `packages/docs/next.config.mjs`, `packages/docs/src/app/layout.tsx`, `packages/docs/src/app/docs/[[...slug]]/page.tsx`, `packages/docs/tsconfig.json`
- [x] VASTU-1A-105b: Migrate existing docs content to MDX pages, add `docs:dev` script to root (docs, M) [deps: 105a] -- PR #104
  - Files: `packages/docs/content/docs/**/*.mdx`, `package.json` (root), `turbo.json`

---

### VASTU-1A-106: Workspace package and layout [DEPENDS ON: US-101 merged to main] -- #83 -- COMPLETE
Branch: `feature/VASTU-1A-106-workspace-layout` (branch from main AFTER US-101 merges)
Package: workspace, shell | Agent: dev-engineer | Est: ~500 lines

- [x] VASTU-1A-106a: Activate workspace package: dependencies, tsconfig, scripts, test-utils (workspace, M) [no deps] -- PR #109
- [x] VASTU-1A-106b: Create WorkspaceProviders (Zustand + TanStack Query wrappers) (workspace, S) [deps: 106a] -- PR #109
- [x] VASTU-1A-106c: Create WorkspaceShell layout + sidebarStore + update shell route files (workspace/shell, M) [deps: 106b] -- PR #109
- [x] VASTU-1A-106d: Integration tests + E2E (workspace, S) [deps: 106c] -- PR #110

---

### VASTU-1A-107: Dockview panel host [DEPENDS ON: US-106 merged to main] -- #84 -- COMPLETE
Branch: `feature/VASTU-1A-107-dockview-host` (branch from main AFTER US-106 merges)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~900 lines

- [x] VASTU-1A-107a: Create panel type definitions + panel registry + WelcomePanel (workspace, S) [no deps] -- PR #111
- [x] VASTU-1A-107b: Create DockviewHost component with Dockview integration (workspace, L) [deps: 107a] -- PR #111
- [x] VASTU-1A-107c: Create PanelTab custom renderer + DropIndicator (workspace, M) [deps: 107b] -- PR #111
- [x] VASTU-1A-107d: Implement panelStore with localStorage persistence + URL serialization (workspace, M) [deps: 107a] -- PR #111
- [x] VASTU-1A-107e: Integrate DockviewHost into WorkspaceShell + tests (workspace, M) [deps: 107b, 107c, 107d] -- PR #116

---

### VASTU-1A-108: Mode switch [DEPENDS ON: US-107 merged to main] -- #85 -- PARTIAL (wrong feature delivered, see #136)
Branch: `feature/VASTU-1A-108-mode-switch` (branch from main AFTER US-107 merges)
Package: workspace | Agent: design-engineer | Est: ~300 lines

- [x] VASTU-1A-108a: Create ModeSwitch component (workspace, M) [no deps] -- PR #133 (DEVIATION: built IER filter modes instead of Editor/Builder/Workflow)
- [x] VASTU-1A-108b: Integrate into panel + tests (workspace, S) [deps: 108a] -- PR #145

---

### VASTU-1A-109: Workspace sidebar navigation [DEPENDS ON: US-106 merged to main] -- #86 -- COMPLETE
Branch: `feature/VASTU-1A-109-sidebar-nav` (branch from main AFTER US-106 merges)
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [x] VASTU-1A-109a: Create SidebarNav shell with collapsed/expanded states + CSS animations (workspace, M) [no deps] -- PR #112
- [x] VASTU-1A-109b: Create SidebarSection + SidebarItem + SidebarSearch + CASL gating (workspace, M) [deps: 109a] -- PR #112
- [x] VASTU-1A-109c: Create SidebarUserAvatar + wire to panelStore + tests (workspace, M) [deps: 109b] -- PR #118

---

### VASTU-1A-110: View state store [DEPENDS ON: US-106 merged to main] -- #87 -- COMPLETE (with known bugs #124, #125, #126)
Branch: `feature/VASTU-1A-110-view-store` (branch from main AFTER US-106 merges)
Package: workspace, shared, shell | Agent: dev-engineer | Est: ~700 lines

- [x] VASTU-1A-110a: Prisma schema: Page + View models, migration, seed mock pages (shared, M) [no deps] -- PR #119
- [x] VASTU-1A-110b: Shared types: View, Page, FilterNode, ViewState types (shared, S) [no deps] -- PR #119
- [x] VASTU-1A-110c: API routes: views CRUD endpoints (shell, M) [deps: 110a, 110b] -- PR #119
- [x] VASTU-1A-110d: viewStore Zustand implementation + unit tests (workspace, L) [deps: 110b, 110c] -- PR #121

---

### VASTU-1A-111: View toolbar [DEPENDS ON: US-110 merged to main] -- #88 -- COMPLETE (with known bugs #141-#144)
Branch: `feature/VASTU-1A-111-view-toolbar` (branch from main AFTER US-110 merges)
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [x] VASTU-1A-111a: Create ViewToolbar shell + Save/SaveAs buttons (workspace, M) [no deps] -- PR #135
- [x] VASTU-1A-111b: Create ViewSelector dropdown with sections, search, create action (workspace, M) [deps: 111a] -- PR #135
- [x] VASTU-1A-111c: Tests + integration (workspace, M) [deps: 111a] -- PR #146

---

### VASTU-1A-112: VastuTable [DEPENDS ON: US-114, US-110 merged to main] -- #89 -- COMPLETE (with known bugs #160, #161)
Branch: `feature/VASTU-1A-112-vastu-table` (branch from main AFTER US-114 and US-110 merge)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~1500 lines

- [x] VASTU-1A-112a: VastuTable types, column definition, TanStack Table core setup (workspace, M) [no deps] -- PR #150
- [x] VASTU-1A-112b: TableHeader with sort, resize (workspace, L) [deps: 112a] -- PR #150
- [x] VASTU-1A-112c: Cell renderers (workspace, M) [deps: 112a] -- PR #150
- [x] VASTU-1A-112d-f: Virtual scrolling + view integration (workspace, M) -- PR #150
- [x] VASTU-1A-112g: View store sync + tests (workspace, M) -- PR #162

---

### VASTU-1A-113: VastuContextMenu [DEPENDS ON: US-107 merged to main] -- #90 -- COMPLETE (with known bugs #139, #140, #160)
Branch: `feature/VASTU-1A-113-context-menu` (branch from main AFTER US-107 merges)
Package: workspace | Agent: dev-engineer | Est: ~600 lines

- [x] VASTU-1A-113a: Create ContextMenu component + types (workspace, M) [no deps] -- PR #134
- [x] VASTU-1A-113b: Create menu items, groups, dividers (workspace, M) [deps: 113a] -- PR #134
- [x] VASTU-1A-113c: Keyboard nav + portal rendering + tests (workspace, M) [deps: 113b] -- PR #148

---

### VASTU-1A-114: Composable filter system [DEPENDS ON: US-106 merged to main] -- #91 -- COMPLETE (with known bug #123)
Branch: `feature/VASTU-1A-114-filter-system` (branch from main AFTER US-106 merges)
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~1200 lines

- [x] VASTU-1A-114a: FilterEngine standalone module + FilterNode types + unit tests (workspace, M) [no deps] -- PR #120
- [x] VASTU-1A-114b: FilterPill + FilterModeSelector + FilterBar shell (workspace, M) [deps: 114a] -- PR #120
- [x] VASTU-1A-114c: Type-specific filter inputs (Text, Number, Date, Enum, Boolean) (workspace, L) [deps: 114b] -- PR #120
- [x] VASTU-1A-114d: DimensionPicker + "+ Add filter" flow (workspace, S) [deps: 114b] -- PR #120
- [x] VASTU-1A-114e: CompositeFilterBuilder with nested AND/OR groups (workspace, L) [deps: 114c] -- PR #120
- [x] VASTU-1A-114f: Integration + tests (workspace, M) [deps: 114e] -- PR #122

---

### VASTU-1A-115: Tray bar [DEPENDS ON: US-107 merged to main] -- #92 -- COMPLETE
Branch: `feature/VASTU-1A-115-tray-bar` (branch from main AFTER US-107 merges)
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [x] VASTU-1A-115a: Create TrayBar shell + TrayItem + styles + animations (workspace, M) [no deps] -- PR #149
- [x] VASTU-1A-115b-c: TrayItem features + empty state (workspace, M) -- PR #149
- [x] VASTU-1A-115d: Wire trayStore to panelStore minimize/restore + tests (workspace, M) -- PR #164

---

### VASTU-1A-116: Command palette [DEPENDS ON: US-107, US-109 merged to main] -- #93 -- NOT STARTED (carried to Phase 1B)
Branch: not created
Package: workspace | Agent: design-engineer | Est: ~600 lines

- [ ] VASTU-1A-116a: Create CommandPalette with Spotlight integration + PageResult rendering (workspace, M) [no deps]
- [ ] VASTU-1A-116b: Create RecentResult + CommandResult + commandRegistry (workspace, M) [deps: 116a]
- [ ] VASTU-1A-116c: Keyboard navigation (Tab for new panel) + footer hints + tests (workspace, M) [deps: 116b]

---

### VASTU-1A-117: Global keyboard shortcuts [DEPENDS ON: all above merged to main] -- #94 -- NOT STARTED (carried to Phase 1B)
Branch: not created
Package: workspace | Agent: dev-engineer | Est: ~600 lines

- [ ] VASTU-1A-117a: Create useKeyboardShortcuts hook with global registrations (workspace, M) [no deps]
- [ ] VASTU-1A-117b: Create useTableShortcuts hook for table-specific shortcuts (workspace, S) [no deps, parallel with 117a]
- [ ] VASTU-1A-117c: Create ShortcutsModal with grouped display + OS detection (workspace, M) [deps: 117a]
- [ ] VASTU-1A-117d: Focus management (tab order, focus rings, overlay stack) + tests (workspace, M) [deps: 117a, 117b, 117c]

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
| US-101 | #78 | Closed |
| US-102 | #79 | Closed |
| US-103 | #80 | Closed |
| US-104 | #81 | Closed |
| US-105 | #82 | Closed |
| US-106 | #83 | Closed |
| US-107 | #84 | Closed |
| US-108 | #85 | Closed (partial -- wrong feature, see #136) |
| US-109 | #86 | Closed |
| US-110 | #87 | Closed (bugs: #124, #125, #126) |
| US-111 | #88 | Closed (bugs: #141-#144) |
| US-112 | #89 | Closed (bugs: #160, #161) |
| US-113 | #90 | Closed (bugs: #139, #140) |
| US-114 | #91 | Closed (bug: #123) |
| US-115 | #92 | Closed |
| US-116 | #93 | Open -- NOT STARTED (carry to Phase 1B) |
| US-117 | #94 | Open -- NOT STARTED (carry to Phase 1B) |

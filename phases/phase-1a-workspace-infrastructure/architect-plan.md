# Phase 1A: Workspace Infrastructure -- Architect Plan

## Document Info

| Field | Value |
|-------|-------|
| Phase | 1A -- Workspace Infrastructure |
| Author | Architect Agent |
| Date | 2026-03-20 |
| Status | Draft -- pending human review |
| Prerequisite | Phase 0 complete (merged on main, commit aab26ec) |

---

## Table of Contents

1. [Dependency Order](#dependency-order)
2. [Cross-Cutting Concerns](#cross-cutting-concerns)
3. [US-101: Replace i18n Stub](#us-101-replace-i18n-stub)
4. [US-102: MFA Enforcement Separation](#us-102-mfa-enforcement-separation)
5. [US-103: Session Expiry Detection](#us-103-session-expiry-detection)
6. [US-104: CI Coverage Comments](#us-104-ci-coverage-comments)
7. [US-105: Fumadocs Setup](#us-105-fumadocs-setup)
8. [US-106: Workspace Package and Layout](#us-106-workspace-package-and-layout)
9. [US-107: Dockview Panel Host](#us-107-dockview-panel-host)
10. [US-108: Mode Switch](#us-108-mode-switch)
11. [US-109: Workspace Sidebar Navigation](#us-109-workspace-sidebar-navigation)
12. [US-110: View State Store](#us-110-view-state-store)
13. [US-111: View Toolbar](#us-111-view-toolbar)
14. [US-112: VastuTable](#us-112-vastutable)
15. [US-113: VastuContextMenu](#us-113-vastucontextmenu)
16. [US-114: Composable Filter System](#us-114-composable-filter-system)
17. [US-115: Tray Bar](#us-115-tray-bar)
18. [US-116: Command Palette](#us-116-command-palette)
19. [US-117: Global Keyboard Shortcuts](#us-117-global-keyboard-shortcuts)
20. [Risk Assessment](#risk-assessment)
21. [Architecture Decision Records](#architecture-decision-records)

---

## Dependency Order

Stories must be completed in this sequence (arrows denote "must complete before"):

```
Phase 0 Cleanup (parallel, no dependencies between them):
  US-101 (i18n)       ─────┐
  US-102 (MFA toggle)      │
  US-103 (session expiry)  ├──> US-106 (workspace package activation)
  US-104 (CI coverage)     │
  US-105 (Fumadocs)  ──────┘

Workspace Core (sequential):
  US-106 (workspace package) ──> US-107 (Dockview host) ──> US-108 (mode switch)
                               │                            │
                               └──> US-109 (sidebar) ───────┤
                                                            │
  US-110 (view store) ──> US-111 (view toolbar) ────────────┤
                                                            │
  US-114 (filter system) ──> US-112 (VastuTable) ──────────>│
                                                            │
  US-113 (context menu) ────────────────────────────────────┤
                                                            │
  US-107 ──> US-115 (tray bar) ────────────────────────────>│
                                                            │
  US-107 + US-109 ──> US-116 (command palette) ─────────────┤
                                                            │
  All above ──> US-117 (global keyboard shortcuts) ─────────┘
```

**Critical path:** US-101 -> US-106 -> US-107 -> US-112 (longest chain).

US-101 must land first because every subsequent story adds i18n strings. US-106 must land before any workspace feature because it provides the layout, providers, and routing. US-107 (Dockview) is the container for panels, sidebar, and tray bar.

---

## Cross-Cutting Concerns

### New npm dependencies required

WARNING -- HUMAN DECISION NEEDED: The following new npm packages are required. All are well-established, MIT-licensed, and explicitly named in the requirements or CLAUDE.md.

| Package | Why | Package to add to |
|---------|-----|-------------------|
| `next-intl` | US-101: i18n library replacing the stub | `@vastu/shell` |
| `dockview` + `dockview-react` | US-107: Window management (specified in CLAUDE.md) | `@vastu/workspace` |
| `zustand` | US-106/110: Client state (specified in CLAUDE.md) | `@vastu/workspace` |
| `@tanstack/react-query` | US-106: Server data fetching (specified in CLAUDE.md) | `@vastu/workspace` |
| `@tanstack/react-table` | US-112: Table engine (specified in CLAUDE.md) | `@vastu/workspace` |
| `@tanstack/react-virtual` | US-112: Virtual scrolling for 50+ rows | `@vastu/workspace` |
| `fumadocs-core` + `fumadocs-ui` + `fumadocs-mdx` | US-105: Docs site | `@vastu/docs` (new package) |
| `@mantine/spotlight` | US-116: Command palette (already in style guide component inventory) | `@vastu/workspace` |

### Shared component migration

The following Phase 0 components in `packages/shell/src/components/shared/` are needed by workspace too:
- `TruncatedText`
- `EmptyState`
- `ConfirmDialog`
- `TableSkeleton`

WARNING -- HUMAN DECISION NEEDED: Two options:
1. **Option A (recommended):** Keep these in shell for now; workspace imports from shell via path alias. Acceptable since workspace is mounted as a route segment within shell's Next.js app.
2. **Option B:** Move to `packages/shared/src/components/`. This contradicts shared's CLAUDE.md which says "NO React components."

Recommendation: Option A. The workspace package is not a standalone app -- it is a route segment rendered by the shell's Next.js instance. Workspace components can import shell shared components using the `@/` path alias that resolves to `packages/shell/src/`.

### Database migration

Two new tables and one new column needed:
- `organizations.mfa_required` boolean column (US-102)
- `views` table (US-110)
- `pages` table (US-110 -- referenced by views.page_id)

WARNING -- HUMAN DECISION NEEDED: The `pages` table is not explicitly mentioned in the requirements but is required by `views.page_id`. In Phase 1A, pages are mock registrations (seed data). The `pages` table serves as the registry for page definitions. Options:
1. **Option A (recommended):** Create a minimal `pages` table now (id, name, slug, icon, template_type, organization_id, created_at, updated_at) and seed mock data. This table will be expanded in Phase 1B.
2. **Option B:** Use only a client-side registry with no DB table; views reference pages by slug string.

Recommendation: Option A -- the view system needs stable page IDs, and this aligns with P01 (Everything is addressable).

### Workspace package structure

The workspace package is currently a stub. It needs to be activated as a functioning part of the shell's Next.js app. The workspace code will live in `packages/workspace/src/` and be imported by the shell's `app/workspace/` route segment.

Target directory structure for `packages/workspace/src/`:
```
src/
  components/
    DockviewHost/
    ModeSwitch/
    SidebarNav/
    TrayBar/
    ViewToolbar/
    ViewPicker/
    VastuTable/
    VastuContextMenu/
    FilterSystem/
    CommandPalette/
    ShortcutsModal/
  stores/
    panelStore.ts
    viewStore.ts
    sidebarStore.ts
    trayStore.ts
  hooks/
    useKeyboardShortcuts.ts
    queries/
  panels/
    registry.ts
  types/
    panel.ts
    view.ts
    filter.ts
  test-utils/
    mock-dockview.ts
    providers.tsx
  index.ts
```

---

## US-101: Replace i18n Stub

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/shell/package.json` | Modify: add `next-intl` dependency | shell |
| `packages/shell/src/lib/i18n.ts` | Modify: replace stub with `next-intl` `useTranslations` / `getTranslations` wrapper | shell |
| `packages/shell/messages/en.json` | Create: extract all 700+ keys from current `translations` record | shell |
| `packages/shell/src/i18n.ts` | Create: `next-intl` request config (locale detection from Accept-Language) | shell |
| `packages/shell/src/middleware.ts` | Modify: integrate `next-intl` middleware (createMiddleware) with existing auth middleware | shell |
| `packages/shell/next.config.mjs` | Modify: add `next-intl` plugin configuration | shell |
| `packages/shell/src/app/layout.tsx` | Modify: wrap with `NextIntlClientProvider` | shell |

### Database changes
None.

### API/MCP surface
None.

### State management
None -- i18n is a build/request-time concern.

### Component hierarchy
Root layout provides `NextIntlClientProvider` with messages. Server components use `getTranslations()`. Client components use `useTranslations()`. The existing `t('key')` function signature is preserved as a thin wrapper.

### Design system mapping
No wireframe. This is infrastructure.

### Edge cases
- Backward compatibility: all 700+ existing `t('key')` calls must work without changes. The key format (dot-separated namespace) is already compatible with `next-intl`.
- Missing keys: `next-intl` throws by default on missing keys. Configure `onError` to log warning and return the key string (matching current behavior).
- Server components vs client components: `next-intl` handles both via `getTranslations` (server) and `useTranslations` (client). The existing `t()` function is only usable in synchronous contexts (client). Server components should migrate to `getTranslations()`.

### Testing strategy
- Unit test: verify that `t('login.title')` returns the expected English string.
- Unit test: verify that missing keys return the key itself (no crash).
- E2E test: verify existing pages render correctly after migration (login, settings).
- No new E2E tests needed -- existing tests implicitly cover i18n.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 1a | Extract translations record to `messages/en.json`, install `next-intl`, create request config | M |
| 1b | Rewrite `i18n.ts` wrapper, update middleware, update `layout.tsx` and `next.config.mjs` | M |
| 1c | Verify all existing pages render, fix any breakage, add unit tests | S |

---

## US-102: MFA Enforcement Separation

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/shared/src/prisma/schema.prisma` | Modify: add `mfaRequired Boolean @default(false) @map("mfa_required")` to `Organization` model | shared |
| `packages/shared/src/prisma/migrations/{timestamp}_add_mfa_required/` | Create: Prisma migration | shared |
| `packages/shared/src/types/tenant.ts` | Modify: add `mfaRequired` to Organization type | shared |
| `packages/shell/src/components/settings/SsoProviderList.tsx` | Modify: add second toggle "Require MFA for all users" alongside existing SSO toggle | shell |
| `packages/shell/src/app/api/settings/organization/route.ts` | Modify: handle `mfaRequired` in PATCH body | shell |
| `packages/shell/src/lib/i18n.ts` (or `messages/en.json` if US-101 lands first) | Modify: add MFA enforcement strings | shell |
| `packages/shell/src/middleware.ts` | Modify: check `mfaRequired` flag and redirect users without MFA to `/mfa` setup | shell |

### Database changes
- Add column `mfa_required` (boolean, default false) to `organizations` table.
- Prisma migration required.

### API/MCP surface
- Modify `PATCH /api/settings/organization`: accept `mfaRequired` boolean in body.
- Modify `GET /api/settings/organization`: return `mfaRequired` in response.

### State management
None -- this is server-side enforcement + a settings toggle.

### Component hierarchy
`SsoProviderList` renders the enforcement section. Two `Checkbox` toggles: existing `ssoRequired` and new `mfaRequired`. Both use the same optimistic update pattern already established.

### Design system mapping
Follows the existing pattern in `SsoProviderList.tsx` lines 254-270 (enforcement section). Add a second checkbox below the first.

### Edge cases
- Both toggles can be independently enabled (AC-4). No mutual exclusion logic needed.
- When `mfaRequired` is true and a user logs in without MFA configured, redirect to `/mfa` (setup wizard). The MFA page already exists from Phase 0.
- MFA enforcement check must happen after authentication, not in the Edge Runtime middleware (which cannot query the DB). The check should be in the session callback or a server component guard.

WARNING -- HUMAN DECISION NEEDED: Where to enforce MFA redirect?
1. **Option A (recommended):** In the `auth.ts` session callback: if `org.mfaRequired && !user.mfaEnabled`, set a session flag `mfaPending: true`. Then in middleware, check for this flag and redirect to `/mfa`.
2. **Option B:** In a server component wrapper that checks on every protected page load.

Recommendation: Option A. The middleware already handles routing logic, and the session callback already loads the organization data.

### Testing strategy
- Unit test: PATCH organization endpoint accepts and persists `mfaRequired`.
- Component test: SsoProviderList renders both toggles independently.
- E2E test: toggle MFA enforcement, verify it persists on page reload.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 2a | Schema migration + type update + API route modification | S |
| 2b | UI toggle in SsoProviderList + i18n strings + unit tests | M |
| 2c | MFA redirect logic in session callback + middleware + E2E test | M |

---

## US-103: Session Expiry Detection

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/shell/src/components/auth/SessionGuard.tsx` | Create: client component that polls session status | shell |
| `packages/shell/src/app/(shell)/layout.tsx` | Modify: include `SessionGuard` | shell |
| `packages/shell/src/app/workspace/layout.tsx` | Modify: include `SessionGuard` | shell |
| `packages/shell/src/app/(auth)/login/page.tsx` | Modify: display "Session expired" message when `?expired=true` | shell |
| `packages/shell/src/lib/i18n.ts` or `messages/en.json` | Modify: add session expiry strings (some already exist: `error.sessionExpired`) | shell |

### Database changes
None.

### API/MCP surface
None -- uses existing `next-auth` `/api/auth/session` endpoint.

### State management
None -- `SessionGuard` uses `useSession` from `next-auth/react` with `required: true` and polls on 60-second interval via `refetchInterval`.

### Component hierarchy
```
(shell)/layout.tsx
  -> SessionGuard (client component, invisible)
     -> useSession({ required: true, onUnauthenticated: redirect })
     -> polls every 60s
     -> on expiry: showNotification() + router.push('/login?expired=true')
```

### Design system mapping
Toast notification follows Patterns Library SS 10.1 (Error type: persistent until dismissed). Login page expired message uses `--v-status-warning` color.

### Edge cases
- AC-4: `SessionGuard` checks `pathname` -- if already on a public route (login, register, etc.), skip the session check entirely to avoid redirect loops.
- Network offline: if the session check fails due to network error, do NOT redirect. Only redirect on confirmed session expiry (401/403 from the session endpoint).
- Multiple tabs: each tab runs its own interval. When one tab's session expires, all tabs will independently detect and redirect.

### Testing strategy
- Component test: mock `useSession` returning `unauthenticated`, verify toast and redirect.
- Component test: verify no redirect when on `/login`.
- E2E test: difficult to test session expiry in Playwright without waiting. Mark as manual QA or use a short session TTL in test env.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 3a | Create `SessionGuard` component with polling logic | S |
| 3b | Integrate into layouts + login page expired state + tests | S |

---

## US-104: CI Coverage Comments

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `.github/workflows/ci-test.yml` | Modify: add coverage reporting steps | root |
| `.github/workflows/ci-coverage-comment.yml` | Create: separate workflow for PR comment (or inline in ci-test.yml) | root |

### Database changes
None.

### API/MCP surface
None.

### State management
None.

### Component hierarchy
N/A -- CI infrastructure only.

### Design system mapping
N/A.

### Edge cases
- The comment must be a "sticky" comment (updates on subsequent pushes rather than creating new comments). `marocchino/sticky-pull-request-comment` handles this.
- Delta calculation requires coverage from the main branch. Use `actions/cache` or artifact from main branch runs.
- If no previous coverage exists (first run), show absolute numbers without delta.

### Testing strategy
- Manual verification on a test PR.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 4a | Add Vitest JSON coverage reporter, configure sticky PR comment action, compute delta | M |

---

## US-105: Fumadocs Setup

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/docs/package.json` | Create: new package with fumadocs deps | docs (new) |
| `packages/docs/next.config.mjs` | Create: Next.js config with fumadocs plugin | docs |
| `packages/docs/src/app/layout.tsx` | Create: root layout with fumadocs providers | docs |
| `packages/docs/src/app/docs/[[...slug]]/page.tsx` | Create: catch-all docs page | docs |
| `packages/docs/content/docs/getting-started/installation.mdx` | Create: migrated content | docs |
| `packages/docs/content/docs/getting-started/docker-setup.mdx` | Create: migrated content | docs |
| `packages/docs/content/docs/getting-started/project-structure.mdx` | Create: migrated content | docs |
| `packages/docs/content/docs/architecture/overview.mdx` | Create: from existing docs | docs |
| `packages/docs/content/docs/design-system/overview.mdx` | Create: summary referencing style guide | docs |
| `packages/docs/content/docs/decisions/*.mdx` | Create: migrate Phase 0 ADRs (if any exist; currently none found) | docs |
| `packages/docs/tsconfig.json` | Create | docs |
| `pnpm-workspace.yaml` | Already includes `packages/*` -- no change needed | root |
| `package.json` (root) | Modify: add `docs:dev` script | root |
| `turbo.json` | Modify: add docs tasks | root |

### Database changes
None.

### API/MCP surface
None.

### State management
None.

### Component hierarchy
Standard Fumadocs layout: sidebar auto-generated from directory structure, search built-in.

### Design system mapping
Fumadocs has its own default theme. No need to match Vastu tokens -- docs site is a developer tool, not the product UI.

### Edge cases
- Port conflict: docs runs on `:3001`, shell on `:3000`.
- The `docs/content/` directory is for Fumadocs MDX content. The existing `docs/` directory at repo root contains design docs. These are different -- Fumadocs content goes in `packages/docs/content/`.
- Fumadocs search is file-based -- no external search service needed.

### Testing strategy
- Manual: verify `pnpm docs:dev` starts, pages render, search works, sidebar generates.
- No automated tests for docs site in this phase.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 5a | Create `packages/docs` package with fumadocs config, layout, catch-all page | M |
| 5b | Migrate existing docs content to MDX pages, add `docs:dev` script to root | M |

---

## US-106: Workspace Package and Layout

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/package.json` | Modify: add real dependencies (react, mantine, zustand, tanstack-query, dockview) | workspace |
| `packages/workspace/tsconfig.json` | Create: TypeScript config extending root | workspace |
| `packages/workspace/src/index.ts` | Modify: export WorkspaceLayout and providers | workspace |
| `packages/workspace/src/components/WorkspaceShell.tsx` | Create: top-level workspace layout (sidebar + content + tray) | workspace |
| `packages/workspace/src/providers/WorkspaceProviders.tsx` | Create: Zustand + TanStack Query + Mantine providers wrapper | workspace |
| `packages/workspace/src/stores/sidebarStore.ts` | Create: sidebar state (collapsed/expanded, persisted to localStorage) | workspace |
| `packages/workspace/src/stores/panelStore.ts` | Create: stub for panel state (expanded in US-107) | workspace |
| `packages/workspace/src/stores/trayStore.ts` | Create: stub for tray state (expanded in US-115) | workspace |
| `packages/workspace/src/types/panel.ts` | Create: panel type definitions | workspace |
| `packages/workspace/src/test-utils/providers.tsx` | Create: test wrapper with all providers | workspace |
| `packages/shell/src/app/workspace/layout.tsx` | Modify: replace placeholder with WorkspaceShell import | shell |
| `packages/shell/src/app/workspace/page.tsx` | Modify: replace placeholder with workspace entry point | shell |

### Database changes
None for US-106 itself. The `pages` table is created as part of US-110 (view store needs it).

### API/MCP surface
None.

### State management
- `useSidebarStore` (Zustand): `{ collapsed: boolean, toggle: () => void }`. Persisted to `localStorage` key `vastu-sidebar-state`.
- `panelStore` and `trayStore` are stubs -- populated in US-107 and US-115.
- `QueryClient` instance created in providers wrapper.

### Component hierarchy
```
shell/app/workspace/layout.tsx
  -> WorkspaceProviders (client boundary)
     -> QueryClientProvider
     -> WorkspaceShell
        -> SidebarNav (US-109, stub div for now)
        -> main content area (Dockview host in US-107, empty div for now)
        -> TrayBar (US-115, stub div for now)
```

### Design system mapping
Wireframe: Group A, Screen 1 -- Workspace shell. Three-region layout: sidebar (left, 48px collapsed / 200px expanded), main content (fills remaining), tray bar (bottom, 44px). All use `--v-bg-*` tokens.

### Edge cases
- Auth protection: middleware already protects `/workspace`. The layout adds a client-side `SessionGuard` (from US-103) as belt-and-suspenders.
- Theme inheritance: the root layout already provides `MantineProvider` with `vastuTheme`. The workspace layout is nested inside it -- no duplicate provider needed.
- The workspace layout must be `"use client"` at the boundary level. The shell's `workspace/layout.tsx` imports the client-side `WorkspaceProviders`.

### Testing strategy
- Component test: `WorkspaceShell` renders three regions (sidebar placeholder, content area, tray placeholder).
- Component test: `WorkspaceProviders` renders children without crash.
- E2E test: navigate to `/workspace`, verify layout renders (not the old placeholder).

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 6a | Activate workspace package: dependencies, tsconfig, scripts, test-utils | M |
| 6b | Create WorkspaceProviders (Zustand + TanStack Query wrappers) | S |
| 6c | Create WorkspaceShell layout + sidebarStore + update shell route files | M |
| 6d | Integration tests + E2E | S |

---

## US-107: Dockview Panel Host

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/DockviewHost/DockviewHost.tsx` | Create: Dockview integration wrapper | workspace |
| `packages/workspace/src/components/DockviewHost/DockviewHost.module.css` | Create: Dockview container styles using `--v-*` tokens | workspace |
| `packages/workspace/src/components/DockviewHost/PanelTab.tsx` | Create: custom tab renderer (title, close button, mode switch slot) | workspace |
| `packages/workspace/src/components/DockviewHost/DropIndicator.tsx` | Create: visual drop indicator for split operations | workspace |
| `packages/workspace/src/panels/registry.ts` | Create: panel type registry (id, title, icon, component) | workspace |
| `packages/workspace/src/panels/WelcomePanel.tsx` | Create: default panel shown on first load | workspace |
| `packages/workspace/src/stores/panelStore.ts` | Modify: full implementation with Dockview state management | workspace |
| `packages/workspace/src/hooks/usePanelPersistence.ts` | Create: localStorage persistence for panel layout | workspace |
| `packages/workspace/src/types/panel.ts` | Modify: add PanelDefinition, PanelState, SerializedLayout types | workspace |
| `packages/workspace/src/components/WorkspaceShell.tsx` | Modify: integrate DockviewHost in main content area | workspace |

### Database changes
None. Panel layout is persisted to localStorage (AC-8) and serialized to URL (AC-9).

### API/MCP surface
None in this phase. MCP tools (`workspace.getLayout`, `workspace.setLayout`) are documented as comments per requirements.

### State management
- `usePanelStore` (Zustand):
  ```
  {
    layout: SerializedDockviewLayout | null,
    openPanel: (def: PanelDefinition) => void,
    closePanel: (id: string) => void,
    focusPanel: (id: string) => void,
    minimizePanel: (id: string) => void,  // stub, completed in US-115
    serializeLayout: () => JSON,
    restoreLayout: (json: JSON) => void,
  }
  ```
- Persisted to `localStorage` key `vastu-panel-layout` on every change (debounced 500ms).
- URL serialization: encode layout JSON to base64 in URL hash or query param.

### Component hierarchy
```
WorkspaceShell
  -> DockviewHost
     -> DockviewReact (from dockview-react)
        -> PanelTab (custom tab component per panel)
        -> Panel content (from registry)
     -> DropIndicator (shown during drag)
```

### Design system mapping
- Wireframe: Group A, Screen 1 -- Dockview area.
- Patterns Library SS 12.1: panel operations (open, split, float, minimize, close, reorder tabs).
- Patterns Library SS 12.2: layout serialization.
- Tab bar: `--v-bg-secondary` background, active tab uses `--v-accent-primary` bottom border, close button uses `IconX` at `--v-icon-xs`.
- Floating panels: `--v-shadow-md`.
- Drag preview: `--v-shadow-lg`.
- Animations per Style Guide SS 7: panel resize 200ms ease-out, tab reorder 150ms.

### Edge cases
- No panels open: show WelcomePanel with instructions ("Open a page from the sidebar or press Cmd+K").
- Layout deserialization failure (corrupted localStorage): catch error, clear stored layout, show default state.
- URL layout parameter: if present, it overrides localStorage. If invalid, fall back to localStorage, then default.
- Panel component not found in registry: show error panel with message "Panel type 'X' not found."
- Focus management: when a panel closes, focus moves to the next adjacent panel.

### Testing strategy
- Component test: DockviewHost renders with mock Dockview API. Test `openPanel`, `closePanel`, `serializeLayout`.
- Unit test: panel registry lookup, serialization/deserialization round-trip.
- E2E test: open panel from sidebar, verify it appears. Close panel, verify it disappears. Refresh page, verify layout persists.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 7a | Create panel type definitions + panel registry + WelcomePanel | S |
| 7b | Create DockviewHost component with Dockview integration | L |
| 7c | Create PanelTab custom renderer + DropIndicator | M |
| 7d | Implement panelStore with localStorage persistence + URL serialization | M |
| 7e | Integrate DockviewHost into WorkspaceShell + tests | M |

---

## US-108: Mode Switch

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/DockviewHost/ModeSwitch.tsx` | Create: segmented control (Editor/Builder/Workflow) | workspace |
| `packages/workspace/src/components/DockviewHost/PanelTab.tsx` | Modify: integrate ModeSwitch into tab bar | workspace |
| `packages/workspace/src/components/DockviewHost/ModePlaceholder.tsx` | Create: placeholder content for Builder and Workflow modes | workspace |
| `packages/workspace/src/types/panel.ts` | Modify: add `mode` field to panel state | workspace |

### Database changes
None.

### API/MCP surface
None.

### State management
Mode is per-panel state, stored as part of the serialized panel state. Each panel in `panelStore` has a `mode: 'editor' | 'builder' | 'workflow'` field.

### Component hierarchy
```
PanelTab
  -> panel title + ModeSwitch + close button
  
ModeSwitch
  -> SegmentedControl (Mantine)
     -> "Editor" (always visible)
     -> "Builder" (visible if ability.can('configure', 'Page'))
     -> "Workflow" (visible if ability.can('manage', 'all') AND page.ephemeralMode)
```

### Design system mapping
- Wireframe: Group A, Screen 1 -- mode switch in tab bar.
- `SegmentedControl` from Mantine (Style Guide SS 9.1). Compact size to fit in tab bar.
- Active segment: `--v-accent-primary` background.
- Builder mode accent: `--v-accent-secondary`.
- Workflow mode accent: `--v-accent-quaternary`.

### Edge cases
- AC-5: Switching modes replaces panel content instantly (no loading flash). This is a simple conditional render, not a data fetch.
- CASL check for Builder mode: if user's role changes mid-session (e.g., admin removes builder role), the mode switch should disappear on next render. The session's CASL rules are the source of truth.
- If a panel is in Builder mode and the user loses access, fall back to Editor mode.

### Testing strategy
- Component test: ModeSwitch renders correct segments based on CASL ability mock.
- Component test: switching mode updates panel content.
- Unit test: mode state serializes and deserializes correctly.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 8a | Create ModeSwitch component with CASL gating + ModePlaceholder | M |
| 8b | Integrate into PanelTab + serialize mode in panel state + tests | S |

---

## US-109: Workspace Sidebar Navigation

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/SidebarNav/SidebarNav.tsx` | Create: main sidebar component | workspace |
| `packages/workspace/src/components/SidebarNav/SidebarNav.module.css` | Create: styles for collapsed/expanded states | workspace |
| `packages/workspace/src/components/SidebarNav/SidebarSection.tsx` | Create: collapsible section (PAGES, SYSTEM, ADMIN) | workspace |
| `packages/workspace/src/components/SidebarNav/SidebarItem.tsx` | Create: individual nav item (icon + label + pin toggle) | workspace |
| `packages/workspace/src/components/SidebarNav/SidebarSearch.tsx` | Create: search input in expanded sidebar | workspace |
| `packages/workspace/src/components/SidebarNav/SidebarUserAvatar.tsx` | Create: user avatar + name + role at bottom | workspace |
| `packages/workspace/src/stores/sidebarStore.ts` | Modify: add pinnedPages, searchQuery state | workspace |
| `packages/workspace/src/components/WorkspaceShell.tsx` | Modify: replace stub with SidebarNav | workspace |
| `packages/shell/src/components/workspace/IconRail.tsx` | Remove: replaced by SidebarNav's collapsed state | shell |

### Database changes
None. Pinned pages stored in localStorage.

### API/MCP surface
None.

### State management
- `useSidebarStore` (Zustand, extends from US-106):
  ```
  {
    collapsed: boolean,
    toggle: () => void,
    pinnedPages: string[],    // page IDs
    togglePin: (pageId: string) => void,
    searchQuery: string,
    setSearchQuery: (q: string) => void,
  }
  ```
- Persisted: `collapsed` and `pinnedPages` to localStorage key `vastu-sidebar-state`.

### Component hierarchy
```
SidebarNav
  -> Logo (top)
  -> SidebarSearch (expanded only)
  -> SidebarSection "PAGES"
     -> SidebarItem (per registered page)
  -> SidebarSection "SYSTEM"
     -> SidebarItem "Settings" (href="/settings", opens in new tab)
  -> SidebarSection "ADMIN" (CASL-gated: ability.can('manage', 'all'))
     -> SidebarItem (admin pages)
  -> SidebarUserAvatar (bottom)
```

### Design system mapping
- Wireframe: Group A, Screen 3 -- Sidebar navigation (both states).
- Collapsed: 48px width, icon-only with `Tooltip` on hover. `--v-bg-secondary` background.
- Expanded: 200px width. `--v-text-sm` for nav items, `--v-text-xs` for section headers.
- Active page: `--v-accent-primary-light` background, `--v-accent-primary` text/icon.
- Transition: width change 200ms `--v-ease-default` (Style Guide SS 7.1).
- Keyboard shortcut: Cmd+B toggles (Patterns Library SS 11.4).

### Edge cases
- Click a page that is already open: focus the existing panel (don't open a duplicate).
- ADMIN section visibility: uses CASL `ability.can('manage', 'all')`. Hidden entirely for non-admins (not disabled).
- Settings link opens in a new browser tab (not a Dockview panel) since settings uses the shell layout, not workspace.
- Sidebar search filters the page list client-side (fuzzy match on page name).
- Long page names: use `TruncatedText` in expanded mode, tooltip in collapsed mode.

### Testing strategy
- Component test: renders collapsed (48px) and expanded (200px) states.
- Component test: ADMIN section hidden for non-admin ability.
- Component test: clicking a page calls `panelStore.openPanel`.
- Component test: Cmd+B toggle works.
- E2E test: toggle sidebar, verify width changes.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 9a | Create SidebarNav shell with collapsed/expanded states + CSS animations | M |
| 9b | Create SidebarSection + SidebarItem + SidebarSearch + CASL gating | M |
| 9c | Create SidebarUserAvatar + wire to panelStore + tests | M |

---

## US-110: View State Store

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/shared/src/prisma/schema.prisma` | Modify: add `Page` and `View` models | shared |
| `packages/shared/src/prisma/migrations/{timestamp}_add_pages_and_views/` | Create: Prisma migration | shared |
| `packages/shared/src/prisma/seed.ts` | Modify: add mock pages seed data | shared |
| `packages/shared/src/types/view.ts` | Create: View, ViewState, FilterNode types | shared |
| `packages/shared/src/types/page.ts` | Create: Page type definition | shared |
| `packages/shared/src/types/index.ts` | Modify: re-export new types | shared |
| `packages/workspace/src/stores/viewStore.ts` | Create: Zustand store for view state | workspace |
| `packages/workspace/src/types/view.ts` | Create: workspace-specific view types (extends shared) | workspace |
| `packages/workspace/src/types/filter.ts` | Create: FilterNode tree types (from Patterns Library SS 2.4) | workspace |
| `packages/shell/src/app/api/workspace/views/route.ts` | Create: GET (list views), POST (create view) | shell |
| `packages/shell/src/app/api/workspace/views/[id]/route.ts` | Create: GET, PATCH, DELETE individual view | shell |

### Database changes

New `Page` model:
```prisma
model Page {
  id              String   @id @default(uuid())
  name            String
  slug            String   @unique
  icon            String?
  templateType    String   @map("template_type")
  organizationId  String   @map("organization_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  views        View[]

  @@index([organizationId])
  @@map("pages")
}
```

New `View` model:
```prisma
model View {
  id         String   @id @default(uuid())
  name       String
  pageId     String   @map("page_id")
  stateJson  Json     @map("state_json")
  createdBy  String   @map("created_by")
  isShared   Boolean  @default(false) @map("is_shared")
  colorDot   String?  @map("color_dot")
  organizationId String @map("organization_id")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  deletedAt  DateTime? @map("deleted_at")

  page         Page         @relation(fields: [pageId], references: [id])
  createdByUser User        @relation(fields: [createdBy], references: [id])
  organization  Organization @relation(fields: [organizationId], references: [id])

  @@index([pageId])
  @@index([createdBy])
  @@index([organizationId])
  @@map("views")
}
```

NOTE: This adds relations to `Organization` and `User` models. The `Organization` model needs a `pages Page[]` and `views View[]` relation added. The `User` model needs a `views View[]` relation added.

### API/MCP surface
- `GET /api/workspace/views?pageId=X` -- list views for a page (user's own + shared)
- `POST /api/workspace/views` -- create a new view `{ name, pageId, stateJson, colorDot, isShared }`
- `GET /api/workspace/views/[id]` -- get a single view
- `PATCH /api/workspace/views/[id]` -- update view (name, stateJson, isShared, colorDot)
- `DELETE /api/workspace/views/[id]` -- soft-delete a view

### State management
- `useViewStore` (Zustand):
  ```
  {
    currentViewId: string | null,
    savedState: ViewState | null,       // last saved snapshot
    currentState: ViewState,            // live working state
    isModified: boolean,                // computed: currentState !== savedState
    filters: FilterNode,
    sort: SortState[],
    columns: ColumnState[],
    pagination: PaginationState,
    scrollPosition: { x: number, y: number },
    
    saveView: (name: string) => Promise<void>,
    loadView: (id: string) => Promise<void>,
    resetView: () => void,
    updateFilters: (filters: FilterNode) => void,
    updateSort: (sort: SortState[]) => void,
    updateColumns: (columns: ColumnState[]) => void,
    updatePagination: (page: number, pageSize: number) => void,
  }
  ```
- `isModified` uses deep equality comparison between `currentState` and `savedState`.

### Component hierarchy
The view store is consumed by ViewToolbar (US-111), VastuTable (US-112), and FilterSystem (US-114). It is a headless store -- no UI in this story.

### Design system mapping
- AC-9: Modified indicator uses `--v-accent-tertiary` (goldenrod) per Style Guide SS 1.2.
- FilterNode type definition follows Patterns Library SS 2.4 exactly.

### Edge cases
- View state JSON can be large (complex filters, many columns). Limit `stateJson` to reasonable size (warn at 100KB).
- Concurrent edits: if two users edit the same shared view, last-write-wins. No real-time sync in Phase 1A.
- View belongs to a deleted page: API returns 404. Store clears the view.
- `isModified` comparison: must ignore transient state (scroll position) -- only compare filters, sort, columns, pagination.

### Testing strategy
- Unit test: viewStore `saveView`, `loadView`, `resetView`, `isModified` computation.
- Unit test: FilterNode serialization/deserialization round-trip.
- Unit test: API routes CRUD operations.
- E2E test: save a view, reload page, verify view loads correctly.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 10a | Prisma schema: Page + View models, migration, seed mock pages | M |
| 10b | Shared types: View, Page, FilterNode, ViewState types | S |
| 10c | API routes: views CRUD endpoints | M |
| 10d | viewStore Zustand implementation + unit tests | L |

---

## US-111: View Toolbar

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/ViewToolbar/ViewToolbar.tsx` | Create: toolbar bar with view picker, save, share, export buttons | workspace |
| `packages/workspace/src/components/ViewToolbar/ViewToolbar.module.css` | Create: styles | workspace |
| `packages/workspace/src/components/ViewToolbar/ViewPicker.tsx` | Create: dropdown with search, sections, view list | workspace |
| `packages/workspace/src/components/ViewToolbar/ViewPickerItem.tsx` | Create: individual view entry with color dot, name, menu | workspace |
| `packages/workspace/src/components/ViewToolbar/ShareDialog.tsx` | Create: modal with shareable URL and access control | workspace |
| `packages/workspace/src/components/ViewToolbar/ExportMenu.tsx` | Create: export options dropdown (JSON, CSV, PNG) | workspace |
| `packages/workspace/src/components/ViewToolbar/ModifiedIndicator.tsx` | Create: goldenrod dot + "Modified" + "Reset" link | workspace |

### Database changes
None (views table from US-110).

### API/MCP surface
None (uses views API from US-110).

### State management
Reads from `useViewStore`. The toolbar is a pure UI layer over the store.

### Component hierarchy
```
Panel content wrapper
  -> ViewToolbar
     -> ViewPicker (dropdown)
        -> search input
        -> "MY VIEWS" section -> ViewPickerItem[]
        -> "SHARED WITH ME" section -> ViewPickerItem[]
        -> "+ Create new view" action
     -> ModifiedIndicator (conditional)
     -> Save button
     -> Save As button
     -> Share button -> ShareDialog (modal)
     -> Export button -> ExportMenu (dropdown)
     -> Overflow menu (... -> Import, Duplicate, View history, Pin, Delete)
```

### Design system mapping
- Wireframe: Group B, Screen 5 -- View toolbar states.
- View picker uses `Popover` (Mantine) with custom content.
- Color dots: 12px `ColorSwatch` (Mantine).
- Modified indicator: `--v-accent-tertiary` (goldenrod) dot + text.
- Save button: `--v-accent-primary` when modified, dimmed when clean.
- Keyboard shortcut: Cmd+S saves (Patterns Library SS 11.1).
- Toolbar position: `--v-z-sticky` z-index, `--v-bg-primary` background.

### Edge cases
- No saved views: ViewPicker shows empty state "No saved views yet. Save your current filters as a view."
- Share dialog: URL includes view ID as query param. Copy button uses `CopyButton` (Mantine).
- Export CSV: only available when a table is the active panel content. Disabled otherwise.
- Export PNG: only available for chart panels. Not applicable in Phase 1A.
- Overflow menu actions: "View history" and "Pin to dashboard" are stubs (show "Coming soon" toast).

### Testing strategy
- Component test: ViewToolbar renders all buttons.
- Component test: ViewPicker shows views grouped by ownership.
- Component test: ModifiedIndicator appears when `isModified` is true.
- Component test: Save button calls `viewStore.saveView`.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 11a | Create ViewToolbar shell + ModifiedIndicator + Save/SaveAs buttons | M |
| 11b | Create ViewPicker dropdown with sections, search, create action | M |
| 11c | Create ShareDialog + ExportMenu + overflow menu + tests | M |

---

## US-112: VastuTable

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/VastuTable/VastuTable.tsx` | Create: main table component wrapping TanStack Table | workspace |
| `packages/workspace/src/components/VastuTable/VastuTable.module.css` | Create: table styles with density variants | workspace |
| `packages/workspace/src/components/VastuTable/TableHeader.tsx` | Create: column header with sort indicators, resize handle, drag reorder | workspace |
| `packages/workspace/src/components/VastuTable/TableCell.tsx` | Create: cell renderer dispatching by display type | workspace |
| `packages/workspace/src/components/VastuTable/TableSearchBar.tsx` | Create: global search input (debounced 300ms) | workspace |
| `packages/workspace/src/components/VastuTable/TablePagination.tsx` | Create: pagination bar with page nav, rows-per-page, range display | workspace |
| `packages/workspace/src/components/VastuTable/TableBulkActionBar.tsx` | Create: batch actions bar on row selection | workspace |
| `packages/workspace/src/components/VastuTable/TableDensityToggle.tsx` | Create: compact/comfortable/spacious toggle | workspace |
| `packages/workspace/src/components/VastuTable/TableColumnPicker.tsx` | Create: column visibility checklist | workspace |
| `packages/workspace/src/components/VastuTable/TableSkeleton.tsx` | Create: skeleton loading state matching table dimensions | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/TextCell.tsx` | Create: text cell with TruncatedText | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/NumberCell.tsx` | Create | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/DateCell.tsx` | Create | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/BadgeCell.tsx` | Create | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/BooleanCell.tsx` | Create | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/LinkCell.tsx` | Create | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/MonospaceCell.tsx` | Create | workspace |
| `packages/workspace/src/components/VastuTable/cellRenderers/index.ts` | Create: cell renderer registry | workspace |
| `packages/workspace/src/components/VastuTable/types.ts` | Create: VastuTableColumn, VastuTableProps, DisplayType, etc. | workspace |
| `packages/workspace/src/hooks/useVirtualRows.ts` | Create: TanStack Virtual integration for 50+ rows | workspace |

### Database changes
None. VastuTable is a client-side component that receives data via props or TanStack Query.

### API/MCP surface
None. Table data comes from page-specific queries (Phase 1B). In Phase 1A, use mock data for testing.

### State management
Table state (filters, sort, columns, pagination, density) syncs bidirectionally with `useViewStore`:
- Table state changes -> update viewStore
- viewStore changes (e.g., load view) -> update table state

### Component hierarchy
```
VastuTable (props: columns, data, onRowClick, pageId)
  -> TableSearchBar (global search)
  -> FilterBar (from US-114, renders filter pills)
  -> TableBulkActionBar (conditional, on selection)
  -> <table>
     -> <thead>
        -> TableHeader[] (per column: sortable, resizable, draggable)
     -> <tbody> (virtualized via TanStack Virtual when rows > 50)
        -> <tr>[] 
           -> TableCell[] (dispatches to cell renderer by display type)
  -> TablePagination
  -> ViewToolbar integration point
```

### Design system mapping
- Wireframe: Group B, Screen 4 -- Table listing template.
- Patterns Library SS 1 (entire Data tables section).
- Row density: compact 24px, comfortable 32px (default), spacious 40px. Padding per Style Guide SS 3.1.
- Header: `--v-bg-secondary`, `--v-text-sm`, `--v-font-medium`.
- Cell text: `--v-text-sm`, `--v-font-regular`.
- Null values: "---" in `--v-text-tertiary` (SS 1.8).
- Sort indicators: `IconSortAscending`/`IconSortDescending` at `--v-icon-xs`.
- Selected row: `--v-accent-primary-light` background.
- Hover row: `--v-bg-tertiary`.
- Search highlight: `<mark>` with `--v-accent-primary-light` background.
- Loading: TableSkeleton with alternating-width skeleton rows (SS 6.2).

### Edge cases
- 0 rows + no filters: empty state "No data found" with context.
- 0 rows + active filters: empty state "No results match your current filters" + "Clear all filters" action.
- 1000+ rows: virtual scrolling kicks in. Only ~50 DOM rows rendered at a time.
- Column resize to 0: enforce minimum column width (50px).
- All columns hidden: prevent -- at least one column must remain visible.
- Multi-sort with Shift+click: show priority numbers (1 up-arrow, 2 down-arrow).
- Server-side pagination: table emits `onPaginationChange` callback. Actual fetch is page-template responsibility.

### Testing strategy
- Component test: renders columns and rows from mock data.
- Component test: sort click cycles through asc/desc/none.
- Component test: row selection + bulk action bar appears.
- Component test: density toggle changes row height.
- Component test: null values render as "---".
- Component test: cell renderers for each display type.
- Unit test: virtual scrolling renders only visible rows.
- E2E test: sort a column, filter, paginate, verify state persists.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 12a | VastuTable types, column definition, and TanStack Table core setup | M |
| 12b | TableHeader with sort, resize, drag-reorder | L |
| 12c | Cell renderer registry + all 8 cell renderers | M |
| 12d | TableSearchBar (debounced, highlight) + TableDensityToggle + TableColumnPicker | M |
| 12e | TablePagination + TableBulkActionBar | M |
| 12f | Virtual scrolling integration (TanStack Virtual) + TableSkeleton | M |
| 12g | View store sync (bidirectional state binding) + comprehensive tests | M |

---

## US-113: VastuContextMenu

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/VastuContextMenu/VastuContextMenu.tsx` | Create: context menu wrapper that captures `onContextMenu` | workspace |
| `packages/workspace/src/components/VastuContextMenu/VastuContextMenu.module.css` | Create: menu positioning and animation styles | workspace |
| `packages/workspace/src/components/VastuContextMenu/ContextMenuProvider.tsx` | Create: provider that manages menu state | workspace |
| `packages/workspace/src/components/VastuContextMenu/menuConfigs.ts` | Create: action configurations per target type (cell, row, header, badge) | workspace |
| `packages/workspace/src/components/VastuContextMenu/types.ts` | Create: ContextType, ContextAction types | workspace |
| `packages/workspace/src/hooks/useContextMenu.ts` | Create: hook for registering context menu on elements | workspace |

### Database changes
None.

### API/MCP surface
None. Context menu actions dispatch to existing store actions (filter, copy, open panel).

### State management
- `ContextMenuProvider` (React Context -- this is UI overlay state, not application state, so Context is appropriate here despite the Zustand rule):
  ```
  {
    isOpen: boolean,
    position: { x: number, y: number },
    contextType: 'cell' | 'row' | 'header' | 'badge',
    contextData: Record<string, unknown>,
    open: (event, type, data) => void,
    close: () => void,
  }
  ```

NOTE: Using React Context here instead of Zustand is intentional. Context menu state is transient UI state (position, open/closed) that doesn't need persistence, serialization, or cross-component sharing beyond the menu itself. This aligns with the technical constraint "Zustand for all client state" interpreted as application/domain state.

### Component hierarchy
```
ContextMenuProvider (wraps workspace)
  -> VastuContextMenu (rendered at portal root)
     -> Menu (Mantine)
        -> Menu.Item[] (from menuConfigs based on contextType)
```

Data elements annotate themselves with `data-context`, `data-context-type`, and `data-context-value` attributes.

### Design system mapping
- Patterns Library SS 5 (Right-click context menus).
- Menu structure: primary actions -> separator -> filter actions -> separator -> utility -> separator -> destructive (red).
- Menu uses `--v-bg-elevated` background, `--v-shadow-sm`.
- Keyboard shortcuts right-aligned in `--v-text-tertiary`.
- Position-aware: flips when near viewport edge (Mantine Menu handles this).
- Keyboard nav: arrow keys, Enter to select, Escape to close.

### Edge cases
- Right-click on non-data element: no menu (default browser menu).
- Multiple context menus: only one open at a time. Opening a new one closes the previous.
- "Ask agent" action: disabled in Phase 1A (grayed out with "Coming in Phase 2" tooltip).
- Clipboard access: `navigator.clipboard.writeText` may fail in insecure contexts. Fall back to `document.execCommand('copy')` with toast feedback.

### Testing strategy
- Component test: right-click on `[data-context]` element opens menu with correct items.
- Component test: menu items differ by context type (cell vs header vs row).
- Component test: keyboard navigation within menu.
- Component test: menu closes on Escape.
- Unit test: menuConfigs returns correct actions for each context type.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 13a | Create ContextMenuProvider + VastuContextMenu component + types | M |
| 13b | Create menuConfigs for cell, row, header, badge targets | M |
| 13c | Integrate with VastuTable (data attributes) + tests | M |

---

## US-114: Composable Filter System

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/FilterSystem/FilterEngine.ts` | Create: filter evaluation logic (standalone module) | workspace |
| `packages/workspace/src/components/FilterSystem/FilterBar.tsx` | Create: horizontal bar with filter pills + "+ Add filter" | workspace |
| `packages/workspace/src/components/FilterSystem/FilterBar.module.css` | Create: styles | workspace |
| `packages/workspace/src/components/FilterSystem/FilterPill.tsx` | Create: pill with column name, IER mode indicator, value, close | workspace |
| `packages/workspace/src/components/FilterSystem/FilterInput.tsx` | Create: type-adaptive filter input (dispatches by data type) | workspace |
| `packages/workspace/src/components/FilterSystem/inputs/TextFilterInput.tsx` | Create: multi-value tag input with IER mode selector | workspace |
| `packages/workspace/src/components/FilterSystem/inputs/NumberFilterInput.tsx` | Create: range slider + min/max inputs | workspace |
| `packages/workspace/src/components/FilterSystem/inputs/DateFilterInput.tsx` | Create: date range picker with presets | workspace |
| `packages/workspace/src/components/FilterSystem/inputs/EnumFilterInput.tsx` | Create: checkbox list of values with counts | workspace |
| `packages/workspace/src/components/FilterSystem/inputs/BooleanFilterInput.tsx` | Create: three-state toggle | workspace |
| `packages/workspace/src/components/FilterSystem/CompositeFilterBuilder.tsx` | Create: advanced filter builder with AND/OR groups | workspace |
| `packages/workspace/src/components/FilterSystem/DimensionPicker.tsx` | Create: column/dimension selector for "+ Add filter" | workspace |
| `packages/workspace/src/components/FilterSystem/FilterModeSelector.tsx` | Create: I/E/R dropdown selector | workspace |
| `packages/workspace/src/components/FilterSystem/types.ts` | Create: re-export FilterNode from shared, add UI-specific filter types | workspace |

### Database changes
None. FilterNode is stored as part of view state JSON.

### API/MCP surface
None. Filter system is entirely client-side. Server-side filtering is the responsibility of page-template queries.

### State management
Filter state flows through `useViewStore.filters` (a `FilterNode` tree). The FilterBar reads and writes to this store.

### Component hierarchy
```
FilterBar
  -> FilterPill[] (one per active simple filter)
     -> FilterModeSelector (I/E/R dropdown)
     -> value summary (TruncatedText)
     -> close button
  -> "+ Add filter" button -> DimensionPicker (popover)
  -> "Advanced" toggle -> CompositeFilterBuilder
     -> FilterGroup (recursive)
        -> AND/OR connector toggle
        -> FilterCondition[] or nested FilterGroup[]
        -> "+ Add condition" / "+ Add group"
```

### Design system mapping
- Wireframe: Group B, Screen 4 -- filter pills.
- Patterns Library SS 2 (entire Filters section).
- Filter pills: `--v-radius-pill`, padding per Style Guide SS 3.1 (4px 10px). Mode colors: I=`--v-accent-primary`, E=`--v-status-error`, R=`--v-accent-quaternary`.
- Composite builder: nested boxes with `--v-border-default` borders, `--v-bg-secondary` group backgrounds.
- Date presets: Today, Last 7d, Last 30d, This month, This quarter, Custom range.

### Edge cases
- Regex mode: validate regex on input. Show inline error if regex is invalid.
- Enum filter with 100+ values: add search within the checkbox list.
- Composite filter 3+ nesting levels: UI renders but shows a warning "Deeply nested filters may impact performance."
- "Convert to simple" only works when filter is flat (no OR groups). Button disabled/hidden otherwise.
- Empty filter bar: show "No filters applied" hint text.
- Filter on a column that no longer exists (schema change): show "Unknown column" pill with warning icon, allow removal.

### Testing strategy
- Unit test: FilterEngine evaluates Include, Exclude, Regex modes correctly for each data type.
- Unit test: FilterNode serialization/deserialization round-trip.
- Unit test: composite filter with nested AND/OR evaluates correctly.
- Component test: FilterBar renders pills from store state.
- Component test: FilterPill shows correct mode indicator color.
- Component test: DimensionPicker lists available columns.
- Component test: type-specific inputs render correctly.
- E2E test: add a filter, verify table updates. Remove filter, verify table restores.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 14a | FilterEngine standalone module + FilterNode types + unit tests | M |
| 14b | FilterPill + FilterModeSelector + FilterBar shell | M |
| 14c | Type-specific filter inputs (Text, Number, Date, Enum, Boolean) | L |
| 14d | DimensionPicker + "+ Add filter" flow | S |
| 14e | CompositeFilterBuilder with nested AND/OR groups + drag reorder | L |
| 14f | Integration with VastuTable + viewStore sync + E2E tests | M |

---

## US-115: Tray Bar

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/TrayBar/TrayBar.tsx` | Create: bottom bar with minimized panel pills | workspace |
| `packages/workspace/src/components/TrayBar/TrayBar.module.css` | Create: styles with 44px height, animation | workspace |
| `packages/workspace/src/components/TrayBar/TrayItem.tsx` | Create: pill with icon, title, badge, close | workspace |
| `packages/workspace/src/components/TrayBar/TrayItemPreview.tsx` | Create: hover tooltip with panel info | workspace |
| `packages/workspace/src/components/TrayBar/TrayOverflow.tsx` | Create: "+N" overflow pill with dropdown | workspace |
| `packages/workspace/src/stores/trayStore.ts` | Modify: full implementation | workspace |
| `packages/workspace/src/stores/panelStore.ts` | Modify: add minimize/restore actions | workspace |
| `packages/workspace/src/components/WorkspaceShell.tsx` | Modify: integrate TrayBar | workspace |

### Database changes
None. Tray state is part of the panel layout persisted to localStorage.

### API/MCP surface
None.

### State management
- `useTrayStore` (Zustand):
  ```
  {
    minimizedPanels: MinimizedPanel[],  // { id, title, icon, viewName, badges, previousLayout }
    minimize: (panelId: string) => void,
    restore: (panelId: string) => void,
    close: (panelId: string) => void,
  }
  ```
- Tray state is derived from `panelStore` -- minimized panels are panels with `minimized: true` flag.

### Component hierarchy
```
TrayBar
  -> TrayItem[] (per minimized panel)
     -> icon + title (TruncatedText)
     -> badge (Indicator, optional)
     -> close button (x)
     -> hover -> TrayItemPreview (HoverCard)
     -> right-click -> context menu (Restore, Restore as split, Restore as float, Close)
  -> TrayOverflow ("+N" when items exceed width)
  -> Cmd+K button (right end, links to command palette)
```

### Design system mapping
- Wireframe: Group B, Screen 6 -- Tray bar states.
- Patterns Library SS 12: Panel management.
- Tray bar: `--v-bg-secondary` background, 44px height, `--v-z-tray` z-index.
- Tray items: `--v-radius-pill`, `--v-text-sm`, `--v-bg-tertiary` background.
- Hover: `TrayItemPreview` uses `HoverCard` (Mantine) with `--v-bg-elevated` + `--v-shadow-sm`.
- Minimize animation: 180ms ease-out (Style Guide SS 7.1, Patterns Library SS 12.1).
- Restore animation: 200ms ease-out.
- Empty state: "No minimized panels" centered in `--v-text-tertiary`.

### Edge cases
- AC-7: Overflow when tray is full. Measure tray width, count items that fit, show "+N" for remainder. Click "+N" opens dropdown listing overflow items.
- Close from tray (x button): removes panel entirely, not just from tray.
- Restore to previous position: `previousLayout` stored when minimizing. If the previous position is occupied, restore as a new tab in the nearest group.
- Notification badges: panels can set badge counts via `panelStore.setBadge(panelId, count)`.

### Testing strategy
- Component test: TrayBar renders items for minimized panels.
- Component test: click item restores panel.
- Component test: overflow "+N" appears when items exceed width.
- Component test: right-click opens context menu with restore options.
- Component test: empty state shows message.
- E2E test: minimize panel, verify tray item appears. Click tray item, verify panel restores.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 15a | Create TrayBar shell + TrayItem + styles + animations | M |
| 15b | Create TrayItemPreview (HoverCard) + right-click context menu | M |
| 15c | Create TrayOverflow + empty state + Cmd+K button | S |
| 15d | Wire trayStore to panelStore minimize/restore + tests | M |

---

## US-116: Command Palette

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/components/CommandPalette/CommandPalette.tsx` | Create: Mantine Spotlight wrapper with custom rendering | workspace |
| `packages/workspace/src/components/CommandPalette/CommandPalette.module.css` | Create: styles | workspace |
| `packages/workspace/src/components/CommandPalette/PageResult.tsx` | Create: page result rendering (icon + name + template badge + row count) | workspace |
| `packages/workspace/src/components/CommandPalette/RecentResult.tsx` | Create: recent record rendering (name + key + "opened Xh ago") | workspace |
| `packages/workspace/src/components/CommandPalette/CommandResult.tsx` | Create: command rendering ("> New order" etc.) | workspace |
| `packages/workspace/src/components/CommandPalette/commandRegistry.ts` | Create: registered commands with actions | workspace |
| `packages/workspace/src/hooks/useRecentRecords.ts` | Create: hook tracking recently opened records (localStorage) | workspace |

### Database changes
None. Recent records stored in localStorage.

### API/MCP surface
None for the palette itself. Page list comes from the panel registry. Commands are client-side.

### State management
- Mantine Spotlight manages its own open/close state.
- Recent records: stored in localStorage key `vastu-recent-records` (array of { id, name, key, entityType, openedAt }, max 10).
- Command registry: static list of registered commands with actions.

### Component hierarchy
```
CommandPalette (wraps Spotlight)
  -> Search input (debounced 150ms)
  -> Section "PAGES"
     -> PageResult[] (fuzzy match on page names)
  -> Section "RECENT RECORDS"
     -> RecentResult[] (last 10 opened)
  -> Section "COMMANDS" (prefixed with ">")
     -> CommandResult[]
  -> Footer hints: arrow-keys, Enter, Tab, Esc
```

### Design system mapping
- Wireframe: Group D, Screen 20 -- Command palette.
- Patterns Library SS 11 (Keyboard navigation).
- Uses Mantine Spotlight (Style Guide SS 9.1).
- `--v-z-spotlight` z-index (70).
- `--v-shadow-md` shadow.
- Result sections: `--v-text-xs` section headers in `--v-text-tertiary`.
- Active result: `--v-accent-primary-light` background.
- Keyboard hints in footer: `Kbd` (Mantine) components.

### Edge cases
- No results for search: show "No results for 'query'" with suggestion to try different terms.
- Enter on a page result: opens (or focuses) Dockview panel.
- Tab on a page result: opens in a new Dockview panel (split).
- Commands with ">": only shown when query starts with ">". Filter commands by text after ">".
- Command "Switch theme": toggles color scheme via Mantine's `useComputedColorScheme`.
- Command "Settings": opens `/settings` in new browser tab.

### Testing strategy
- Component test: Spotlight opens on Cmd+K.
- Component test: search filters pages by name (fuzzy).
- Component test: recent records show with relative time.
- Component test: commands filtered when query starts with ">".
- Component test: keyboard navigation (arrow keys, Enter, Tab).
- E2E test: open Cmd+K, type a page name, press Enter, verify panel opens.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 16a | Create CommandPalette with Spotlight integration + PageResult rendering | M |
| 16b | Create RecentResult + CommandResult + commandRegistry | M |
| 16c | Keyboard navigation (Tab for new panel) + footer hints + tests | M |

---

## US-117: Global Keyboard Shortcuts

### Components to create or modify

| File | Action | Package |
|------|--------|---------|
| `packages/workspace/src/hooks/useKeyboardShortcuts.ts` | Create: global keyboard shortcut manager | workspace |
| `packages/workspace/src/hooks/useTableShortcuts.ts` | Create: table-specific shortcuts (j/k, o, x, etc.) | workspace |
| `packages/workspace/src/components/ShortcutsModal/ShortcutsModal.tsx` | Create: keyboard reference modal | workspace |
| `packages/workspace/src/components/ShortcutsModal/ShortcutGroup.tsx` | Create: grouped shortcuts display | workspace |
| `packages/workspace/src/components/WorkspaceShell.tsx` | Modify: register global shortcuts at layout level | workspace |

### Database changes
None.

### API/MCP surface
None.

### State management
None. Shortcuts are event handlers registered at the layout level. The `?` shortcut toggles a modal (local React state).

### Component hierarchy
```
WorkspaceShell
  -> useKeyboardShortcuts() (registered once at layout)
     -> Cmd+K: open command palette
     -> ?: open ShortcutsModal
     -> Cmd+S: save view
     -> Cmd+Z: undo (stub)
     -> Cmd+/: focus search
     -> Cmd+B: toggle sidebar
     -> Esc: close topmost overlay

VastuTable (when focused)
  -> useTableShortcuts()
     -> j/down: next row
     -> k/up: prev row
     -> o/Enter: open drawer
     -> x: toggle checkbox
     -> /: focus column search
     -> [/]: prev/next page
```

### Design system mapping
- Wireframe: Group F -- Keyboard shortcuts reference.
- Patterns Library SS 11 (entire Keyboard navigation section).
- ShortcutsModal: `Modal` (Mantine) with grouped sections. Shortcut keys displayed with `Kbd` component.
- Focus management: Tab order follows visual layout (sidebar -> tab bar -> toolbar -> content -> tray). `--v-shadow-focus` on `:focus-visible` only.

### Edge cases
- AC-5: Shortcuts don't fire when user is typing in an input/textarea. Check `document.activeElement` tag name and `contentEditable` state.
- Esc priority: close the topmost overlay (modal > drawer > spotlight > filter popover). Use a stack of closeable overlays.
- Cmd+S: prevent browser's "Save page" behavior with `event.preventDefault()`.
- Table shortcuts (j/k/o/x): only active when a table panel is focused. Check which panel has focus.
- OS detection: show "Cmd" on Mac, "Ctrl" on Windows/Linux in the shortcuts modal.

### Testing strategy
- Unit test: shortcut handler fires correct action for each key combo.
- Unit test: shortcuts suppressed when activeElement is an input.
- Component test: ShortcutsModal renders all shortcut groups.
- Component test: `?` key opens the modal.
- E2E test: press Cmd+K, verify command palette opens. Press Cmd+B, verify sidebar toggles.

### Subtasks and complexity

| # | Subtask | Est |
|---|---------|-----|
| 17a | Create useKeyboardShortcuts hook with global registrations | M |
| 17b | Create useTableShortcuts hook for table-specific shortcuts | S |
| 17c | Create ShortcutsModal with grouped display + OS detection | M |
| 17d | Focus management (tab order, focus rings, overlay stack) + tests | M |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Dockview API complexity** -- underdocumented, may not support all our needs (custom tabs, minimize, URL serialization) | Medium | High | Spike US-107 first. Build a minimal prototype before committing to architecture. Dockview has been in production use (Azure Data Studio) so most features exist, but API surface is large. |
| **VastuTable scope creep** -- US-112 is the largest story with 16 ACs | High | Medium | Break into 7 subtasks. Ship core rendering first (12a-12c), interaction features second (12d-12f), integration last (12g). Each subtask independently testable. |
| **Composite filter builder** (US-114 AC-6) is complex -- nested drag-and-drop with arbitrary depth | Medium | Medium | Start with simple pills (14a-14b). Composite builder is a separate subtask (14e) that can be deferred if needed without blocking other stories. |
| **i18n migration** breaks existing pages | Low | High | US-101 must be the first story merged. Run full E2E suite after migration. The `t('key')` signature is preserved. |
| **Package boundary confusion** -- workspace code needs to import shell shared components | Medium | Medium | Resolved by Option A (workspace imports from shell via path alias). Document this pattern clearly. |
| **next-intl middleware conflict** -- combining i18n middleware with auth middleware | Medium | Medium | next-intl supports middleware composition. Test carefully that auth redirects still work after i18n integration. |
| **Dockview + Mantine styling conflicts** -- Dockview brings its own CSS | Medium | Low | Override Dockview CSS classes with `--v-*` tokens in DockviewHost.module.css. Scope overrides to workspace only. |
| **Performance -- VastuTable with 1000+ rows** | Low | High | TanStack Virtual handles this well. But test with 5000 rows to be safe. Performance budget: first paint <500ms, scroll at 60fps. |

---

## Architecture Decision Records

### ADR-001: Workspace as Route Segment (not standalone app)

**Status:** Proposed

**Context:** The workspace package could be a standalone Next.js app (separate build, separate deployment) or a route segment within the shell app. The requirements say "workspace package is entirely client-rendered."

**Decision:** Workspace remains a route segment under `packages/shell/src/app/workspace/`. The workspace package (`packages/workspace/`) exports client components that are imported by the shell's route files. The shell provides the Next.js runtime, auth middleware, API routes, and MantineProvider. The workspace provides the client-heavy UI.

**Rationale:**
- Single deployment target (one Next.js app)
- Auth middleware and API routes are shared naturally
- MantineProvider and theme are inherited from root layout
- No CORS or cross-origin issues for API calls
- The `"use client"` boundary at the workspace layout level gives us full client-side rendering where needed

**Consequences:**
- Workspace components can import shell shared components (TruncatedText, EmptyState)
- API routes for workspace features (views CRUD) live in `packages/shell/src/app/api/workspace/`
- Build times increase as workspace grows (mitigated by Turbo caching)

### ADR-002: Context API for Transient UI State

**Status:** Proposed

**Context:** The requirements say "Zustand for all client state." However, the context menu (US-113) has transient UI state (position x/y, open/closed, which element was clicked) that is:
1. Not serializable
2. Not persistent
3. Not shared across components beyond the menu and its trigger
4. Resets every time the menu closes

**Decision:** Use React Context for VastuContextMenu state. Use Zustand for all domain/application state (panel state, view state, sidebar state, tray state).

**Rationale:**
- Context menu state is ephemeral UI state, not application state
- Zustand stores are serializable and persistent -- context menu state is neither
- Mantine's own Menu/Spotlight components use React state internally
- This distinction (Zustand for domain state, React for transient UI) is a clear pattern

**Consequences:**
- Document this pattern for future workspace components: if state is transient UI-only, React Context/state is acceptable
- All persistent, serializable, cross-component state must use Zustand

---

## Summary: Total Subtasks

| Story | Subtasks | Total Est Lines |
|-------|----------|----------------|
| US-101 | 3 | S+M+M = ~500 |
| US-102 | 3 | S+M+M = ~500 |
| US-103 | 2 | S+S = ~150 |
| US-104 | 1 | M = ~200 |
| US-105 | 2 | M+M = ~400 |
| US-106 | 4 | M+S+M+S = ~500 |
| US-107 | 5 | S+L+M+M+M = ~900 |
| US-108 | 2 | M+S = ~300 |
| US-109 | 3 | M+M+M = ~600 |
| US-110 | 4 | M+S+M+L = ~700 |
| US-111 | 3 | M+M+M = ~600 |
| US-112 | 7 | M+L+M+M+M+M+M = ~1500 |
| US-113 | 3 | M+M+M = ~600 |
| US-114 | 6 | M+M+L+S+L+M = ~1200 |
| US-115 | 4 | M+M+S+M = ~600 |
| US-116 | 3 | M+M+M = ~600 |
| US-117 | 4 | M+S+M+M = ~600 |
| **Total** | **59 subtasks** | **~9,450 lines** |

---
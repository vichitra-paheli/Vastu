# packages/workspace

Client-heavy workspace surface: Dockview panels, page templates, view engine, tray bar, command palette.

> **Phase 0 status: STUB.** This package contains only a placeholder page at `/workspace`.
> Full implementation begins in Phase 1. The content below describes the target architecture
> so that agents understand the intent when referenced from other packages.

## Stack (Phase 1+)
- React 18 (client components — this package is entirely client-rendered)
- Mantine v7 (UI components, themed via vastuTheme)
- Dockview (window management — tabs, splits, floating panels, minimize to tray)
- Zustand (state management — view state, panel state, UI state)
- TanStack Table (data tables with virtual scrolling)
- TanStack Query (server data fetching + caching)
- Recharts (charts and data visualization)
- React Flow / @xyflow/react (workflow canvas in workflow mode)

## Key patterns (Phase 1+)
- All state management via Zustand stores in `/stores/`.
- Server data via TanStack Query hooks in `/hooks/queries/`.
- Dockview panels registered in `/panels/registry.ts`.
- Every page template in `/templates/` exports a React component + a builder config schema.
- Right-click context menus use `VastuContextMenu` — never `onContextMenu` directly.
- All table implementations use `VastuTable` wrapper — never raw TanStack Table.
- All charts use `VastuChart` wrapper — never raw Recharts.

## Testing (Phase 1+)
```
pnpm --filter workspace test     # unit + component tests
```
- Component tests use `@testing-library/react` with Mantine + Zustand provider wrapper.
- Mock Dockview API with the test helper in `/test-utils/mock-dockview.ts`.

## Phase 0: what exists now
- `src/app/workspace/page.tsx` — placeholder page with empty state message
- `src/components/WorkspacePlaceholder.tsx` — shows "Workspace coming in Phase 1"
- Collapsed sidebar stub: icon rail (48px) with Vastu logo + Settings link

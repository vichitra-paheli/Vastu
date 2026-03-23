# Phase 2A: Extension Points + F1 Demo -- Todo

> Created: 2026-03-23
> Status: COMPLETE
> Total: 18 features + 1 bonus (US-213), 48 subtasks
> User stories: US-200 through US-212 (framework), US-220 through US-224 (F1 demo)
> Prerequisite: Phase 1B complete, old Phase 2A code reverted (branch `revert/phase-2a-old-plan`)

---

## Feature Dependency Graph

```
Wave 1 (Week 17 -- scaffold, data query, tech debt):
  US-200  Application scaffold          [#386]  INDEPENDENT
  US-201  Prisma schema composition     [#375]  DEPENDS ON: US-200
  US-202  Data query API                [#376]  INDEPENDENT
  US-210  Chart keyboard accessibility  [#379]  INDEPENDENT (tech debt, reverted)
  US-211  Workspace E2E in CI           [#380]  INDEPENDENT (infra, reverted)

Wave 2 (Week 18 -- aggregate, introspection, formatters, pages):
  US-203  Data aggregate API            [#381]  DEPENDS ON: US-202 merged to main
  US-204  Schema introspection API      [#382]  DEPENDS ON: US-202 merged to main
  US-205  Custom cell formatter registry[#377]  INDEPENDENT (can start with W2 or earlier)
  US-206  Application page registration [#378]  INDEPENDENT (can start with W2 or earlier)

Wave 3 (Week 19 -- SSE, CASL, cross-page nav, docs):
  US-207  Server-Sent Events infra      [#383]  INDEPENDENT (can start with W2 or earlier)
  US-208  CASL query scoping middleware  [#384]  DEPENDS ON: US-202 merged to main
  US-209  Cross-page navigation system  [#385]  DEPENDS ON: US-206 merged to main
  US-212  Framework extension docs       [#387]  DEPENDS ON: US-201..US-208 merged (collects all guides)

Wave 4 (Week 20 -- F1 schema, seed, formatters):
  US-220  F1 database schema            [#388]  DEPENDS ON: US-200, US-201 merged to main
  US-221  F1 seed data                  [#389]  DEPENDS ON: US-220 merged to main
  US-222  F1 display formatters         [#390]  DEPENDS ON: US-205 merged to main

Wave 5 (Week 21 -- F1 pages, F1 docs):
  US-223  F1 demo pages                 [#391]  DEPENDS ON: US-202..US-209, US-220..US-222 merged
  US-224  F1 demo documentation         [#392]  DEPENDS ON: US-223 merged to main

Dependency flow (critical path marked with *):

  US-200* --> US-201* --> US-220* --> US-221* --\
                                                 \
  US-202* --> US-203  --> US-223* --> US-224*      |
         \-> US-204  /      ^                     |
         \-> US-208 /       |                     |
                            +-- US-221 -----------/
  US-205  --> US-222 ------/
  US-206  --> US-209 -----/
  US-207  ---------------/

  US-210  (independent, no downstream)
  US-211  (independent, no downstream)
  US-212  (depends on most framework stories, no downstream)
```

**Critical path:** US-200 -> US-201 -> US-220 -> US-221 -> US-223 -> US-224

**Maximum parallelism plan:**
1. Start Wave 1: US-200+US-201 (sequential pair), US-202, US-210, US-211 (all parallel tracks)
2. After US-202 merges: start US-203, US-204, US-208 in parallel; US-205 and US-206 can start anytime
3. After US-206 merges: start US-209; after US-207 (anytime): proceed
4. After US-200+US-201 merge: start US-220, then US-221; after US-205: start US-222
5. After all framework + F1 data stories merge: start US-223
6. After US-223 merges: start US-224; US-212 can finalize after all framework stories

---

## Features and Tasks

### VASTU-2A-200: Application scaffold system [WAVE 1 - INDEPENDENT] -- #386
Branch: `feature/VASTU-2A-200-app-scaffold`
Package: root (scripts) | Agent: dev-engineer | Est: ~280 lines

- [x] VASTU-2A-200a: Scaffold CLI script and templates (root, M) [no deps] -- dev-engineer
  - Files: `scripts/vastu-init.ts`, `scripts/templates/app/*.tmpl` (package.json, next.config.mjs, tsconfig.json, prisma/schema.prisma, prisma/seed.ts, src/pages.ts, src/formatters.ts, README.md, src/app/layout.tsx, src/app/page.tsx, src/app/workspace/page.tsx)
  - AC: 1, 2, 4, 5
- [x] VASTU-2A-200b: Monorepo workspace integration (root, S) [deps: 200a] -- dev-engineer
  - Files: `pnpm-workspace.yaml`, root `package.json`
  - AC: 3, 4

---

### VASTU-2A-201: Prisma schema composition [WAVE 1 - DEPENDS ON: US-200] -- #375
Branch: `feature/VASTU-2A-201-prisma-composition`
Package: shared | Agent: dev-engineer | Est: ~250 lines

- [x] VASTU-2A-201a: Extract base schema template (shared, S) [no deps] -- dev-engineer
  - Files: `packages/shared/prisma/base-schema.prisma`
  - AC: 1, 2
- [x] VASTU-2A-201b: Base seed extraction and per-app seed composition (shared, M) [deps: 201a] -- dev-engineer
  - Files: `packages/shared/src/prisma/baseSeed.ts`, `packages/shared/src/prisma/seed.ts`, `packages/shared/src/prisma/index.ts`, root `package.json`
  - AC: 3, 4, 5
- [x] VASTU-2A-201c: Documentation -- "Extending the schema" guide (docs, S) [deps: 201a, 201b] -- docs-engineer
  - Files: `packages/docs/content/docs/extensions/extending-schema.mdx`, `packages/docs/content/docs/extensions/meta.json`
  - AC: 6

---

### VASTU-2A-202: Data query API [WAVE 1 - INDEPENDENT] -- #376
Branch: `feature/VASTU-2A-202-data-query-api`
Package: shared, shell | Agent: dev-engineer | Est: ~750 lines

- [x] VASTU-2A-202a: Move FilterNode types to shared (shared + workspace, S) [no deps] -- dev-engineer
  - Files: `packages/shared/src/data-engine/filterTypes.ts`, `packages/workspace/src/components/FilterSystem/types.ts` (re-export shim), `packages/shared/src/data-engine/index.ts`
  - PREREQUISITE for all data-engine work
- [x] VASTU-2A-202b: FilterNode-to-Prisma where translator (shared, M) [deps: 202a] -- dev-engineer
  - Files: `packages/shared/src/data-engine/filterTranslator.ts`, `packages/shared/src/data-engine/__tests__/filterTranslator.test.ts`
  - AC: 2 (15+ test cases for all modes)
- [x] VASTU-2A-202c: Sort translator and global search translator (shared, S) [deps: 202a] -- dev-engineer
  - Files: `packages/shared/src/data-engine/sortTranslator.ts`, `packages/shared/src/data-engine/searchTranslator.ts`, `packages/shared/src/data-engine/__tests__/sortTranslator.test.ts`
  - AC: 3, 5
- [x] VASTU-2A-202d: Data engine types and response shape (shared, S) [no deps, parallel with 202a] -- dev-engineer
  - Files: `packages/shared/src/data-engine/types.ts`
  - AC: 6, 7
- [x] VASTU-2A-202e: Data query API route (shell, L) [deps: 202b, 202c, 202d] -- dev-engineer
  - Files: `packages/shell/src/app/api/workspace/data/query/route.ts`, `packages/shared/src/index.ts`
  - AC: 1, 4, 6, 7, 8, 9, 10

---

### VASTU-2A-203: Data aggregate API [WAVE 2 - DEPENDS ON: US-202] -- #381
Branch: `feature/VASTU-2A-203-data-aggregate-api`
Package: shared, shell | Agent: dev-engineer | Est: ~550 lines

- [x] VASTU-2A-203a: Aggregate builder utility and time bucket helper (shared, L) [no deps] -- dev-engineer
  - Files: `packages/shared/src/data-engine/aggregateBuilder.ts`, `packages/shared/src/data-engine/timeBucket.ts`, `packages/shared/src/data-engine/__tests__/aggregateBuilder.test.ts`
  - AC: 2, 3, 4, 5
- [x] VASTU-2A-203b: Aggregate API route (shell, M) [deps: 203a] -- dev-engineer
  - Files: `packages/shell/src/app/api/workspace/data/aggregate/route.ts`
  - AC: 1, 6

---

### VASTU-2A-204: Schema introspection API [WAVE 2 - DEPENDS ON: US-202] -- #382
Branch: `feature/VASTU-2A-204-schema-introspection`
Package: shared, shell | Agent: dev-engineer | Est: ~230 lines

- [x] VASTU-2A-204a: Schema introspector utility (shared, M) [no deps] -- dev-engineer
  - Files: `packages/shared/src/data-engine/schemaIntrospector.ts`
  - AC: 1, 2, 3
- [x] VASTU-2A-204b: Schema introspection API route (shell, S) [deps: 204a] -- dev-engineer
  - Files: `packages/shell/src/app/api/workspace/data/schema/route.ts`
  - AC: 1, 4

---

### VASTU-2A-205: Custom cell formatter registry [WAVE 2 - INDEPENDENT] -- #377
Branch: `feature/VASTU-2A-205-formatter-registry`
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~490 lines

- [x] VASTU-2A-205a: FormatterRegistry class and types (workspace, S) [no deps] -- dev-engineer
  - Files: `packages/workspace/src/formatters/types.ts`, `packages/workspace/src/formatters/registry.ts`, `packages/workspace/src/formatters/index.ts`
  - AC: 1
- [x] VASTU-2A-205b: Built-in formatter pre-registration (workspace, M) [deps: 205a] -- dev-engineer
  - Files: `packages/workspace/src/formatters/builtins.ts`
  - AC: 4
- [x] VASTU-2A-205c: VastuTable and VastuChart integration (workspace, M) [deps: 205a, 205b] -- design-engineer
  - Files: `packages/workspace/src/components/VastuTable/types.ts`, `packages/workspace/src/components/VastuTable/VastuTableCell.tsx`, `packages/workspace/src/components/VastuChart/ChartTooltip.tsx`, `packages/workspace/src/components/BuilderPanel/sections/FieldConfigSection.tsx`, `packages/workspace/src/index.ts`
  - AC: 2, 3, 6
- [x] VASTU-2A-205d: Documentation -- "Custom formatters" guide (docs, S) [deps: 205a, 205b] -- docs-engineer
  - Files: `packages/docs/content/docs/extensions/custom-formatters.mdx`
  - AC: 7

---

### VASTU-2A-206: Application page registration [WAVE 2 - INDEPENDENT] -- #378
Branch: `feature/VASTU-2A-206-page-registration`
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~380 lines

- [x] VASTU-2A-206a: PageRegistry class (workspace, M) [no deps] -- dev-engineer
  - Files: `packages/workspace/src/pages/types.ts`, `packages/workspace/src/pages/registry.ts`, `packages/workspace/src/pages/index.ts`, `packages/workspace/src/index.ts`
  - AC: 1, 2
- [x] VASTU-2A-206b: Sidebar integration -- merge static and dynamic pages (workspace, M) [deps: 206a] -- design-engineer
  - Files: `packages/workspace/src/components/SidebarNav/SidebarNav.tsx`, DELETE `packages/workspace/src/components/SidebarNav/mockPages.ts`, `packages/workspace/src/hooks/useCommandPaletteActions.ts`
  - AC: 3, 4, 5, 6
- [x] VASTU-2A-206c: Documentation -- "Registering pages" guide (docs, S) [deps: 206a] -- docs-engineer
  - Files: `packages/docs/content/docs/extensions/registering-pages.mdx`
  - AC: 7

---

### VASTU-2A-207: Server-Sent Events infrastructure [WAVE 3 - INDEPENDENT] -- #383
Branch: `feature/VASTU-2A-207-sse-infrastructure`
Package: shared, shell, workspace | Agent: dev-engineer + design-engineer | Est: ~590 lines

- [x] VASTU-2A-207a: Event types and in-process event bus (shared, S) [no deps] -- dev-engineer
  - Files: `packages/shared/src/data-engine/eventTypes.ts`, `packages/shared/src/data-engine/events.ts`
  - AC: 2, 3
- [x] VASTU-2A-207b: SSE endpoint (shell, M) [deps: 207a] -- dev-engineer
  - Files: `packages/shell/src/app/api/workspace/events/route.ts`
  - AC: 1, 4, 11
- [x] VASTU-2A-207c: Client-side SSE hook with auto-reconnect (workspace, M) [deps: 207a] -- dev-engineer
  - Files: `packages/workspace/src/hooks/useWorkspaceEvents.ts`, `packages/workspace/src/index.ts`
  - AC: 5, 9
- [x] VASTU-2A-207d: SSE status indicator in tray bar (workspace, S) [deps: 207c] -- design-engineer
  - Files: `packages/workspace/src/components/SSEStatusIndicator/SSEStatusIndicator.tsx`, `packages/workspace/src/components/SSEStatusIndicator/SSEStatusIndicator.module.css`, `packages/workspace/src/components/SSEStatusIndicator/index.ts`, `packages/workspace/src/components/TrayBar/index.ts`
  - AC: 10
- [x] VASTU-2A-207e: TanStack Query cache invalidation on SSE events (workspace, S) [deps: 207c] -- dev-engineer
  - Files: `packages/workspace/src/hooks/useEventInvalidation.ts`, `packages/workspace/src/providers/WorkspaceProviders.tsx`
  - AC: 6, 7, 8

---

### VASTU-2A-208: CASL query scoping middleware [WAVE 3 - DEPENDS ON: US-202] -- #384
Branch: `feature/VASTU-2A-208-casl-scoping`
Package: shared, shell | Agent: dev-engineer | Est: ~470 lines

- [x] VASTU-2A-208a: scopeQuery function with exhaustive tests (shared, M) [no deps] -- dev-engineer
  - Files: `packages/shared/src/data-engine/caslScope.ts`, `packages/shared/src/data-engine/__tests__/caslScope.test.ts`
  - AC: 1, 4, 5, 7, 8
  - Integrates into: `packages/shell/src/app/api/workspace/data/query/route.ts` (AC-2), `packages/shell/src/app/api/workspace/data/aggregate/route.ts` (AC-3)
- [x] VASTU-2A-208b: Documentation -- "Permissions and scoping" guide (docs, S) [deps: 208a] -- docs-engineer
  - Files: `packages/docs/content/docs/extensions/permissions-scoping.mdx`
  - AC: 6, 9

---

### VASTU-2A-209: Cross-page navigation system [WAVE 3 - DEPENDS ON: US-206] -- #385
Branch: `feature/VASTU-2A-209-cross-page-nav`
Package: workspace | Agent: dev-engineer + design-engineer | Est: ~300 lines

- [x] VASTU-2A-209a: NavigateTo column config and LinkCell renderer (workspace, M) [no deps] -- design-engineer
  - Files: `packages/workspace/src/components/VastuTable/types.ts`, `packages/workspace/src/components/VastuTable/LinkCell.tsx`, `packages/workspace/src/components/VastuTable/VastuTableCell.tsx`, `packages/workspace/src/stores/panelStore.ts`
  - AC: 1, 2, 3, 5, 6, 7
- [x] VASTU-2A-209b: Breadcrumb back-link in target panel (workspace, S) [deps: 209a] -- design-engineer
  - Files: `packages/workspace/src/components/DockviewHost/PanelBreadcrumb.tsx`, `packages/workspace/src/stores/panelStore.ts`, `packages/workspace/src/components/DockviewHost/PanelTab.tsx`
  - AC: 4

---

### VASTU-2A-210: Chart keyboard accessibility [WAVE 1 - INDEPENDENT] -- #379
Branch: `feature/VASTU-2A-210-chart-keyboard`
Package: workspace | Agent: design-engineer | Est: ~400 lines
Note: Previously implemented and merged, then reverted. Redo from scratch.

- [x] VASTU-2A-210a: Chart keyboard navigation hook (workspace, M) [no deps] -- design-engineer
  - Files: `packages/workspace/src/components/VastuChart/useChartKeyboard.ts`
  - AC: 1, 2, 3, 4
- [x] VASTU-2A-210b: VastuChart integration and "View as table" toggle (workspace, M) [deps: 210a] -- design-engineer
  - Files: `packages/workspace/src/components/VastuChart/VastuChart.tsx`, `packages/workspace/src/components/VastuChart/ChartRenderer.tsx`, `packages/workspace/src/components/VastuChart/ChartDataTable.tsx`
  - AC: 5, 6, 7

---

### VASTU-2A-211: Workspace E2E in CI [WAVE 1 - INDEPENDENT] -- #380
Branch: `feature/VASTU-2A-211-workspace-e2e-ci`
Package: root (.github) | Agent: devops-engineer | Est: ~150 lines
Note: Previously implemented and merged, then reverted. Redo from scratch.

- [x] VASTU-2A-211a: CI workflow file (.github, M) [no deps] -- devops-engineer
  - Files: `.github/workflows/ci-workspace-e2e.yml`
  - AC: 1, 2, 3, 4, 5, 6

---

### VASTU-2A-212: Framework extension documentation [WAVE 3 - DEPENDS ON: US-201..US-208] -- #387
Branch: `feature/VASTU-2A-212-framework-docs`
Package: docs | Agent: docs-engineer | Est: ~830 lines
Note: Individual guides created as subtasks of their parent features (201c, 205d, 206c, 208b). This feature covers the remaining guides, API reference, architecture, and ADRs.

- [x] VASTU-2A-212a: Extension guides -- getting-started, data-engine, live-updates (docs, L) [deps: all framework features substantially complete] -- docs-engineer
  - Files: `packages/docs/content/docs/extensions/getting-started.mdx`, `packages/docs/content/docs/extensions/data-engine.mdx`, `packages/docs/content/docs/extensions/live-updates.mdx`, `packages/docs/content/docs/extensions/meta.json`
  - AC: 1, 5, 7
- [x] VASTU-2A-212b: API reference page (docs, M) [deps: 212a] -- docs-engineer
  - Files: `packages/docs/content/docs/extensions/api-reference.mdx`
  - AC: 8
- [x] VASTU-2A-212c: Architecture diagram (docs, S) [no deps] -- docs-engineer
  - Files: `packages/docs/content/docs/extensions/architecture.mdx`
  - AC: 9
- [x] VASTU-2A-212d: Architecture Decision Records (docs, M) [no deps, parallel with 212a] -- docs-engineer
  - Files: `packages/docs/content/docs/decisions/adr-013-framework-app-separation.mdx`, `packages/docs/content/docs/decisions/adr-014-prisma-composition.mdx`, `packages/docs/content/docs/decisions/adr-015-formatter-registry.mdx`, `packages/docs/content/docs/decisions/meta.json`
  - AC: 10

---

### VASTU-2A-220: F1 database schema [WAVE 4 - DEPENDS ON: US-200, US-201] -- #388
Branch: `feature/VASTU-2A-220-f1-schema`
Package: demo-f1 | Agent: dev-engineer | Est: ~480 lines

- [x] VASTU-2A-220a: F1 app scaffold via vastu:init (demo-f1, S) [no deps] -- dev-engineer
  - Files: `apps/demo-f1/package.json`, `apps/demo-f1/next.config.mjs`, `apps/demo-f1/tsconfig.json`, `apps/demo-f1/src/app/layout.tsx`, `apps/demo-f1/src/app/page.tsx`, `apps/demo-f1/src/app/workspace/page.tsx`, `apps/demo-f1/src/pages.ts`, `apps/demo-f1/src/formatters.ts`
  - AC: (scaffold generated by US-200)
- [x] VASTU-2A-220b: F1 Prisma schema -- 9 enums, 14 domain models (demo-f1, L) [deps: 220a] -- dev-engineer
  - Files: `apps/demo-f1/prisma/schema.prisma`
  - AC: 1, 2, 3, 4, 5

---

### VASTU-2A-221: F1 seed data [WAVE 4 - DEPENDS ON: US-220] -- #389
Branch: `feature/VASTU-2A-221-f1-seed-data`
Package: demo-f1 | Agent: dev-engineer | Est: ~1200 lines

- [x] VASTU-2A-221a: PRNG and reference data (demo-f1, M) [no deps] -- dev-engineer
  - Files: `apps/demo-f1/prisma/seed/prng.ts`, `apps/demo-f1/prisma/seed/names.ts`, `apps/demo-f1/prisma/seed/circuits.ts`, `apps/demo-f1/prisma/seed/distributions.ts`
  - AC: 1, 6
- [x] VASTU-2A-221b: Season and race generation (demo-f1, L) [deps: 221a] -- dev-engineer
  - Files: `apps/demo-f1/prisma/seed/generateSeasons.ts`, `apps/demo-f1/prisma/seed/generateRaces.ts`, `apps/demo-f1/prisma/seed/generateResults.ts`
  - AC: 2, 3
- [x] VASTU-2A-221c: Lap times, pit stops, and events generation (demo-f1, L) [deps: 221a] -- dev-engineer
  - Files: `apps/demo-f1/prisma/seed/generateLapTimes.ts`, `apps/demo-f1/prisma/seed/generatePitStops.ts`, `apps/demo-f1/prisma/seed/generateEvents.ts`
  - AC: 2, 3
- [x] VASTU-2A-221d: Seed entry point and orchestration (demo-f1, M) [deps: 221b, 221c] -- dev-engineer
  - Files: `apps/demo-f1/prisma/seed.ts`, root `package.json`
  - AC: 4, 5

---

### VASTU-2A-222: F1 display formatters [WAVE 4 - DEPENDS ON: US-205] -- #390
Branch: `feature/VASTU-2A-222-f1-formatters`
Package: demo-f1 | Agent: dev-engineer | Est: ~300 lines

- [x] VASTU-2A-222a: F1 formatter implementations -- 8 custom formatters with tests (demo-f1, M) [no deps] -- dev-engineer
  - Files: `apps/demo-f1/src/formatters.ts`, `apps/demo-f1/src/__tests__/formatters.test.ts`
  - AC: 1, 2, 3, 4

---

### VASTU-2A-223: F1 demo pages [WAVE 5 - DEPENDS ON: US-202..US-209, US-220..US-222] -- #391
Branch: `feature/VASTU-2A-223-f1-demo-pages`
Package: demo-f1 | Agent: dev-engineer | Est: ~580 lines

- [x] VASTU-2A-223a: Page registration configuration -- 9 pages via PageRegistry (demo-f1, L) [no deps] -- dev-engineer
  - Files: `apps/demo-f1/src/pages.ts`
  - AC: 1, 2, 3, 4
- [x] VASTU-2A-223b: App startup wiring (demo-f1, S) [deps: 223a] -- dev-engineer
  - Files: `apps/demo-f1/src/app/workspace/page.tsx`
  - AC: 4
- [x] VASTU-2A-223c: F1 demo E2E smoke tests (demo-f1, M) [deps: 223a, 223b] -- dev-engineer
  - Files: `apps/demo-f1/e2e/smoke.spec.ts`
  - Tests: sidebar shows 9 pages, Races table loads, pagination, cross-page navigation, Championship dashboard renders

---

### VASTU-2A-224: F1 demo documentation [WAVE 5 - DEPENDS ON: US-223] -- #392
Branch: `feature/VASTU-2A-224-f1-demo-docs`
Package: demo-f1, docs | Agent: docs-engineer | Est: ~350 lines

- [x] VASTU-2A-224a: README and inline comments (demo-f1, M) [no deps] -- docs-engineer
  - Files: `apps/demo-f1/README.md`, inline comments in `apps/demo-f1/src/pages.ts`, `apps/demo-f1/src/formatters.ts`, `apps/demo-f1/prisma/seed.ts`
  - AC: 1, 2
- [x] VASTU-2A-224b: Fumadocs demo pages -- walkthrough and building-your-own (docs, M) [deps: 224a] -- docs-engineer
  - Files: `packages/docs/content/docs/demo/demo-walkthrough.mdx`, `packages/docs/content/docs/demo/building-your-own.mdx`, `packages/docs/content/docs/demo/meta.json`, `packages/docs/content/docs/meta.json`
  - AC: 3, 4

---

## Summary

| Metric | Value |
|--------|-------|
| Total features | 18 (US-200..US-212, US-220..US-224) |
| Total subtasks | 47 |
| Independent features (can start immediately) | 6 (US-200, US-202, US-205, US-206, US-207, US-210, US-211) |
| Part 1 framework features | 13 (US-200..US-212) |
| Part 2 F1 demo features | 5 (US-220..US-224) |
| Size breakdown | S: 15, M: 22, L: 10 |
| Estimated total lines | ~8,580 |
| Critical path length | 6 stories (US-200 -> US-201 -> US-220 -> US-221 -> US-223 -> US-224) |
| Implementation waves | 5 (Weeks 17-21) |
| Agent breakdown | dev-engineer: 33 tasks, design-engineer: 7 tasks, devops-engineer: 1 task, docs-engineer: 6 tasks |

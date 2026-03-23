# Phase 2A: Extension Points + F1 Demo -- Completion Report

> Completed: 2026-03-23 | Duration: Weeks 17-21 (5 weeks)
> Predecessor: Phase 1B (Page Templates + Builder Mode)

## Summary

Phase 2A delivered the complete framework extension point system and a fully functional F1 demo application that validates the framework through real-world usage. Starting from the Phase 1B workspace (6 page templates, builder mode, dashboard, charting), this phase built the data engine (query, aggregate, schema introspection), application scaffold CLI, Prisma schema composition, formatter and page registries, Server-Sent Events infrastructure, CASL query scoping, cross-page navigation, chart keyboard accessibility, workspace E2E CI, and comprehensive documentation. The F1 demo application consumes only public framework extension points, proving that `rm -rf apps/demo-f1/` leaves the framework fully functional.

All 18 planned user stories (US-200 through US-212, US-220 through US-224) plus 1 bonus story (US-213: core framework API docs) were delivered across 5 waves, with 48 subtasks completed. An early-phase revert-and-restore cycle (PRs #393-#401) realigned the codebase after plan restructuring; the final implementation proceeded cleanly from Wave 1 through Wave 5.

**Key metrics:**

| Metric | Count |
|--------|-------|
| User stories delivered | 19/18 (18 planned + 1 bonus) |
| Subtasks completed | 48 |
| Merged PRs | 25 |
| Files changed | 124 |
| Lines added | ~21,465 |
| Lines removed | ~1,734 |
| Net lines added | ~19,731 |
| Data engine source lines (shared) | ~4,322 |
| Demo F1 application lines | ~5,793 |
| Workspace source lines (new/modified) | ~3,925 |
| Shell API route lines | ~704 |
| Documentation lines (Fumadocs) | ~2,089 |
| Scaffold CLI + templates lines | ~1,375 |
| Unit/integration test files | 13 |
| New API routes | 4 |
| New components | 4 |
| New registries | 2 (FormatterRegistry, PageRegistry) |
| F1 Prisma models | 14 |
| F1 seed seasons | 5 |
| F1 demo pages | 9 |
| Custom formatters (F1) | 8 |
| Documentation guides | 13 |

---

## User story status

| Story | Title | Wave | Status | Key files | Tests |
|-------|-------|------|--------|-----------|-------|
| US-200 | Application scaffold system | 1 | Complete | `scripts/vastu-init.ts`, `scripts/templates/app/` | `scripts/__tests__/vastu-init.test.ts` |
| US-201 | Prisma schema composition | 1 | Complete | `packages/shared/prisma/base-schema.prisma`, `packages/shared/src/prisma/` | Included in scaffold tests |
| US-202 | Data query API | 1 | Complete | `packages/shared/src/data-engine/filterTranslator.ts`, `sortTranslator.ts`, `searchTranslator.ts`, `types.ts`, `packages/shell/src/app/api/workspace/data/query/route.ts` | `filterTranslator.test.ts`, `sortTranslator.test.ts`, `searchTranslator.test.ts` |
| US-203 | Data aggregate API | 2 | Complete | `packages/shared/src/data-engine/aggregateBuilder.ts`, `timeBucket.ts`, `packages/shell/src/app/api/workspace/data/aggregate/route.ts` | `aggregateBuilder.test.ts` |
| US-204 | Schema introspection API | 2 | Complete | `packages/shared/src/data-engine/schemaIntrospector.ts`, `packages/shell/src/app/api/workspace/data/schema/route.ts` | `schemaIntrospector.test.ts` |
| US-205 | Custom cell formatter registry | 2 | Complete | `packages/workspace/src/formatters/registry.ts`, `types.ts`, `builtins.ts` | `registry.test.ts`, `builtins.test.ts` |
| US-206 | Application page registration | 2 | Complete | `packages/workspace/src/pages/registry.ts`, `types.ts` | Sidebar integration tests |
| US-207 | Server-Sent Events infrastructure | 3 | Complete | `packages/shared/src/data-engine/eventTypes.ts`, `events.ts`, `packages/shell/src/app/api/workspace/events/route.ts`, `packages/workspace/src/hooks/useWorkspaceEvents.ts`, `useEventInvalidation.ts`, `packages/workspace/src/components/SSEStatusIndicator/` | `events.test.ts`, `SSEStatusIndicator.test.tsx`, `useWorkspaceEvents.test.ts`, `useEventInvalidation.test.ts` |
| US-208 | CASL query scoping middleware | 3 | Complete | `packages/shared/src/data-engine/caslScope.ts` | `caslScope.test.ts` |
| US-209 | Cross-page navigation system | 3 | Complete | `packages/workspace/src/components/VastuTable/LinkCell.tsx`, `packages/workspace/src/components/DockviewHost/PanelBreadcrumb.tsx`, `packages/workspace/src/stores/navigationStore.ts` | `LinkCell.test.tsx`, `PanelBreadcrumb.test.tsx` |
| US-210 | Chart keyboard accessibility | 1 | Complete | `packages/workspace/src/components/VastuChart/` (restored from revert) | Included in restore cherry-pick |
| US-211 | Workspace E2E in CI | 1 | Complete | `.github/workflows/ci-e2e-keycloak.yml` (integrated into existing workflow) | CI workflow validation |
| US-212 | Framework extension documentation | 3 | Complete | `packages/docs/content/docs/guides/`, `packages/docs/content/docs/reference/` | N/A (documentation) |
| US-213 | Core framework API documentation | 5 | Complete (bonus) | `packages/docs/content/docs/reference/` | N/A (documentation) |
| US-220 | F1 database schema | 4 | Complete | `apps/demo-f1/prisma/schema.prisma` | Schema validation |
| US-221 | F1 seed data | 4 | Complete | `apps/demo-f1/prisma/seed/` (PRNG, generators, distributions) | `f1Seed.test.ts` |
| US-222 | F1 display formatters | 4 | Complete | `apps/demo-f1/src/formatters.ts` | `formatters.test.ts` |
| US-223 | F1 demo pages | 5 | Complete | `apps/demo-f1/src/pages.ts` | `pages.test.ts` |
| US-224 | F1 demo documentation | 5 | Complete | `apps/demo-f1/README.md`, `packages/docs/content/docs/guides/f1-demo.mdx`, `f1-customization.mdx` | N/A (documentation) |

---

## Features delivered by wave

### Wave 1 (Week 17): Scaffold, data query, tech debt

Established the application scaffold, data query pipeline, and restored previously-reverted tech debt features:

- **US-200**: Application scaffold CLI (`pnpm vastu:init <app-name>`) that generates a complete Next.js app with Prisma schema, seed file, page/formatter registrations, and monorepo workspace integration
- **US-201**: Prisma schema composition -- base schema template extracted from shared, seed composition system allowing apps to extend the base seed with domain-specific data
- **US-202**: Data query API -- FilterNode types moved to shared, FilterNode-to-Prisma where translator (15+ test cases), sort translator, global search translator, and generic `/api/workspace/data/query` route with pagination, column selection, and tenant scoping
- **US-210**: Chart keyboard accessibility restored from revert -- keyboard navigation hook for chart data points, "View as table" toggle
- **US-211**: Workspace E2E CI workflow restored from revert -- GitHub Actions with Postgres, Redis, and Keycloak service containers

### Wave 2 (Week 18): Aggregate, introspection, formatters, pages

Built the remaining data engine capabilities and the two core registries:

- **US-203**: Data aggregate API -- aggregate builder with groupBy, count, sum, avg, min, max operations; time bucket helper for date-based grouping; `/api/workspace/data/aggregate` route
- **US-204**: Schema introspection API -- DMMF-powered introspection of Prisma models returning field names, types, relations, and constraints; cached responses via `/api/workspace/data/schema` route
- **US-205**: Custom cell formatter registry -- pluggable `FormatterRegistry` class; 10 built-in formatters (text, number, currency, date, relativeDate, badge, avatar, boolean, link, monospace); VastuTable and VastuChart integration for custom cell rendering
- **US-206**: Application page registration -- `PageRegistry` class for apps to register pages with sidebar sections, icons, templates, and configurations; sidebar and command palette integration

### Wave 3 (Week 19): SSE, CASL, cross-page nav, docs

Delivered real-time infrastructure, security middleware, navigation, and documentation:

- **US-207**: Server-Sent Events infrastructure -- in-process event bus, SSE endpoint with heartbeat and reconnection, `useWorkspaceEvents` client hook with auto-reconnect, `SSEStatusIndicator` in tray bar, TanStack Query cache invalidation on data-change events
- **US-208**: CASL query scoping middleware -- `scopeQuery` function that translates CASL ability rules into Prisma where clauses; integrated into data query and aggregate routes for automatic permission enforcement
- **US-209**: Cross-page navigation system -- `navigateTo` column configuration, `LinkCell` renderer that opens target pages in Dockview panels, `PanelBreadcrumb` back-link for drill-down navigation, navigation history in `navigationStore`
- **US-212**: Framework extension documentation -- 7 guides (getting-started, schema-composition, data-engine, live-updates, custom-formatters, registering-pages, permissions-scoping), API reference, architecture overview

### Wave 4 (Week 20): F1 schema, seed, formatters

Built the F1 demo application's data layer:

- **US-220**: F1 database schema -- 14 domain models (Season, Team, Driver, Circuit, Race, RaceResult, QualifyingResult, LapTime, PitStop, DriverStanding, ConstructorStanding, Penalty, RaceEvent, DriverContract) with 9 enums, scaffolded via `pnpm vastu:init`
- **US-221**: F1 seed data -- deterministic PRNG-based generator producing 5 seasons of realistic F1 data including races, qualifying, lap times, pit stops, standings, and events with realistic statistical distributions
- **US-222**: F1 display formatters -- 8 custom formatters (lap-time, tire-compound, race-position, gap-to-leader, driver-name, team-color, penalty-type, weather-icon) registered via FormatterRegistry

### Wave 5 (Week 21): F1 pages, documentation, API docs

Completed the F1 demo and documentation:

- **US-223**: F1 demo pages -- 9 pre-configured pages across 6 templates (Seasons, Teams, Drivers, Circuits, Races, Race Detail, Championship, Driver Comparison, Constructor Standings) registered via PageRegistry with sidebar sections
- **US-224**: F1 demo documentation -- README with setup instructions, Fumadocs walkthrough page, customization guide for building new demo apps
- **US-213** (bonus): Core framework API documentation -- comprehensive API reference for data engine, registries, and SSE systems

---

## Architecture decisions

### ADR-013: Framework-application separation
- Applications are self-contained directories under `apps/` with their own Prisma schema, seed data, pages, and formatters
- Applications consume framework extension points (registries, data engine, SSE) only through public APIs
- `rm -rf apps/<app-name>/` leaves the framework fully functional -- no framework code imports from apps
- The `pnpm vastu:init` scaffold enforces this boundary by generating only the correct import patterns

### ADR-014: Prisma schema composition
- Each app has its own `prisma/schema.prisma` that extends the base schema from `packages/shared/prisma/base-schema.prisma`
- Base schema contains core models (User, Tenant, Role, Session, etc.); app schemas add domain models
- Seed composition: `packages/shared/src/prisma/baseSeed.ts` provides base data, apps append domain seed via their own `prisma/seed.ts`
- Single Prisma client generated per app, containing both base and domain models

### ADR-015: Formatter registry pattern
- `FormatterRegistry` is a singleton class with `register(name, Component)` and `get(name)` methods
- Built-in formatters (10 types) are pre-registered via side-effect import in `builtins.ts`
- App formatters are registered at app startup before workspace renders
- VastuTable and VastuChart resolve formatters by name at render time, falling back to text formatter
- Formatters receive a standard `FormatterProps` interface: `{ value, row, column, format }`

### ADR-016: Data engine architecture
- Three complementary APIs: query (filtered/sorted/paginated rows), aggregate (groupBy with metrics), schema (model introspection)
- FilterNode types shared between workspace (client-side filter UI) and shell (server-side Prisma translation)
- Translators are pure functions: `filterToPrismaWhere(node)`, `sortToPrismaOrderBy(sorts)`, `searchToPrismaWhere(query, columns)`
- All data routes enforce tenant scoping (multi-tenancy) and CASL permission scoping (authorization) before query execution
- Schema introspection uses Prisma DMMF (Data Model Meta Format) for zero-config model discovery

### ADR-017: Server-Sent Events for real-time updates
- In-process event bus (pub/sub) in shared package -- no external message broker required for single-instance deployments
- SSE endpoint streams typed events with heartbeat (30s interval) and Last-Event-ID reconnection support
- Client hook (`useWorkspaceEvents`) manages connection lifecycle with exponential backoff reconnection
- TanStack Query cache invalidation is automatic: `useEventInvalidation` maps event types to query keys and triggers refetch
- SSEStatusIndicator shows connection state (connected/reconnecting/disconnected) in the tray bar

### ADR-018: CASL query scoping
- `scopeQuery` translates CASL ability rules into Prisma `where` clauses at the data route level
- Both "can" (allow) and "cannot" (deny) rules are handled, producing OR/AND/NOT combinations
- Scoping is applied as an additional where clause merged with the user's filter, ensuring users never see unauthorized data
- Integration point: data query and aggregate routes call `scopeQuery(ability, 'read', model)` before executing Prisma queries

---

## Design system compliance

| Requirement | Status |
|-------------|--------|
| All colors via `--v-*` tokens | Yes -- SSEStatusIndicator, LinkCell, PanelBreadcrumb all use design tokens |
| TruncatedText on truncatable text | Yes -- LinkCell labels, breadcrumb text |
| Loading states (skeleton -> content -> error) | Yes -- data routes return structured error responses; SSE shows reconnection state |
| Two font weights only (400/500) | Yes -- no new violations introduced |
| WCAG 2.2 AA | Improved -- chart keyboard navigation (US-210), aria-labels on SSE indicator, LinkCell accessible names |
| Keyboard navigation | Improved -- chart data point keyboard nav, arrow key traversal with screen reader announcements |
| Chart accessibility | Complete -- keyboard-navigable data points across chart types, "View as table" toggle, aria-labels |

---

## Test coverage

### Unit and integration tests (Vitest)

New test files added in Phase 2A:

**Data engine (shared):**
- `packages/shared/src/data-engine/__tests__/filterTranslator.test.ts`
- `packages/shared/src/data-engine/__tests__/sortTranslator.test.ts`
- `packages/shared/src/data-engine/__tests__/searchTranslator.test.ts`
- `packages/shared/src/data-engine/__tests__/aggregateBuilder.test.ts`
- `packages/shared/src/data-engine/__tests__/caslScope.test.ts`
- `packages/shared/src/data-engine/__tests__/schemaIntrospector.test.ts`
- `packages/shared/src/data-engine/__tests__/events.test.ts`

**Workspace (formatters, pages, components):**
- `packages/workspace/src/formatters/__tests__/registry.test.ts`
- `packages/workspace/src/formatters/__tests__/builtins.test.ts`
- `packages/workspace/src/hooks/__tests__/useWorkspaceEvents.test.ts`
- `packages/workspace/src/hooks/__tests__/useEventInvalidation.test.ts`
- `packages/workspace/src/components/SSEStatusIndicator/__tests__/SSEStatusIndicator.test.tsx`
- `packages/workspace/src/components/VastuTable/__tests__/LinkCell.test.tsx`
- `packages/workspace/src/components/DockviewHost/__tests__/PanelBreadcrumb.test.tsx`

**F1 demo application:**
- `apps/demo-f1/prisma/__tests__/f1Seed.test.ts`
- `apps/demo-f1/src/__tests__/formatters.test.ts`
- `apps/demo-f1/src/__tests__/pages.test.ts`

### CI workflows

- Workspace E2E workflow with Docker service containers (Postgres, Redis, Keycloak)
- Integrated into existing CI pipeline

---

## New components inventory

| Component | Package | Purpose |
|-----------|---------|---------|
| SSEStatusIndicator | workspace | Connection state indicator (connected/reconnecting/disconnected) in tray bar |
| LinkCell | workspace | Clickable cell renderer for cross-page navigation links in VastuTable |
| PanelBreadcrumb | workspace | Back-link breadcrumb for drill-down navigation in Dockview panels |
| SSEProvider | workspace | React context provider managing SSE connection lifecycle |

## Registries inventory

| Registry | Package | Purpose |
|----------|---------|---------|
| FormatterRegistry | workspace | Pluggable cell display formatters for tables and charts |
| PageRegistry | workspace | Application page definitions with sidebar, template, and config integration |

## API routes added

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/workspace/data/query` | POST | Generic data query with filtering, sorting, pagination, tenant + CASL scoping |
| `/api/workspace/data/aggregate` | POST | Aggregate queries with groupBy, metrics, and time bucketing |
| `/api/workspace/data/schema` | GET | Schema introspection returning model fields, types, and relations |
| `/api/workspace/events` | GET (SSE) | Server-Sent Events stream with heartbeat and reconnection support |

---

## Documentation produced

### Fumadocs guides (packages/docs)

| Guide | Path | Topics |
|-------|------|--------|
| Getting Started | `guides/getting-started.mdx` | `pnpm vastu:init`, project structure, first page |
| Schema Composition | `guides/schema-composition.mdx` | Base schema, extending models, seed composition |
| F1 Demo Walkthrough | `guides/f1-demo.mdx` | Setup, seed data, exploring pages |
| F1 Customization | `guides/f1-customization.mdx` | Adding pages, formatters, customizing templates |

### Fumadocs API reference (packages/docs)

| Reference | Path | Topics |
|-----------|------|--------|
| Data Query API | `reference/data-query-api.mdx` | FilterNode, translators, query route |
| Schema Composition | `reference/schema-composition.mdx` | Base schema API, seed functions |
| Formatter Registry | `reference/formatter-registry.mdx` | register, get, FormatterProps interface |
| Page Registry | `reference/page-registry.mdx` | registerPage, sidebar integration |
| Events | `reference/events.mdx` | Event types, SSE endpoint, client hooks |

---

## F1 demo application inventory

### Schema models (14)

Season, Team, Driver, Circuit, Race, RaceResult, QualifyingResult, LapTime, PitStop, DriverStanding, ConstructorStanding, Penalty, RaceEvent, DriverContract

### Enums (9)

Tire compound, weather condition, race status, penalty type, event type, session type, race event category, contract status, team role

### Custom formatters (8)

lap-time, tire-compound, race-position, gap-to-leader, driver-name, team-color, penalty-type, weather-icon

### Pages (9)

| Page | Template | Description |
|------|----------|-------------|
| Seasons | table-listing | Season list with year, champion, constructor champion |
| Teams | table-listing | Constructor list with country, wins, championships |
| Drivers | table-listing | Driver list with nationality, team, career stats |
| Circuits | table-listing | Circuit list with country, length, lap record |
| Races | table-listing | Race calendar with circuit, date, winner, weather |
| Race Detail | multi-tab-detail | Results, qualifying, lap times, pit stops, events |
| Championship | summary-dashboard | Standings charts, season KPIs, comparison widgets |
| Driver Comparison | data-explorer | Head-to-head metrics with chart visualization |
| Constructor Standings | table-listing | Constructor championship table with points breakdown |

---

## Known issues and technical debt

1. **Workspace E2E CI workflow location:** The workspace E2E CI was integrated into the existing Keycloak E2E workflow rather than having its own dedicated workflow file. A separate `ci-workspace-e2e.yml` may be cleaner for maintainability.

2. **Event bus is in-process only:** The SSE event bus uses an in-process pub/sub pattern. For multi-instance deployments, a Redis-backed event bus or similar distributed messaging will be needed.

3. **Aggregate API uses raw-ish SQL for time bucketing:** The `timeBucket` helper generates date-truncation expressions that are Postgres-specific. If database portability becomes a concern, this will need abstraction.

4. **Schema introspection cache is in-memory:** The DMMF introspection cache lives in Node.js process memory. In serverless environments with cold starts, cache misses will occur on every invocation.

5. **F1 demo pages are configuration-only:** The 9 F1 demo pages are defined as PageRegistry configurations pointing to existing templates. No custom React components were needed, which validates the template system but means complex custom UI patterns (e.g., race track visualization) are not yet demonstrated.

6. **Cross-page navigation is one-level deep:** PanelBreadcrumb tracks a single "back" link. Multi-level drill-down (e.g., Season -> Race -> Lap Times) would need a navigation stack rather than a single parent reference.

---

## What was deferred (out of scope)

| Item | Deferred to | Notes |
|------|-------------|-------|
| Workflow mode content | Phase 2B | ModeSwitch shows the tab; placeholder content renders |
| Agent panel / AG-UI | Phase 3 | Not started |
| Hook execution engine | Phase 3 | Builder mode hook UI exists; sandboxed execution is Phase 3 |
| MCP tools for workspace | Phase 3 | Not started |
| OpenTelemetry / monitoring | Phase 3 | Not started |
| Distributed event bus (Redis) | Phase 2B | Current in-process bus works for single-instance |
| Multi-level navigation stack | Phase 2B | Single-level breadcrumb implemented |
| Touch-friendly drag-and-drop | Phase 2B | Dashboard card reorder is desktop-only |
| Row-level security enforcement | Phase 2B | CASL scoping at query level implemented; per-object ACLs still UI-only |

---

## Merged PRs

25 PRs merged to main during Phase 2A:

| PR | Title |
|----|-------|
| #393 | feat(shared): Prisma schema composition [VASTU-2A-201] |
| #394 | feat(workspace): application page registry [VASTU-2A-206] |
| #395 | feat(shared,shell): data engine types, translators, and query API [VASTU-2A-202] |
| #396 | feat(workspace): custom cell formatter registry [VASTU-2A-205] |
| #397 | feat(workspace): chart keyboard accessibility [VASTU-2A-210] |
| #398 | ci(workspace): workspace E2E workflow [VASTU-2A-211] |
| #399 | revert: undo all Phase 2A old-plan merges |
| #400 | update |
| #401 | restore: cherry-pick US-205, US-210, US-211 from reverted PRs |
| #402 | feat(root,shared): application scaffold CLI and Prisma composition [VASTU-2A-200, VASTU-2A-201] |
| #403 | feat(shared,shell): data engine types, translators, and query API [VASTU-2A-202] |
| #405 | feat(workspace): application page registration [VASTU-2A-206] |
| #406 | feat(shared,workspace,shell): Server-Sent Events infrastructure [VASTU-2A-207] |
| #407 | feat(shared,shell): schema introspection API [VASTU-2A-204] |
| #408 | feat(shared,shell): CASL query scoping middleware [VASTU-2A-208] |
| #409 | docs: framework extension documentation [VASTU-2A-212] |
| #410 | feat(data-engine): aggregate API [VASTU-2A-203] |
| #411 | feat(workspace): cross-page navigation system [VASTU-2A-209] |
| #412 | feat(demo-f1): F1 database schema [VASTU-2A-220] |
| #413 | feat(demo-f1): F1 seed data [VASTU-2A-221] |
| #414 | feat(demo-f1): F1 display formatters [VASTU-2A-222] |
| #415 | docs: F1 demo walkthrough and customization guide [VASTU-2A-224] |
| #416 | feat(demo-f1): register F1 demo pages [VASTU-2A-223a] |
| #417 | feat(demo-f1): F1 demo pages and formatters [VASTU-2A-222, VASTU-2A-223] |
| #419 | docs: add core framework API documentation [VASTU-2A-213] |

---

## Recommendations for Phase 2B / Phase 3

1. **Distributed event bus:** Replace the in-process event bus with Redis pub/sub for multi-instance SSE support.
2. **Navigation stack:** Extend PanelBreadcrumb to support multi-level drill-down with a proper navigation history stack.
3. **Custom template components:** The F1 demo proved that configuration-driven pages work well, but consider adding a demo with custom React components to validate the escape hatch pattern.
4. **Workflow mode:** The workspace infrastructure (ModeSwitch, panel system, state management) is ready for workflow content implementation.
5. **Agent panel and AG-UI:** The SSE infrastructure and event bus provide a foundation for streaming agent responses into workspace panels.
6. **Hook execution engine:** Builder mode hook editor UI is complete; Phase 3 needs sandboxed execution with a JavaScript VM.
7. **Per-object ACL enforcement:** CASL query scoping is now implemented at the route level; row-level security via per-object ACLs (RecordDrawer Permissions tab) can build on this foundation.
8. **Database portability:** Abstract Postgres-specific SQL in the aggregate time bucketing if multi-database support is needed.
9. **Serverless-friendly caching:** Move schema introspection cache from in-memory to a shared cache (Redis) if deploying to serverless.
10. **Touch device support:** Add dnd-kit or similar library for dashboard card reorder on mobile/tablet devices.

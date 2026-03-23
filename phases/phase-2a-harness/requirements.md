# Phase 2A: Extension Points + F1 Demo Application

> Target: Weeks 17–21 (5 weeks)
> References: Wireframes (all groups), Patterns Library (all), Style Guide (full)
> Prerequisite: Phase 1B complete and merged to main
> Known debt carried: workspace E2E in CI, chart keyboard nav, row-level security, SSE live updates

## Phase goal

When this phase is complete, Vastu is a framework developers can actually extend. A developer can run `pnpm vastu:init my-app`, get a scaffold with the base schema, register domain-specific tables, custom cell formatters, and page configurations — and have a working data-driven workspace without touching framework code.

The F1 demo application (`apps/demo-f1/`) proves this by consuming every extension point: custom schema, custom seed data, custom formatters (lap times, tire compounds, nationality flags), and 9 pre-configured pages — all cleanly separated from the framework packages.

**Two halves, strict order:**
1. **Weeks 17–19: Framework extension points** — the generic infrastructure that any application needs
2. **Weeks 20–21: F1 demo application** — consumes those extension points, proves they work

---

## Part 1: Framework extension points

### Group 1: Application scaffold and Prisma composition

#### US-200: Application scaffold system
**As a** developer, **I want** to run a single command to create a new application in the monorepo, **so that** I can start building my domain without manual setup.

**Acceptance criteria:**
- [ ] AC-1: `pnpm vastu:init <app-name>` creates `apps/<app-name>/` with:
  - `package.json` (depends on `@vastu/shell`, `@vastu/workspace`, `@vastu/shared`)
  - `next.config.mjs` (imports shell and workspace modules)
  - `prisma/schema.prisma` (copied from base schema template with placeholder for domain tables)
  - `prisma/seed.ts` (scaffold with base seed import + empty domain seed function)
  - `src/pages.ts` (empty page registration file with example comment)
  - `src/formatters.ts` (empty formatter registration file with example comment)
  - `README.md` (getting started instructions)
  - `tsconfig.json` extending root
- [ ] AC-2: The scaffold compiles and starts (`pnpm dev`) immediately — shows workspace with default Welcome panel and Settings link
- [ ] AC-3: `apps/` directory added to Turborepo workspace config
- [ ] AC-4: Multiple apps can coexist: `apps/demo-f1/` and `apps/my-crm/` side by side
- [ ] AC-5: `.gitignore` in `apps/` excludes nothing — apps are committed (they're first-party)

**Notes:** This is the primary developer onboarding path. The command must produce a working app, not a broken scaffold that needs 10 manual steps.

---

#### US-201: Prisma schema composition
**As a** developer, **I want** to extend the base database schema with my domain tables, **so that** auth, pages, views, and audit work alongside my data.

**Acceptance criteria:**
- [ ] AC-1: Base schema template in `packages/shared/prisma/base-schema.prisma` containing: users, organizations, tenants, roles, user_roles, permissions, api_keys, db_connections, audit_events, sessions, pages, page_configurations, views, sso_providers
- [ ] AC-2: `vastu:init` copies base schema into `apps/<name>/prisma/schema.prisma` with a clearly marked section:
  ```prisma
  // ═══════════════════════════════════════
  // YOUR DOMAIN MODELS BELOW
  // ═══════════════════════════════════════
  ```
- [ ] AC-3: `pnpm prisma:migrate` runs from the app directory using the app's schema
- [ ] AC-4: `pnpm prisma:seed` runs the base seed (users, roles, system pages) first, then the app's domain seed
- [ ] AC-5: Prisma Client generated per-app (each app gets its own client that knows both base and domain tables)
- [ ] AC-6: Documentation in Fumadocs: "Extending the schema" guide with example of adding a domain table

---

### Group 2: Generic data engine

#### US-202: Data query API
**As a** developer, **I want** a generic query route that works with any Prisma table, **so that** my templates can display data without writing custom API routes per table.

**Acceptance criteria:**
- [ ] AC-1: Route `GET /api/workspace/data/query` in `packages/shell` that accepts:
  - `table` (string — Prisma model name)
  - `columns` (string[] — fields to select, including relation fields like `driver.name`)
  - `filters` (FilterNode JSON — composable filter tree)
  - `sort` (array of `{ column, direction }`)
  - `pagination` (`{ page, pageSize }`)
  - `search` (string — global text search term)
  - `include` (string[] — relation names to eager-load)
- [ ] AC-2: `FilterNode → Prisma where` translator as a pure function in `packages/shared/src/data-engine/filterTranslator.ts`:
  - Include → `{ column: { in: values } }`
  - Exclude → `{ NOT: { column: { in: values } } }`
  - Regex → `{ column: { contains: pattern, mode: 'insensitive' } }`
  - AND/OR groups → nested `{ AND: [...] }` / `{ OR: [...] }`
  - Number range → `{ column: { gte: min, lte: max } }`
  - Date range → `{ column: { gte: start, lte: end } }`
  - Boolean → `{ column: value }`
- [ ] AC-3: Sort translator: `sort → Prisma orderBy` (multi-column, with nested relation sort like `driver: { name: 'asc' }`)
- [ ] AC-4: Pagination: `skip`/`take` with parallel `count()` for total
- [ ] AC-5: Global search: `OR` across all string columns in the model with `contains` + `mode: 'insensitive'`
- [ ] AC-6: Response shape: `{ rows: T[], total: number, page: number, pageSize: number, columns: ColumnMeta[] }`
- [ ] AC-7: `ColumnMeta` includes: name, type (String/Int/Float/DateTime/Boolean/Enum), nullable, isPrimaryKey, isForeignKey, relatedModel
- [ ] AC-8: Query timeout: 10 seconds, returns 504 if exceeded
- [ ] AC-9: All queries scoped to current tenant (`tenant_id` injected from session)
- [ ] AC-10: Unit tests for filterTranslator with all mode combinations and nesting levels

---

#### US-203: Data aggregate API
**As a** developer, **I want** a generic aggregate route for charts and KPIs, **so that** dashboards work with any table.

**Acceptance criteria:**
- [ ] AC-1: Route `GET /api/workspace/data/aggregate` accepting:
  - `table` (string)
  - `metric` (`count` / `sum` / `avg` / `min` / `max`)
  - `field` (string — column to aggregate, required for sum/avg/min/max)
  - `groupBy` (string — column to group by)
  - `timeField` (string — date column for time bucketing)
  - `timeResolution` (`hourly` / `daily` / `weekly` / `monthly` / `yearly`)
  - `filters` (FilterNode)
  - `timeRange` (`{ start, end }`)
- [ ] AC-2: Time bucketing uses Prisma raw query for `date_trunc` (Postgres) — this is the one exception to the "no raw SQL" rule, wrapped in a safe helper
- [ ] AC-3: Response: `{ data: { label: string, value: number }[], total: number }`
- [ ] AC-4: For multi-series (groupBy + timeField): `{ series: { name: string, data: { label: string, value: number }[] }[] }`
- [ ] AC-5: Delta calculation: optional `comparePrevious: true` returns both current and prior period values
- [ ] AC-6: Tenant-scoped. Timeout: 10s.

---

#### US-204: Schema introspection API
**As a** developer, **I want** an API that returns the schema of any table, **so that** builder mode can auto-detect columns and types.

**Acceptance criteria:**
- [ ] AC-1: Route `GET /api/workspace/data/schema?table=<name>` returns:
  - Model name
  - Fields: `{ name, type, isRequired, isId, isForeignKey, relatedModel, enumValues }`
  - Relations: `{ name, type (hasOne/hasMany), relatedModel, foreignKey }`
- [ ] AC-2: Powered by Prisma DMMF (Data Model Meta Format) — no database introspection queries needed
- [ ] AC-3: Cached in memory (schema doesn't change at runtime)
- [ ] AC-4: Used by builder mode "Data source" section to show available fields and auto-populate column config

---

### Group 3: Formatter registry

#### US-205: Custom cell formatter registry
**As a** developer, **I want** to register custom display formatters for VastuTable cells and VastuChart labels, **so that** I can render domain-specific data (lap times, tire compounds, flags) without modifying framework code.

**Acceptance criteria:**
- [ ] AC-1: `FormatterRegistry` class in `packages/workspace/src/formatters/registry.ts`:
  ```typescript
  FormatterRegistry.register('lap-time', {
    render: (value: number) => React.ReactNode,  // cell renderer
    sort: (a: number, b: number) => number,       // custom sort function (optional)
    export: (value: number) => string,             // CSV/export format (optional)
    filter: FilterInputComponent,                  // custom filter input (optional)
  });
  ```
- [ ] AC-2: VastuTable cell renderer checks the formatter registry before falling back to built-in display types. Column config `displayType: 'lap-time'` → uses registered formatter.
- [ ] AC-3: VastuChart tooltip and legend use the formatter's `render` for value display
- [ ] AC-4: Built-in formatters (text, number, currency, date, relativeDate, badge, avatar, boolean, link, monospace) pre-registered in the framework — apps extend, never replace
- [ ] AC-5: App registers formatters at startup via `src/formatters.ts`:
  ```typescript
  import { FormatterRegistry } from '@vastu/workspace';
  FormatterRegistry.register('lap-time', { ... });
  FormatterRegistry.register('tire-compound', { ... });
  ```
- [ ] AC-6: Unknown display type falls back to text with a console warning (not a crash)
- [ ] AC-7: Documentation in Fumadocs: "Custom formatters" guide

---

### Group 4: Page registration API

#### US-206: Application page registration
**As a** developer, **I want** to register my domain pages from my app directory, **so that** they appear in the sidebar without modifying framework code.

**Acceptance criteria:**
- [ ] AC-1: `PageRegistry` in `packages/workspace/src/pages/registry.ts`:
  ```typescript
  PageRegistry.register({
    id: 'f1-races',
    name: 'Races',
    icon: 'IconFlag',
    template: 'table-listing',
    section: 'PAGES',          // sidebar section
    order: 1,                  // sidebar order
    config: { ... },           // initial page configuration
  });
  ```
- [ ] AC-2: App registers pages at startup via `src/pages.ts` — framework loads these automatically
- [ ] AC-3: Registered pages appear in the sidebar, command palette, and page picker
- [ ] AC-4: Pages can also be created at runtime via builder mode (stored in `pages` table) — both sources merge
- [ ] AC-5: Static (code-registered) pages show a "System" badge in builder mode — their existence can't be deleted, but their config can be overridden
- [ ] AC-6: Sidebar shows: static pages first (from registry), then dynamic pages (from database), separated by a subtle divider
- [ ] AC-7: Documentation: "Registering pages" guide

---

### Group 5: SSE and CASL infrastructure

#### US-207: Server-Sent Events infrastructure
**As a** developer, **I want** a generic SSE system that any app can emit events to and subscribe from, **so that** dashboards and timelines update live.

**Acceptance criteria:**
- [ ] AC-1: SSE endpoint at `/api/workspace/events` in `packages/shell`
- [ ] AC-2: Event emitter utility in `packages/shared/src/data-engine/events.ts`:
  ```typescript
  emitWorkspaceEvent({
    type: 'record.created',
    table: 'races',
    recordId: '...',
    tenantId: '...',
  });
  ```
- [ ] AC-3: Event types: `record.created`, `record.updated`, `record.deleted`, `view.saved`, `config.changed`
- [ ] AC-4: Events scoped to tenant (users only receive events for their tenant)
- [ ] AC-5: Client-side hook in workspace: `useWorkspaceEvents(callback)` — subscribes to SSE, calls callback on events
- [ ] AC-6: Dashboard auto-refresh: re-fetches data on relevant events (invalidates TanStack Query cache)
- [ ] AC-7: Timeline template: prepends new events without full reload
- [ ] AC-8: Table listing: shows "N new records" badge above table on `record.created` events for that table
- [ ] AC-9: Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
- [ ] AC-10: Connection status indicator in tray bar: green dot (connected), amber (reconnecting), red (disconnected)
- [ ] AC-11: Apps emit events by calling `emitWorkspaceEvent()` in their API routes or seed scripts — framework handles delivery

---

#### US-208: CASL query scoping middleware
**As a** developer, **I want** database queries to automatically respect role permissions, **so that** I don't have to write auth checks in every API route.

**Acceptance criteria:**
- [ ] AC-1: Middleware in `packages/shared/src/data-engine/caslScope.ts`:
  ```typescript
  function scopeQuery(ability: AppAbility, action: string, table: string, query: PrismaWhere): PrismaWhere
  ```
  Takes the user's CASL abilities and injects permission conditions into the Prisma `where` clause.
- [ ] AC-2: Data query API (`/api/workspace/data/query`) calls `scopeQuery` before executing every query
- [ ] AC-3: Data aggregate API calls `scopeQuery` before aggregating
- [ ] AC-4: If user cannot read the table at all → 403 (not empty results)
- [ ] AC-5: Conditional permissions: `can('read', 'Race', { status: 'Completed' })` injects `{ status: 'Completed' }` into the where clause — viewer sees only completed races, admin sees all
- [ ] AC-6: Builder mode access: `ability.can('configure', 'Page')` checked at route level — 403 for non-admins
- [ ] AC-7: Record mutations (update/delete): check `ability.can(action, subject)` before executing
- [ ] AC-8: Unit tests: every system role × every table × every action verified
- [ ] AC-9: Documentation: "Permissions and scoping" guide

---

### Group 6: Cross-page navigation and chart accessibility

#### US-209: Cross-page navigation system
**As a** developer, **I want** to configure table cells as links that open another page template, **so that** users can drill from one entity to a related entity.

**Acceptance criteria:**
- [ ] AC-1: Column config supports `navigateTo`:
  ```typescript
  {
    column: 'driver_id',
    displayType: 'link',
    navigateTo: {
      pageId: 'f1-driver-profile',
      recordId: '{value}',  // the cell value becomes the record ID
    }
  }
  ```
- [ ] AC-2: Click opens the target page in a new Dockview panel pre-loaded with that record
- [ ] AC-3: ⌘+Click opens in a new panel (consistent with command palette Tab behavior)
- [ ] AC-4: Breadcrumb: target panel shows "← Back to {source page}" link
- [ ] AC-5: Works with any page template (table-listing, multi-tab-detail, timeline, etc.)
- [ ] AC-6: Context menu on link cells includes: "Open", "Open in new panel", "Copy link"
- [ ] AC-7: Links that point to non-existent pageIds show a tooltip: "Page not configured"

---

#### US-210: Chart keyboard accessibility
**As a** keyboard user, **I want** to navigate chart data points.

**Acceptance criteria:**
- [ ] AC-1: Tab focuses chart container
- [ ] AC-2: ← → move between data points, active point shows tooltip
- [ ] AC-3: ↑ ↓ cycle between series at same x-position
- [ ] AC-4: Enter triggers drill-down action (same as click)
- [ ] AC-5: Screen reader: chart type, data point label, value, series name
- [ ] AC-6: "View as table" toggle on all chart types (not just data explorer)
- [ ] AC-7: Works for: line, bar, area, donut, scatter. Sparklines exempt.

---

### Group 7: Infrastructure and documentation

#### US-211: Workspace E2E in CI
**As a** developer, **I want** workspace E2E tests running in CI.

**Acceptance criteria:**
- [ ] AC-1: GitHub Actions workflow `ci-workspace-e2e.yml`
- [ ] AC-2: Docker Compose (Postgres, Redis, Keycloak) as service containers
- [ ] AC-3: Seeds auth + base data
- [ ] AC-4: Runs all workspace E2E specs
- [ ] AC-5: Playwright trace uploaded on failure
- [ ] AC-6: Total time under 10 minutes

---

#### US-212: Framework extension documentation
**As a** developer, **I want** comprehensive docs on how to extend Vastu with my own application.

**Acceptance criteria:**
- [ ] AC-1: Guide: "Getting started" — `pnpm vastu:init`, first page, first seed
- [ ] AC-2: Guide: "Extending the schema" — adding domain tables, running migrations, seed composition
- [ ] AC-3: Guide: "Registering pages" — PageRegistry, sidebar configuration, template selection
- [ ] AC-4: Guide: "Custom formatters" — FormatterRegistry, render/sort/export/filter functions
- [ ] AC-5: Guide: "Data engine" — query API, aggregate API, FilterNode translation, TanStack Query integration
- [ ] AC-6: Guide: "Permissions and scoping" — CASL abilities, conditional permissions, scopeQuery
- [ ] AC-7: Guide: "Live updates" — SSE events, emitWorkspaceEvent, useWorkspaceEvents
- [ ] AC-8: API reference: all data engine routes with request/response schemas
- [ ] AC-9: Architecture: data flow diagram (app schema → Prisma → data engine → template → component)
- [ ] AC-10: ADR: separation model (framework vs application), Prisma composition, formatter registry pattern

---

## Part 2: F1 demo application

> All stories in Part 2 depend on Part 1 being complete. The demo consumes framework extension points — it does not modify framework packages.

### Group 8: F1 schema and seed data

#### US-220: F1 database schema
**As a** developer exploring Vastu, **I want** a realistic F1 domain schema in the demo app, **so that** I can see how a real application extends the base.

**Acceptance criteria:**
- [ ] AC-1: `apps/demo-f1/prisma/schema.prisma` extends the base schema with 16 domain tables:

  **Core:** `seasons`, `circuits`, `constructors`, `drivers`
  **Race weekend:** `races`, `race_results`, `qualifying_results`, `sprint_results`
  **Granular:** `pit_stops`, `lap_times`
  **Standings:** `driver_standings`, `constructor_standings`
  **Events:** `race_events`, `penalties`

  (Full field definitions per the schema spec in the project appendix.)

- [ ] AC-2: All tables have `id` (UUID), `created_at`, `updated_at`. Soft-delete on `drivers`, `constructors`.
- [ ] AC-3: Proper foreign keys, cascading, and indexes on all FK + query columns
- [ ] AC-4: Migration generates cleanly from a fresh database
- [ ] AC-5: Fictional driver and constructor names (avoid F1 IP). Real circuit names and countries (geographic facts).

---

#### US-221: F1 seed data
**As a** developer, **I want** 5 seasons of realistic F1 data seeded in under 45 seconds.

**Acceptance criteria:**
- [ ] AC-1: Deterministic seed (seeded PRNG — identical output every run)
- [ ] AC-2: 5 seasons (2020–2024): 25 circuits, 10 constructors, 40 drivers, 110 races, ~2,200 results, ~2,200 qualifying, ~5,500 pit stops, ~65,000 lap times, ~2,200 driver standings, ~1,100 constructor standings, ~4,400 race events, ~330 penalties
- [ ] AC-3: Realistic distributions:
  - DNF rate ~8%, pit stops 1-3 per driver per race, wet races ~15%, safety cars ~40% of races
  - Championship contention (top 2-3 within 50 points mid-season)
  - Constructor dominance cycles across seasons
  - Lap times realistic per circuit length (70s Monaco to 95s Spa), tire degradation modeled
- [ ] AC-4: `pnpm prisma:seed --demo` runs base seed then F1 seed, completes under 45 seconds
- [ ] AC-5: Seed creates audit_events for race confirmations, penalties, standing updates
- [ ] AC-6: 10 fictional constructors, 40 fictional drivers with diverse nationalities

---

### Group 9: F1 custom formatters

#### US-222: F1 display formatters
**As a** developer, **I want** to see how custom formatters work by example in the F1 demo.

**Acceptance criteria:**
- [ ] AC-1: `apps/demo-f1/src/formatters.ts` registers custom formatters:

  | Formatter | Renders as | Used for |
  |-----------|-----------|----------|
  | `lap-time` | `1:23.456` (mm:ss.ms from milliseconds) | Lap times, Q1/Q2/Q3, fastest lap |
  | `pit-duration` | `2.4s` (seconds with 1 decimal from ms) | Pit stop duration |
  | `tire-compound` | Colored pill (Soft=red, Medium=yellow, Hard=white, Inter=green, Wet=blue) | Pit stops, strategy |
  | `position-change` | `▲3` green / `▼2` red / `—` gray (grid vs finish delta) | Race results |
  | `race-status` | Badge with color: Finished=green, DNF=red, DSQ=amber, DNS=gray | Race results |
  | `nationality-flag` | Two-letter country code with flag emoji fallback | Drivers, constructors |
  | `circuit-type` | Badge: Street=purple, Permanent=blue, Semi-permanent=teal | Circuits |
  | `weather` | Icon + label: Dry=☀️, Wet=🌧️, Mixed=⛅ | Races |

- [ ] AC-2: Each formatter implements `render`, `sort`, and `export` functions
- [ ] AC-3: Formatters registered at app startup, available in all VastuTable instances
- [ ] AC-4: Builder mode "Field configuration" shows custom formatters in the display type picker alongside built-ins

---

### Group 10: F1 page configurations

#### US-223: F1 demo pages
**As a** developer, **I want** 9 pre-configured F1 pages demonstrating all 6 templates.

**Acceptance criteria:**
- [ ] AC-1: `apps/demo-f1/src/pages.ts` registers 9 pages via PageRegistry:

  | Page | Template | Key config |
  |------|----------|-----------|
  | Races | table-listing | Season/round/name/circuit/date/winner(link)/pole(link)/weather/safety cars/laps. KPI strip: total races, wet %, avg safety cars. Default sort: date desc. |
  | Drivers | table-listing | Name(link)/number/nationality(flag)/constructor(link)/championships/wins/podiums/poles/status badge. |
  | Constructors | table-listing | Name(link)/nationality/principal/engine/championships/status badge. |
  | Championship | summary-dashboard | Season picker. KPIs: leader+points, races completed, next race. Charts: driver points progression (line, top 5), constructor wins (donut), constructor points (bar). Mini table: latest race top 10. |
  | Driver Profile | multi-tab-detail | Header: name, number, flag, constructor, championships. Tabs: Overview (stats + points chart), Results (sub-table), Qualifying (sub-table with Q1/Q2/Q3), Penalties, Career timeline. |
  | Lap Time Explorer | data-explorer | Default: avg lap time by circuit, 2024, line. Controls: metric (avg/fastest/pit duration), group by (circuit/driver/constructor/tire), time resolution (per-race/per-season). |
  | Race Report | form-page | Multi-step: select race → enter results grid → incidents/penalties → review. |
  | Race Weekend | timeline-activity | Per-race scoped. Events: practice, qualifying, race start, pit stops, overtakes, penalties, safety cars, finish. Type-filtered. |
  | My Dashboard | dashboard | Pinned: next race KPI, championship leader KPI, season wins by constructor chart, latest race top 10 table. |

- [ ] AC-2: All pages appear in sidebar under PAGES section with appropriate icons
- [ ] AC-3: Cross-page navigation configured: driver name → Driver Profile, race name → Race Weekend, constructor name → constructor detail
- [ ] AC-4: Zero config needed by user — pages work immediately after seed

---

#### US-224: F1 demo documentation
**As a** developer, **I want** demo-specific docs explaining how the F1 app is structured, **so that** I can use it as a reference for building my own app.

**Acceptance criteria:**
- [ ] AC-1: `apps/demo-f1/README.md` with: purpose, setup instructions, architecture diagram, file map
- [ ] AC-2: Inline code comments in `pages.ts`, `formatters.ts`, `seed.ts` explaining "why" not just "what"
- [ ] AC-3: Fumadocs page: "Demo walkthrough" — guided tour of the F1 app showing each extension point in action
- [ ] AC-4: Fumadocs page: "Building your own app" — step-by-step from `vastu:init` to first page with real data, referencing the F1 demo as the example

---

## Technical constraints

- **No framework modification from demo code.** If the demo needs something from the framework, it must be built as a generic extension point first (Part 1), then consumed by the demo (Part 2). If you're editing files in `packages/*` during Part 2, stop — something is missing from Part 1.
- All data queries through the generic data engine (US-202/203/204) — no custom API routes in the demo app for data fetching.
- FilterNode → Prisma translator is a pure function in `packages/shared` (unit-testable without database).
- SSE uses native `ReadableStream` in Next.js route handlers.
- Demo seed uses seeded PRNG — every run produces identical data.
- Lap times table (65K rows) must never load entirely client-side — always server-side paginated.
- The `apps/demo-f1/` directory is fully deletable — `rm -rf apps/demo-f1/` leaves the framework untouched.

## Out of scope

- External database connections via configured connections (Phase 3 — data engine queries the app's own Prisma DB)
- Workflow mode / React Flow canvas (Phase 2B)
- Agent panel / AG-UI / LangGraph (Phase 2B)
- MCP tools (Phase 2B)
- Hook execution engine (Phase 3)
- Real F1 telemetry data (speed, throttle, brake)
- Multi-locale number formats
- File uploads on records (Phase 3)

## Definition of done

- [ ] All 16 user stories implemented with acceptance criteria met
- [ ] `pnpm vastu:init test-app` produces a working application that starts and renders
- [ ] `apps/demo-f1/` exists as a separate application consuming framework extension points only
- [ ] `rm -rf apps/demo-f1/` leaves the framework functional (no broken imports)
- [ ] `pnpm prisma:seed --demo` generates 5 seasons in under 45 seconds
- [ ] All 9 F1 demo pages render with real data, no mocks
- [ ] Races table loads 25 rows in under 500ms
- [ ] Lap times table handles 65K rows (server-side paginated + virtual scroll)
- [ ] Championship dashboard shows real points progression charts
- [ ] Custom formatters (lap-time, tire-compound, etc.) render correctly in tables and charts
- [ ] Cross-page navigation: click driver → driver profile, click race → race weekend
- [ ] CASL permissions enforced on all data routes (viewer can't edit, non-admin can't configure)
- [ ] SSE connection active, dashboard updates on events
- [ ] Chart keyboard navigation for line, bar, area, donut, scatter
- [ ] Workspace E2E in CI with Docker stack, under 10 minutes
- [ ] Framework extension docs complete (7 guides + API reference + ADR)
- [ ] F1 demo docs complete (README + Fumadocs walkthrough)
- [ ] Unit test coverage ≥ 80% on new code
- [ ] Phase completion document produced

---

## Appendix: F1 schema field reference

### seasons
`id`, `year` (Int unique), `rounds` (Int), `champion_driver_id` (FK nullable), `champion_constructor_id` (FK nullable)

### circuits
`id`, `name`, `location`, `country`, `length_km` (Float), `turns` (Int), `lap_record_ms` (Int nullable), `lap_record_driver_id` (FK nullable), `first_gp_year` (Int), `altitude_m` (Int), `circuit_type` (Enum: Street/Permanent/SemiPermanent)

### constructors
`id`, `name`, `full_name`, `nationality`, `base`, `team_principal`, `engine_supplier`, `first_entry_year` (Int), `championships` (Int), `status` (Enum: Active/Withdrawn), `deleted_at` (nullable)

### drivers
`id`, `first_name`, `last_name`, `abbreviation` (3 chars), `number` (Int), `nationality`, `date_of_birth` (DateTime), `championships` (Int), `wins` (Int), `podiums` (Int), `poles` (Int), `status` (Enum: Active/Retired/Reserve), `deleted_at` (nullable)

### races
`id`, `season_id` (FK), `circuit_id` (FK), `round` (Int), `name`, `date` (DateTime), `status` (Enum: Scheduled/Completed/Cancelled), `weather` (Enum: Dry/Wet/Mixed), `laps_completed` (Int), `total_laps` (Int), `has_sprint` (Boolean), `safety_car_laps` (Int), `red_flag_count` (Int)

### race_results
`id`, `race_id` (FK), `driver_id` (FK), `constructor_id` (FK), `grid_position` (Int), `finish_position` (Int nullable), `status` (Enum: Finished/DNF/DSQ/DNS), `status_detail` (String nullable), `points` (Float), `laps_completed` (Int), `total_time_ms` (Int nullable), `fastest_lap` (Boolean), `fastest_lap_time_ms` (Int nullable), `gap_to_leader_ms` (Int nullable)

### qualifying_results
`id`, `race_id` (FK), `driver_id` (FK), `constructor_id` (FK), `position` (Int), `q1_time_ms` (Int nullable), `q2_time_ms` (Int nullable), `q3_time_ms` (Int nullable)

### sprint_results
`id`, `race_id` (FK), `driver_id` (FK), `constructor_id` (FK), `grid_position` (Int), `finish_position` (Int), `points` (Float), `laps_completed` (Int)

### pit_stops
`id`, `race_id` (FK), `driver_id` (FK), `lap` (Int), `stop_number` (Int), `duration_ms` (Int), `tire_compound` (Enum: Soft/Medium/Hard/Intermediate/Wet)

### lap_times
`id`, `race_id` (FK), `driver_id` (FK), `lap_number` (Int), `time_ms` (Int), `position` (Int), `sector_1_ms` (Int), `sector_2_ms` (Int), `sector_3_ms` (Int), `is_personal_best` (Boolean)

### driver_standings
`id`, `race_id` (FK), `driver_id` (FK), `points` (Float), `position` (Int), `wins` (Int)

### constructor_standings
`id`, `race_id` (FK), `constructor_id` (FK), `points` (Float), `position` (Int), `wins` (Int)

### race_events
`id`, `race_id` (FK), `lap` (Int), `type` (Enum: Start/PitStop/Overtake/Penalty/SafetyCar/RedFlag/Retirement/FastestLap/Finish), `driver_id` (FK nullable), `description`, `timestamp` (DateTime)

### penalties
`id`, `race_id` (FK), `driver_id` (FK), `lap` (Int), `type` (Enum: TimePenalty/GridPenalty/DriveThrough/StopGo/Reprimand/Disqualification), `seconds` (Int nullable), `grid_places` (Int nullable), `reason`

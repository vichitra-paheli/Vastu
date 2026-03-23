# Phase 2A: F1 Demo Harness + Real Data Pipeline

> Target: Weeks 17–20 (4 weeks)
> References: Wireframes (all groups), Patterns Library (all), Style Guide (full)
> Prerequisite: Phase 1B complete and merged to main
> Known debt carried: workspace E2E in CI, chart keyboard nav, row-level security, SSE live updates

## Phase goal

When this phase is complete, a developer can clone the repo, seed a synthetic Formula 1 database spanning 5 seasons, and explore the data through a fully functional F1 analytics workspace: browse race results in the table listing, filter by season/circuit/driver/constructor, view championship dashboards with points progression charts, drill into driver profiles with career stats and race history, analyze lap time trends in the data explorer, submit race reports via a form wizard, and watch race event timelines unfold — all backed by real database queries. The workspace is no longer running on mocks.

This also becomes the foundation for Phase 2B — when agents arrive, "Show me Verstappen's average lap time vs Norris at street circuits" will query real data and render a real chart.

---

## User stories

### Group 1: F1 database schema and seed data

#### US-200: F1 database schema
**As a** developer, **I want** a realistic Formula 1 schema with enough tables and relationships to exercise all page templates, **so that** the demo feels like a real motorsport analytics platform.

**Acceptance criteria:**
- [ ] AC-1: Prisma schema additions in `packages/shared/prisma/schema.prisma`:

  **Core entities:**
  - `seasons` (id, year, rounds, champion_driver_id FK nullable, champion_constructor_id FK nullable)
  - `circuits` (id, name, location, country, length_km, turns, lap_record_ms, lap_record_driver_id FK nullable, first_gp_year, altitude_m, circuit_type [Street/Permanent/Semi-permanent])
  - `constructors` (id, name, full_name, nationality, base, team_principal, engine_supplier, first_entry_year, championships, status [Active/Withdrawn])
  - `drivers` (id, first_name, last_name, abbreviation, number, nationality, date_of_birth, championships, wins, podiums, poles, status [Active/Retired/Reserve])

  **Race weekend:**
  - `races` (id, season_id FK, circuit_id FK, round, name, date, status [Scheduled/Completed/Cancelled], weather [Dry/Wet/Mixed], laps_completed, total_laps, has_sprint, safety_car_laps, red_flag_count)
  - `race_results` (id, race_id FK, driver_id FK, constructor_id FK, grid_position, finish_position nullable, status [Finished/DNF/DSQ/DNS], status_detail, points, laps_completed, total_time_ms nullable, fastest_lap boolean, fastest_lap_time_ms nullable, gap_to_leader_ms nullable)
  - `qualifying_results` (id, race_id FK, driver_id FK, constructor_id FK, position, q1_time_ms nullable, q2_time_ms nullable, q3_time_ms nullable)
  - `sprint_results` (id, race_id FK, driver_id FK, constructor_id FK, grid_position, finish_position, points, laps_completed)

  **Granular data:**
  - `pit_stops` (id, race_id FK, driver_id FK, lap, stop_number, duration_ms, tire_compound [Soft/Medium/Hard/Intermediate/Wet])
  - `lap_times` (id, race_id FK, driver_id FK, lap_number, time_ms, position, sector_1_ms, sector_2_ms, sector_3_ms, is_personal_best boolean)

  **Standings (snapshot after each race):**
  - `driver_standings` (id, race_id FK, driver_id FK, points, position, wins)
  - `constructor_standings` (id, race_id FK, constructor_id FK, points, position, wins)

  **Events and penalties:**
  - `race_events` (id, race_id FK, lap, type [Start/PitStop/Overtake/Penalty/SafetyCar/RedFlag/Retirement/FastestLap/Finish], driver_id FK nullable, description, timestamp)
  - `penalties` (id, race_id FK, driver_id FK, lap, type [TimePenalty/GridPenalty/DriveThrough/StopGo/Reprimand/Disqualification], seconds nullable, grid_places nullable, reason)

- [ ] AC-2: All tables have `id` (UUID), `created_at`, `updated_at`. Soft-delete on `drivers`, `constructors`.
- [ ] AC-3: Foreign keys with proper cascading. Indexes on all FK columns + `races.season_id`, `races.date`, `race_results.race_id`, `race_results.driver_id`, `lap_times.race_id`, `lap_times.driver_id`, `driver_standings.race_id`.
- [ ] AC-4: Prisma migration generates cleanly from a fresh database

---

#### US-201: F1 seed data
**As a** developer, **I want** 5 seasons of realistic synthetic F1 data, **so that** tables paginate, charts show trends, and filters have meaningful options.

**Acceptance criteria:**
- [ ] AC-1: Deterministic seed (seeded PRNG — identical output every run)
- [ ] AC-2: Scope: seasons 2020–2024 with realistic-but-fictional data (real circuit names and countries are fine, but driver/constructor names are fictional to avoid IP issues)
- [ ] AC-3: Volume:

  | Table | Count | Notes |
  |-------|-------|-------|
  | seasons | 5 | 2020–2024 |
  | circuits | 25 | Mix of street (6), permanent (16), semi-permanent (3) |
  | constructors | 10 | Consistent across seasons with some changes |
  | drivers | 40 | 20 per season, some carry across seasons |
  | races | 110 | 20-24 per season, matching real calendar growth |
  | race_results | 2,200 | 20 per race |
  | qualifying_results | 2,200 | 20 per race |
  | sprint_results | ~240 | 6-8 sprints per season (2022+) |
  | pit_stops | ~5,500 | 2-3 per driver per race |
  | lap_times | ~65,000 | ~55 laps × 20 drivers × ~60 sampled races |
  | driver_standings | ~2,200 | Snapshot after each race |
  | constructor_standings | ~1,100 | Snapshot after each race |
  | race_events | ~4,400 | ~40 per race (starts, pits, overtakes, penalties, finish) |
  | penalties | ~330 | ~3 per race average |

- [ ] AC-4: Realistic distributions:
  - DNF rate: ~8% of race starts (mechanical 60%, collision 25%, other 15%)
  - Pit stops per race: 1-stop (20%), 2-stop (55%), 3-stop (20%), 4+ (5%)
  - Tire compounds per race: soft + medium most common, hard for high-deg circuits, inters/wets for wet races
  - Wet races: ~15% of races flagged as Wet or Mixed
  - Safety cars: ~40% of races have ≥1 safety car period
  - Championship contention: top 2-3 drivers within 50 points at mid-season
  - Constructor dominance cycles: one team dominant early (2020-2021), another rising (2022-2023), competitive field (2024)

- [ ] AC-5: Lap times realistic per circuit: base lap time varies by circuit length (70s for short circuits like Monaco, 95s for long circuits like Spa), with normal distribution (σ ≈ 0.8s for race laps, σ ≈ 0.3s for qualifying). Tire degradation modeled: lap times increase ~0.05s/lap on softs, ~0.03s on mediums, ~0.02s on hards.

- [ ] AC-6: `pnpm prisma:seed --demo` completes in under 45 seconds (lap_times is the bottleneck — batch insert)

- [ ] AC-7: Seed creates `audit_events` for race result confirmations, penalty decisions, and standing updates (feeds the timeline template)

- [ ] AC-8: 10 fictional constructor names with realistic nationalities and bases (e.g., "Apex Racing" from UK, "Solaris Motorsport" from Italy). 40 fictional driver names with diverse nationalities.

---

### Group 2: Real data pipeline

#### US-202: Template data source integration
**As a** developer, **I want** API routes that translate view state (filters, sort, pagination) into Prisma queries, **so that** templates display real database results.

**Acceptance criteria:**
- [ ] AC-1: API routes in `packages/shell/src/app/api/workspace/data/`:
  - `GET /api/workspace/data/query` — table name, columns, filters (FilterNode), sort, pagination, search term → rows + total count + column metadata
  - `GET /api/workspace/data/aggregate` — table name, metric (count/sum/avg/min/max), group by, filters, time range, time resolution → aggregated results
  - `GET /api/workspace/data/schema` — table name → column names, types, nullable, foreign keys
- [ ] AC-2: FilterNode → Prisma `where` translation:
  - Include → `{ column: { in: values } }`
  - Exclude → `{ NOT: { column: { in: values } } }`
  - Regex → `{ column: { contains: pattern } }` (with `mode: 'insensitive'`)
  - Composite (AND/OR groups) → nested `{ AND: [...] }` / `{ OR: [...] }`
- [ ] AC-3: Sort → Prisma `orderBy` (multi-column)
- [ ] AC-4: Pagination → `skip`/`take` with `count()` for total
- [ ] AC-5: Global search → `OR` across string columns with `contains`
- [ ] AC-6: Aggregate with `groupBy` and `timeResolution` (daily/weekly/monthly bucketing on date fields)
- [ ] AC-7: Related data joins: race_results include driver + constructor names, pit_stops include driver name + tire compound display
- [ ] AC-8: All queries scoped to tenant. Query timeout: 10s. Results cached via TanStack Query (30s stale time).

---

#### US-203: Demo page configurations
**As a** developer, **I want** pre-configured F1 demo pages in the sidebar, **so that** the demo is immediately usable after seeding.

**Acceptance criteria:**
- [ ] AC-1: Seed creates 9 page configurations:

  | Page | Template | Key columns / config |
  |------|----------|---------------------|
  | Races | table-listing | Season, Round, Name, Circuit, Date, Winner (link), Pole (link), Weather badge, Safety cars, Laps. KPI strip: total races, wet races %, avg safety cars. |
  | Drivers | table-listing | Name (link to detail), Number, Nationality, Constructor, Championships, Wins, Podiums, Poles, Status badge. |
  | Constructors | table-listing | Name (link to detail), Nationality, Principal, Engine, Championships, Status badge. |
  | Championship | summary-dashboard | KPI cards: current leader + points, races completed, next race. Charts: driver points progression (line, top 5 drivers), constructor points (bar), wins by constructor (donut). Mini table: latest race results top 10. Time range: season picker. |
  | Driver Profile | multi-tab-detail | Header: driver name, number, nationality flag, constructor, championships. Tabs: Overview (stats grid + points chart), Race Results (sub-table: all results for this driver), Qualifying (sub-table), Penalties, Career Timeline (season-by-season). |
  | Lap Time Explorer | data-explorer | Default: average lap time by circuit, 2024 season, line chart. Controls: metric (avg lap time / fastest lap / pit stop duration), group by (circuit / driver / constructor / tire compound), time resolution (race-by-race / season). |
  | Race Report | form-page | Multi-step: select race → enter results (grid + finish for each driver) → incidents and penalties → review and submit. (Simulates race steward workflow.) |
  | Race Weekend | timeline-activity | Race events stream: practice sessions, qualifying, race start, pit stops, overtakes, penalties, safety cars, finish. Type-filtered. Per-race scoped. |
  | My Dashboard | dashboard | Pinned cards: next race (KPI), championship leader (KPI), season wins by constructor (chart), latest race top 10 (table). |

- [ ] AC-2: All pages appear in sidebar under PAGES section with appropriate Tabler icons
- [ ] AC-3: Click driver name in Races table → opens Driver Profile for that driver
- [ ] AC-4: Click race name in any table → opens Race Weekend timeline for that race
- [ ] AC-5: Zero additional config needed — pages work immediately after seed

---

#### US-204: Connect VastuTable to real data
**As a** user, **I want** tables to show real F1 records with server-side operations, **so that** I'm browsing actual race data.

**Acceptance criteria:**
- [ ] AC-1: `useVastuTable` calls `/api/workspace/data/query` instead of mocks
- [ ] AC-2: Server-side pagination: changing page fetches new data
- [ ] AC-3: Server-side sorting: column click sends `orderBy`
- [ ] AC-4: Server-side filtering: filter pills send FilterNode, API returns filtered results + updated count
- [ ] AC-5: Global search across string columns
- [ ] AC-6: Loading: TableSkeleton on first load, stale content with overlay on refetch
- [ ] AC-7: Error state with retry
- [ ] AC-8: TanStack Query caching (stale-while-revalidate, 30s)
- [ ] AC-9: Races table loads 25 rows in under 500ms with 110 races
- [ ] AC-10: Lap times table handles 65K rows with virtual scrolling + server-side pagination (never loads all into memory)

---

#### US-205: Connect VastuChart to real data
**As a** user, **I want** charts to render real aggregated F1 data, **so that** dashboards show actual championship trends.

**Acceptance criteria:**
- [ ] AC-1: VastuChart `dataSource` prop fetches from `/api/workspace/data/aggregate`
- [ ] AC-2: Championship dashboard KPIs: real total points, win counts, race count from database
- [ ] AC-3: Points progression chart: real cumulative points by driver after each race (line chart, top 5 drivers, discrete series palette)
- [ ] AC-4: Constructor wins chart: real win count per constructor (bar chart)
- [ ] AC-5: Lap time explorer: real average/fastest lap times grouped by circuit/driver/constructor
- [ ] AC-6: Sparklines on KPI cards: real data points (e.g., points per race for championship leader)
- [ ] AC-7: Delta calculation: "vs previous season" compares current season metrics to prior
- [ ] AC-8: Season picker on dashboard filters all charts and KPIs to selected season
- [ ] AC-9: Loading/error/empty states on all charts

---

#### US-206: Connect record drawer to real data
**As a** user, **I want** clicking a driver row to open their full profile with real career data.

**Acceptance criteria:**
- [ ] AC-1: Table row click passes real record ID to drawer
- [ ] AC-2: Driver detail drawer: real name, number, nationality, constructor, career stats from database
- [ ] AC-3: Race results tab: real results sub-table (VastuTable compact) — position, grid, points, status, fastest lap for every race
- [ ] AC-4: Qualifying tab: real Q1/Q2/Q3 times
- [ ] AC-5: Penalties tab: real penalties with race, lap, type, reason
- [ ] AC-6: History tab: audit events from seed data
- [ ] AC-7: Prev/next navigation based on current table sort
- [ ] AC-8: Drawer-to-panel promotion retains data connection

---

### Group 3: Row-level security

#### US-207: CASL-enforced query scoping
**As an** admin, **I want** database queries to respect role permissions.

**Acceptance criteria:**
- [ ] AC-1: Data API routes check CASL abilities: `ability.can('read', 'Race')` etc.
- [ ] AC-2: Conditional permissions inject into Prisma `where` (e.g., viewer can only see completed races, not scheduled)
- [ ] AC-3: Record drawer edit button checks `ability.can('update', subject)`
- [ ] AC-4: Builder mode checks `ability.can('configure', 'Page')`
- [ ] AC-5: API returns 403 for unauthorized access
- [ ] AC-6: Viewer: read all, cannot edit/delete/configure
- [ ] AC-7: Editor: read + edit, cannot delete or configure
- [ ] AC-8: Admin/builder: full access

---

### Group 4: Live updates

#### US-208: Server-Sent Events for workspace
**As a** user, **I want** dashboards and timelines to update when new data arrives.

**Acceptance criteria:**
- [ ] AC-1: SSE endpoint at `/api/workspace/events`
- [ ] AC-2: Event types: `record.created`, `record.updated`, `record.deleted`, `view.saved`, `config.changed`
- [ ] AC-3: Tenant-scoped events
- [ ] AC-4: Dashboard: re-fetches on relevant events (event-driven, not timer)
- [ ] AC-5: Timeline: new events appear at top without full reload
- [ ] AC-6: Table: "N new records" indicator above table (click to refresh — don't auto-refresh)
- [ ] AC-7: Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
- [ ] AC-8: Connection status in tray bar: green/amber/red dot

---

### Group 5: Infrastructure improvements

#### US-209: Workspace E2E in CI
**As a** developer, **I want** workspace E2E tests in CI.

**Acceptance criteria:**
- [ ] AC-1: GitHub Actions workflow `ci-workspace-e2e.yml`
- [ ] AC-2: Docker Compose (Postgres, Redis, Keycloak) as service containers
- [ ] AC-3: Seeds auth + demo data
- [ ] AC-4: Runs all workspace E2E specs
- [ ] AC-5: Playwright trace uploaded on failure
- [ ] AC-6: Total time under 10 minutes

---

#### US-210: Chart accessibility completion
**As a** keyboard user, **I want** to navigate chart data points.

**Acceptance criteria:**
- [ ] AC-1: Tab focuses chart container
- [ ] AC-2: ← → move between data points, showing tooltip
- [ ] AC-3: ↑ ↓ cycle between series at same x-position
- [ ] AC-4: Enter triggers drill-down action
- [ ] AC-5: Screen reader: chart type, data point label, value, series name
- [ ] AC-6: "View as table" on all chart types (not just explorer)
- [ ] AC-7: Works for line, bar, area, donut, scatter (sparklines exempt)

---

#### US-211: Cross-page navigation
**As a** user, **I want** to click a driver name in the races table and open their profile.

**Acceptance criteria:**
- [ ] AC-1: Link-type cells support `navigateTo` config: `{ template, recordId, pageId }`
- [ ] AC-2: Click opens target template in new Dockview panel with that record
- [ ] AC-3: ⌘+Click opens in new panel (same as Tab in command palette)
- [ ] AC-4: Breadcrumb: "← Back to Races" in the target panel
- [ ] AC-5: Works for: driver_id → Driver Profile, race_id → Race Weekend timeline, constructor_id → Constructor detail

---

### Group 6: Documentation

#### US-212: Phase 2A documentation
**As a** developer building on Vastu, **I want** docs on the data pipeline and demo setup.

**Acceptance criteria:**
- [ ] AC-1: Getting started updated: `pnpm prisma:seed --demo`, F1 demo walkthrough
- [ ] AC-2: Guide: "Connecting your data" — add Prisma model, page config, register in sidebar
- [ ] AC-3: Guide: "Page templates" — all 6 templates, when to use each, config options
- [ ] AC-4: Guide: "Builder mode" — all 8 config sections
- [ ] AC-5: API reference: `/api/workspace/data/query`, `/aggregate`, `/schema`
- [ ] AC-6: API reference: FilterNode type, IER modes, composite builder
- [ ] AC-7: Architecture: data flow diagram (database → API → TanStack Query → template → component)
- [ ] AC-8: ADR: data pipeline decisions (Prisma translation, SSE over WebSocket, tenant scoping)

---

## Technical constraints

- All queries through Prisma Client — no raw SQL.
- FilterNode → Prisma `where` translation is a pure function in `packages/shared` (unit-testable without DB).
- SSE uses native `ReadableStream` in Next.js route handlers — no extra libraries.
- Seed uses seeded PRNG — every run produces identical data.
- TanStack Query for all workspace data fetching.
- Driver and constructor names are fictional — avoid real F1 IP. Circuit names and countries can be real (they're geographic facts).
- Lap times table (65K rows) must never load entirely into memory client-side — always server-side paginated with virtual scroll for the visible window.

## Out of scope

- External database connections via configured connections (Phase 3)
- Workflow mode / React Flow canvas (Phase 2B)
- Agent panel / AG-UI / LangGraph (Phase 2B)
- MCP tools (Phase 2B)
- Hook execution engine (Phase 3)
- Real telemetry data (speed, throttle, brake — too granular for the demo)
- Multi-currency / internationalized number formats (single locale for now)
- File uploads on records (Phase 3)

## Definition of done

- [ ] All 13 user stories implemented with acceptance criteria met
- [ ] `pnpm prisma:seed --demo` generates 5 seasons of F1 data in under 45 seconds
- [ ] All 9 demo pages render with real data, no mocks remaining
- [ ] Races table loads 25 rows in under 500ms
- [ ] Lap times table handles 65K rows (server-side paginated, virtual scroll)
- [ ] Championship dashboard shows real points progression charts
- [ ] Lap time explorer groups by circuit/driver/constructor with correct aggregation
- [ ] Driver profile drawer shows real career stats and race results
- [ ] CASL permissions enforced on all data routes
- [ ] SSE connection active, dashboard updates on events
- [ ] Workspace E2E in CI with Docker stack, under 10 minutes
- [ ] Chart keyboard navigation for line, bar, area, donut, scatter
- [ ] Cross-page navigation: click driver → driver profile, click race → race weekend
- [ ] Fumadocs updated with data pipeline docs
- [ ] Unit test coverage ≥ 80% on new code
- [ ] Phase completion document produced

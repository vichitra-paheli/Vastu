# Phase 2A: Extension Points + F1 Demo -- Implementation Plan

> Produced: 2026-03-23
> Phase: 2A (Weeks 17-21)
> Prerequisite: Phase 1B complete (on branch `revert/phase-2a-old-plan` -- old 2A code reverted)
> GitHub issues: #375 through #392

---

## Table of contents

1. [Dependency graph and implementation waves](#1-dependency-graph-and-implementation-waves)
2. [Part 1: Framework extension points (US-200 through US-212)](#2-part-1-framework-extension-points)
3. [Part 2: F1 demo application (US-220 through US-224)](#3-part-2-f1-demo-application)
4. [Cross-cutting concerns](#4-cross-cutting-concerns)
5. [Risk assessment](#5-risk-assessment)
6. [Architecture Decision Records](#6-architecture-decision-records)

---

## 1. Dependency graph and implementation waves

### 1.1 Dependency graph

```
US-200 (scaffold) ---------> US-201 (Prisma composition) ---> US-220 (F1 schema) ---> US-221 (F1 seed)
                                                          ---> US-212 (docs)       ---> US-224 (F1 docs)

US-202 (query API) ---------> US-203 (aggregate API) -------> US-223 (F1 pages)
                   ---------> US-204 (introspection)  -------> US-223
                   ---------> US-208 (CASL scoping)   -------> US-223

US-205 (formatter registry) -> US-222 (F1 formatters) -------> US-223
US-206 (page registration)  ---------------------------------> US-223
US-207 (SSE)                ---------------------------------> US-223
US-209 (cross-page nav)     ---------------------------------> US-223
US-210 (chart keyboard)     (independent -- tech debt)
US-211 (workspace E2E CI)   (independent -- infrastructure)
```

### 1.2 Implementation waves

| Wave | Week | Stories | Theme |
|------|------|---------|-------|
| W1 | 17 | US-200, US-201, US-202, US-210, US-211 | Scaffold, schema composition, data query, tech debt |
| W2 | 18 | US-203, US-204, US-205, US-206 | Aggregate API, introspection, formatter registry, page registration |
| W3 | 19 | US-207, US-208, US-209, US-212 | SSE, CASL scoping, cross-page nav, framework docs |
| W4 | 20 | US-220, US-221, US-222 | F1 schema, seed data, formatters |
| W5 | 21 | US-223, US-224 | F1 pages, F1 docs |

### 1.3 Stories that can run in parallel

Within each wave, these groups can be worked concurrently:

- **W1:** US-200+US-201 (sequential), US-202 (parallel), US-210 (parallel), US-211 (parallel)
- **W2:** All four stories can run in parallel
- **W3:** US-207 + US-208 (parallel), US-209 (after US-206 from W2), US-212 (after most framework work)
- **W4:** US-220 first, then US-221 and US-222 in parallel
- **W5:** US-223 first, then US-224

---

## 2. Part 1: Framework extension points

---

### US-200: Application scaffold system [#386] [VASTU-2A-200]

**Goal:** `pnpm vastu:init <app-name>` creates a working application in `apps/<app-name>/`.

#### Subtask 200-1: Scaffold CLI script and templates

**Components to create:**
- `scripts/vastu-init.ts` (NEW) -- CLI entry point using Node.js `fs` and `path`
- `scripts/templates/app/package.json.tmpl` (NEW) -- depends on `@vastu/shell`, `@vastu/workspace`, `@vastu/shared`
- `scripts/templates/app/next.config.mjs.tmpl` (NEW)
- `scripts/templates/app/tsconfig.json.tmpl` (NEW) -- extends root tsconfig
- `scripts/templates/app/prisma/schema.prisma.tmpl` (NEW) -- base schema + domain placeholder section
- `scripts/templates/app/prisma/seed.ts.tmpl` (NEW) -- calls base seed then empty domain seed
- `scripts/templates/app/src/pages.ts.tmpl` (NEW) -- empty PageRegistry calls with example comment
- `scripts/templates/app/src/formatters.ts.tmpl` (NEW) -- empty FormatterRegistry calls with example comment
- `scripts/templates/app/README.md.tmpl` (NEW) -- getting started instructions
- `scripts/templates/app/src/app/layout.tsx.tmpl` (NEW) -- Next.js root layout importing shell/workspace
- `scripts/templates/app/src/app/page.tsx.tmpl` (NEW) -- redirects to /workspace
- `scripts/templates/app/src/app/workspace/page.tsx.tmpl` (NEW) -- renders WorkspaceShell

**Database changes:** None.

**API/MCP surface:** None.

**State management:** N/A.

**Component hierarchy:** N/A (CLI tool, no UI).

**Design system mapping:** N/A.

**Edge cases:**
- App name already exists in `apps/` -- abort with clear error message
- Invalid app name (spaces, special chars) -- validate as valid npm/directory name
- Run from wrong directory -- detect monorepo root by checking for `pnpm-workspace.yaml`
- `apps/` directory does not exist yet -- create it automatically

**Testing strategy:**
- Unit test: template variable substitution logic
- Integration test: run `vastu:init test-app`, verify file structure matches AC-1
- Integration test: `pnpm typecheck --filter=@app/test-app` passes on the generated scaffold

**Estimated complexity:** M (~250 lines for script + templates)

#### Subtask 200-2: Monorepo workspace integration

**Components to modify:**
- `pnpm-workspace.yaml` -- add `"apps/*"` to packages list
- `package.json` (root) -- add `"vastu:init": "tsx scripts/vastu-init.ts"` to scripts
- `turbo.json` -- no change needed (apps are auto-included as workspace members)

**Edge cases:**
- `apps/*` already in workspace yaml -- skip (idempotent)
- Multiple apps coexist: verify `pnpm dev --filter=@app/demo-f1` starts only that app

**Testing strategy:** E2E: scaffold two apps, verify both build independently.

**Estimated complexity:** S (~30 lines)

---

### US-201: Prisma schema composition [#375] [VASTU-2A-201]

**Goal:** Apps extend the base schema with domain tables; migrations and seeds run per-app.

#### Subtask 201-1: Extract base schema template

**Components to create:**
- `packages/shared/prisma/base-schema.prisma` (NEW) -- copy of current `packages/shared/src/prisma/schema.prisma` contents, to be used as a template source by `vastu:init`

The existing `packages/shared/src/prisma/schema.prisma` remains the canonical framework schema and is NOT modified.

**Database changes:** None.

**Edge cases:**
- Base schema drifts from actual shared schema over time -- add CI check that verifies the two stay in sync (diff the model names)

**Testing strategy:**
- Unit test: verify base-schema.prisma contains all expected model names from the shared schema
- CI check: automated comparison

**Estimated complexity:** S (~50 lines)

#### Subtask 201-2: Base seed extraction and per-app seed composition

**Components to create:**
- `packages/shared/src/prisma/baseSeed.ts` (NEW) -- extracts the core seed logic from current `seed.ts` into a reusable `runBaseSeed(prisma: PrismaClient): Promise<void>` function

**Components to modify:**
- `packages/shared/src/prisma/seed.ts` -- refactor to call `runBaseSeed()` internally (no behavior change for existing `prisma:seed` command)
- `packages/shared/src/prisma/index.ts` -- export `runBaseSeed`
- Root `package.json` -- modify `prisma:seed` to accept optional `--app=<name>` flag or add `prisma:seed:demo` convenience script

**Database changes:** None.

**Edge cases:**
- Running seed twice is idempotent (base seed already uses upsert pattern via deterministic UUIDs)
- App seed receives a Prisma client that knows both base AND domain tables (app's own generated client)

**Testing strategy:**
- Integration test: call `runBaseSeed()`, verify standard users/roles/org created
- Determinism test: run twice, verify no errors or duplicate rows

**Estimated complexity:** M (~120 lines)

#### Subtask 201-3: Documentation -- "Extending the schema" guide

**Components to create:**
- `packages/docs/content/docs/extensions/extending-schema.mdx` (NEW) -- US-201 AC-6
- `packages/docs/content/docs/extensions/meta.json` (NEW) -- section metadata for Fumadocs

**Estimated complexity:** S (~80 lines)

---

### US-202: Data query API [#376] [VASTU-2A-202]

**Goal:** Generic query route that works with any Prisma table.

#### Subtask 202-0: Move FilterNode types to shared (prerequisite)

The `FilterNode`, `FilterCondition`, `FilterGroup`, `FilterMode`, `DataType`, `FilterValue`, `NumberRangeValue`, `DateRangeValue` types currently live in `packages/workspace/src/components/FilterSystem/types.ts`. The data engine in `packages/shared` needs these types for the filter translator, but `shared` must not depend on `workspace`.

**WARNING -- HUMAN DECISION NEEDED:** Options for type location:
1. **(Recommended)** Move filter type *definitions* to `packages/shared/src/data-engine/filterTypes.ts`. Re-export them from `packages/workspace/src/components/FilterSystem/types.ts` so workspace consumers are unaffected. Helper functions (`createRootGroup`, `createCondition`, etc.) stay in workspace since they have no server-side use.
2. Duplicate the types in shared (simple but divergence risk).
3. Have shared depend on workspace (violates architecture -- shared is the dependency root).

**Components to create:**
- `packages/shared/src/data-engine/filterTypes.ts` (NEW) -- canonical location for `FilterNode`, `FilterCondition`, `FilterGroup`, `FilterMode`, `DataType`, `FilterValue`, `NumberRangeValue`, `DateRangeValue`

**Components to modify:**
- `packages/workspace/src/components/FilterSystem/types.ts` -- change to re-export from `@vastu/shared/data-engine`; keep helper functions locally
- `packages/shared/src/data-engine/index.ts` (NEW) -- re-export filter types

**Estimated complexity:** S (~60 lines, mostly moving + re-exporting)

#### Subtask 202-1: FilterNode-to-Prisma where translator

**Components to create:**
- `packages/shared/src/data-engine/filterTranslator.ts` (NEW) -- pure function `translateFilter(node: FilterNode): PrismaWhere`
- `packages/shared/src/data-engine/__tests__/filterTranslator.test.ts` (NEW)

**Key logic per AC-2:**
- Include (text/enum with string[]): `{ column: { in: values } }`
- Exclude (text/enum with string[]): `{ NOT: { column: { in: values } } }`
- Regex (text): `{ column: { contains: pattern, mode: 'insensitive' } }`
- AND groups: `{ AND: [...children...] }`
- OR groups: `{ OR: [...children...] }`
- Number range (include): `{ column: { gte: min, lte: max } }`
- Date range (include): `{ column: { gte: start, lte: end } }`
- Boolean: `{ column: value }`

**Edge cases:**
- Empty children array in group -- return empty object (no filter)
- Nested relation filters (e.g., `driver.name`) -- split on `.` and nest Prisma where
- Null/undefined values in filter -- skip that condition
- Invalid regex pattern in regex mode -- throw validation error

**Testing strategy:**
- Unit tests for every mode combination: include/exclude/regex x text/enum/number/date/boolean
- Nesting tests: 2-level and 3-level deep groups
- Edge case tests: empty group, single condition, mixed AND/OR
- Target: 15+ test cases

**Estimated complexity:** M (~200 lines for translator + 200 lines for tests)

#### Subtask 202-2: Sort translator

**Components to create:**
- `packages/shared/src/data-engine/sortTranslator.ts` (NEW) -- `translateSort(specs: SortSpec[]): PrismaOrderBy`
- `packages/shared/src/data-engine/__tests__/sortTranslator.test.ts` (NEW)

**Key logic per AC-3:**
- Single column: `[{ column: 'asc' }]`
- Multi-column: `[{ col1: 'asc' }, { col2: 'desc' }]`
- Nested relation: `driver.name` -> `{ driver: { name: 'asc' } }`

**Estimated complexity:** S (~80 lines + tests)

#### Subtask 202-3: Global search translator

**Components to create:**
- `packages/shared/src/data-engine/searchTranslator.ts` (NEW) -- `buildSearchWhere(term: string, stringColumns: string[]): PrismaWhere`

**Key logic per AC-5:**
- Build `{ OR: [{ col1: { contains: term, mode: 'insensitive' } }, { col2: ... }, ...] }` for all string columns in the model
- String columns determined from DMMF field metadata

**Estimated complexity:** S (~60 lines)

#### Subtask 202-4: Data engine types and response shape

**Components to create:**
- `packages/shared/src/data-engine/types.ts` (NEW) -- `DataQueryRequest`, `DataQueryResponse<T>`, `ColumnMeta`, `SortSpec`

**Types per AC-6 and AC-7:**
```typescript
interface DataQueryResponse<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  columns: ColumnMeta[];
}

interface ColumnMeta {
  name: string;
  type: 'String' | 'Int' | 'Float' | 'DateTime' | 'Boolean' | 'Enum';
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  relatedModel?: string;
}
```

**Estimated complexity:** S (~60 lines)

#### Subtask 202-5: Data query API route

**Components to create:**
- `packages/shell/src/app/api/workspace/data/query/route.ts` (NEW) -- GET handler

**Key logic:**
1. Parse query parameters: `table`, `columns`, `filters` (JSON), `sort` (JSON), `pagination` (JSON), `search`, `include`
2. Validate `table` name against Prisma DMMF model list (AC-9 defense)
3. Build Prisma where clause: combine `translateFilter(filters)` + `buildSearchWhere(search)` + tenant scope `{ tenantId: session.tenantId }`
4. Build Prisma orderBy via `translateSort(sort)`
5. Execute `prisma[table].findMany({ where, orderBy, skip, take, select, include })` and `prisma[table].count({ where })` in parallel (AC-4)
6. Build `ColumnMeta[]` from DMMF for the table
7. Apply 10s query timeout via `Promise.race` with timeout promise (AC-8)
8. Return `DataQueryResponse` shape (AC-6)

**Components to modify:**
- `packages/shared/src/index.ts` -- add `export * from './data-engine'`

**Edge cases:**
- Table name not in Prisma models -- 400 "Unknown table"
- No session / unauthenticated -- 401
- Query timeout (>10s) -- 504 "Query timeout exceeded"
- Relation includes that don't exist on model -- 400
- Pagination page beyond total -- return empty `rows` with correct `total`
- `columns` array empty -- select all fields
- Table lacks `tenantId` field -- skip tenant scoping for that table (framework tables like Organization)

**Testing strategy:**
- Unit test: request parsing and validation
- Unit test: tenant injection logic
- Integration test: query against test DB with seeded data -- verify filter, sort, pagination, search all work together
- Integration test: verify 504 on slow query (mock)

**Estimated complexity:** L (~350 lines)

---

### US-203: Data aggregate API [#381] [VASTU-2A-203]

**Goal:** Generic aggregate route for charts and KPIs.

#### Subtask 203-1: Aggregate builder utility

**Components to create:**
- `packages/shared/src/data-engine/aggregateBuilder.ts` (NEW) -- builds Prisma `aggregate()`/`groupBy()` queries
- `packages/shared/src/data-engine/timeBucket.ts` (NEW) -- raw SQL wrapper for `date_trunc()` (Postgres)
- `packages/shared/src/data-engine/__tests__/aggregateBuilder.test.ts` (NEW)

**Key logic:**
- Simple aggregates (no groupBy, no timeField): use Prisma `aggregate()` with `_count`/`_sum`/`_avg`/`_min`/`_max`
- Grouped aggregates (groupBy, no timeField): use Prisma `groupBy()` with `by` and aggregate functions
- Time-bucketed aggregates (timeField + timeResolution): use raw SQL `SELECT date_trunc($1, $2) AS bucket, $metric FROM $table WHERE ... GROUP BY bucket ORDER BY bucket` -- this is the ONE sanctioned raw SQL exception per requirements AC-2
- Multi-series (groupBy + timeField): nest raw query with additional GROUP BY dimension
- Delta calculation (`comparePrevious: true`): compute prior period range, run same query, return `{ current, previous }` per AC-5

**Response shapes per AC-3/AC-4:**
```typescript
// Simple/grouped:
{ data: { label: string; value: number }[]; total: number }

// Multi-series:
{ series: { name: string; data: { label: string; value: number }[] }[] }
```

**Edge cases:**
- `metric=sum` or `avg` on non-numeric field -- 400
- `groupBy` on non-existent column -- 400
- Empty result set -- `{ data: [], total: 0 }`
- `timeResolution` without `timeField` -- 400
- NULL values in aggregated field -- excluded from sum/avg (Postgres default behavior)

**Testing strategy:**
- Unit test: aggregate builder output for each metric type
- Unit test: time bucket SQL generation
- Integration test: aggregate against seeded data, verify counts

**Estimated complexity:** L (~350 lines)

#### Subtask 203-2: Aggregate API route

**Components to create:**
- `packages/shell/src/app/api/workspace/data/aggregate/route.ts` (NEW) -- GET handler

**Key logic:**
1. Parse params: `table`, `metric`, `field`, `groupBy`, `timeField`, `timeResolution`, `filters`, `timeRange`
2. Validate table against DMMF
3. Call `scopeQuery()` (from US-208) for tenant/permission scoping
4. Call `aggregateBuilder` to construct and execute query
5. Tenant-scoped, 10s timeout

**Estimated complexity:** M (~200 lines)

---

### US-204: Schema introspection API [#382] [VASTU-2A-204]

**Goal:** Return schema metadata for any table via Prisma DMMF.

#### Subtask 204-1: Schema introspector utility

**Components to create:**
- `packages/shared/src/data-engine/schemaIntrospector.ts` (NEW) -- reads `Prisma.dmmf.datamodel.models`, returns typed metadata

**Key logic per AC-1:**
- Model-level: name
- Fields: `{ name, type, isRequired, isId, isForeignKey, relatedModel, enumValues }`
- Relations: `{ name, type (hasOne/hasMany), relatedModel, foreignKey }`

Per AC-3: cache in module-level `Map<string, ModelSchema>` (schema is immutable at runtime).

**Estimated complexity:** M (~150 lines)

#### Subtask 204-2: Schema introspection API route

**Components to create:**
- `packages/shell/src/app/api/workspace/data/schema/route.ts` (NEW) -- GET handler, `?table=<name>`

**Edge cases:**
- Unknown table name -- 404
- Enum fields -- include all enum values from DMMF
- No authentication needed? Per AC-4 this is used by builder mode -- still require session.

**Testing strategy:**
- Unit test: introspector output for `User`, `Organization` models
- Integration test: hit API, verify response shape

**Estimated complexity:** S (~80 lines)

---

### US-205: Custom cell formatter registry [#377] [VASTU-2A-205]

**Goal:** Register custom display formatters for VastuTable cells and VastuChart labels.

#### Subtask 205-1: FormatterRegistry class and types

**Components to create:**
- `packages/workspace/src/formatters/types.ts` (NEW):
  ```typescript
  interface FormatterDefinition {
    render: (value: unknown, row?: Record<string, unknown>) => React.ReactNode;
    sort?: (a: unknown, b: unknown) => number;
    export?: (value: unknown) => string;
    filter?: React.ComponentType<{ value: unknown; onChange: (v: unknown) => void }>;
  }
  ```
- `packages/workspace/src/formatters/registry.ts` (NEW) -- `FormatterRegistry` class with:
  - `register(name: string, def: FormatterDefinition): void`
  - `get(name: string): FormatterDefinition | undefined`
  - `getAll(): Map<string, FormatterDefinition>`
  - `has(name: string): boolean`
- `packages/workspace/src/formatters/index.ts` (NEW)

**Estimated complexity:** S (~80 lines)

#### Subtask 205-2: Built-in formatter pre-registration

**Components to create:**
- `packages/workspace/src/formatters/builtins.ts` (NEW) -- pre-registers: text, number, currency, date, relativeDate, badge, avatar, boolean, link, monospace

**Key logic per AC-4:** Built-in formatters registered at module load. Each implements at minimum `render` and `export`. Sort functions provided for non-trivial types (date, currency).

**Estimated complexity:** M (~200 lines)

#### Subtask 205-3: VastuTable and VastuChart integration

**Components to modify:**
- `packages/workspace/src/components/VastuTable/types.ts` -- add `displayType?: string` to `VastuColumn` interface (AC-2)
- `packages/workspace/src/components/VastuTable/VastuTableCell.tsx` -- modify `renderCellContent()`: check `FormatterRegistry.get(col.displayType)` first; if found, call `formatter.render(value, row)`; otherwise fall back to existing `dataType` switch (AC-2, AC-6)
- `packages/workspace/src/components/VastuChart/ChartTooltip.tsx` -- use formatter's `render` for value display if a formatter name is provided (AC-3)
- `packages/workspace/src/components/BuilderPanel/sections/FieldConfigSection.tsx` -- modify `DISPLAY_TYPES` array to also include custom formatters from `FormatterRegistry.getAll()` (AC-4 of US-222)

**Components to modify (exports):**
- `packages/workspace/src/index.ts` -- export `FormatterRegistry`, `FormatterDefinition`

**Edge cases:**
- Unknown `displayType` -- fall back to `text` formatter, emit `console.warn()` (AC-6)
- Formatter `render` returns null -- show dash "---" in `--v-text-tertiary`
- Registering same name twice -- allow override (apps may want to customize built-ins), no error

**Testing strategy:**
- Unit test: register/get/getAll, unknown name returns undefined
- Component test: VastuTableCell renders registered custom formatter
- Component test: fallback to text when formatter not found + console.warn

**Estimated complexity:** M (~150 lines of modifications)

#### Subtask 205-4: Documentation -- "Custom formatters" guide

**Components to create:**
- `packages/docs/content/docs/extensions/custom-formatters.mdx` (NEW)

**Estimated complexity:** S (~60 lines)

---

### US-206: Application page registration [#378] [VASTU-2A-206]

**Goal:** Apps register domain pages from code; pages appear in sidebar without modifying framework.

#### Subtask 206-1: PageRegistry class

**Components to create:**
- `packages/workspace/src/pages/types.ts` (NEW):
  ```typescript
  interface StaticPageDefinition {
    id: string;
    name: string;
    icon: string;        // Tabler icon name
    template: TemplateType;
    section: 'PAGES';    // always PAGES for app-registered
    order: number;       // sidebar sort order
    config: Record<string, unknown>;  // initial TemplateConfig
  }
  ```
- `packages/workspace/src/pages/registry.ts` (NEW) -- `PageRegistry` class:
  - `register(def: StaticPageDefinition): void`
  - `getStaticPages(): StaticPageDefinition[]` (sorted by order)
  - `getPageById(id: string): StaticPageDefinition | undefined`
  - `clear(): void` (for tests)
- `packages/workspace/src/pages/index.ts` (NEW) -- re-exports

NOTE: This is a new `pages/` directory under workspace `src/`. It is distinct from the existing `panels/registry.ts` (which manages Dockview panel types, not page definitions).

**Components to modify:**
- `packages/workspace/src/index.ts` -- export `PageRegistry`, `StaticPageDefinition`

**Estimated complexity:** M (~120 lines)

#### Subtask 206-2: Sidebar integration -- merge static and dynamic pages

**Components to modify:**
- `packages/workspace/src/components/SidebarNav/SidebarNav.tsx`:
  - Remove import of `MOCK_PAGES` from `./mockPages`
  - Replace with `PageRegistry.getStaticPages()` for static pages
  - Add data fetching (TanStack Query) for dynamic pages from DB (GET `/api/workspace/pages`)
  - Merge: static pages first, subtle `--v-border-subtle` divider, then dynamic pages (AC-6)
  - Static pages show a small "System" badge in builder mode (AC-5)
  - Update icon resolution to map Tabler icon names dynamically instead of hardcoded `PAGE_ICONS` map
- DELETE `packages/workspace/src/components/SidebarNav/mockPages.ts`

**Components to modify (command palette integration, AC-3):**
- `packages/workspace/src/hooks/useCommandPaletteActions.ts` -- include `PageRegistry.getStaticPages()` in command palette results alongside existing page sources

**Design system mapping:**
- Sidebar: Style Guide SS9.3 (SidebarNav component)
- Divider between static/dynamic: `--v-border-subtle` per Style Guide SS1.1
- "System" badge: `Badge` component per Style Guide SS9.1, `--v-accent-secondary` background

**Edge cases:**
- No static pages registered and no dynamic pages -- PAGES section shows empty state (Patterns Library SS8)
- Static page ID collides with dynamic DB page ID -- static wins, dynamic config overrides static config
- Page marked as deleted in DB (`deletedAt` not null) -- excluded from sidebar

**Testing strategy:**
- Component test: register 3 static pages, verify sidebar renders them in order
- Component test: verify "System" badge appears on static pages
- Component test: verify divider between static and dynamic pages
- Component test: verify command palette includes registered pages

**Estimated complexity:** M (~200 lines of modifications)

#### Subtask 206-3: Documentation -- "Registering pages" guide

**Components to create:**
- `packages/docs/content/docs/extensions/registering-pages.mdx` (NEW)

**Estimated complexity:** S (~60 lines)

---

### US-207: Server-Sent Events infrastructure [#383] [VASTU-2A-207]

**Goal:** Generic SSE system for live dashboard and timeline updates.

#### Subtask 207-1: Event types and in-process event bus

**Components to create:**
- `packages/shared/src/data-engine/eventTypes.ts` (NEW) -- event type definitions:
  ```typescript
  type WorkspaceEventType = 'record.created' | 'record.updated' | 'record.deleted' | 'view.saved' | 'config.changed';

  interface WorkspaceEvent {
    type: WorkspaceEventType;
    table: string;
    recordId?: string;
    tenantId: string;
    timestamp: string;
    payload?: Record<string, unknown>;
  }
  ```
- `packages/shared/src/data-engine/events.ts` (NEW) -- `emitWorkspaceEvent()` function + in-process event bus using Node.js `EventEmitter`

**WARNING -- HUMAN DECISION NEEDED:** Event bus implementation for Phase 2A:
- **Option A (recommended):** Node.js `EventEmitter` (in-process only). Simple, no external deps, works for single-server deployment.
- **Option B:** Redis pub/sub (multi-server). Redis is already in the Docker stack but adds transport complexity.

Recommendation: Option A for Phase 2A. The `emitWorkspaceEvent()` API is transport-agnostic; switching to Redis pub/sub in Phase 3 requires no consumer changes.

**Estimated complexity:** S (~100 lines)

#### Subtask 207-2: SSE endpoint

**Components to create:**
- `packages/shell/src/app/api/workspace/events/route.ts` (NEW) -- GET handler using Next.js `ReadableStream`

**Key logic:**
- Create `ReadableStream` with `ReadableStreamDefaultController`
- Subscribe to event bus, filter events by `tenantId` from authenticated session (AC-4)
- Serialize events as SSE format: `data: {json}\n\n`
- On client disconnect (stream cancel), clean up subscription
- Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`

**Edge cases:**
- No session -- 401
- Server restart -- clients reconnect automatically (handled client-side)
- Event bus has no subscribers -- events are simply dropped

**Testing strategy:**
- Integration test: emit event, read from SSE endpoint, verify event received
- Unit test: tenant filtering logic

**Estimated complexity:** M (~150 lines)

#### Subtask 207-3: Client-side SSE hook with auto-reconnect

**Components to create:**
- `packages/workspace/src/hooks/useWorkspaceEvents.ts` (NEW) -- `useWorkspaceEvents(callback: (event: WorkspaceEvent) => void)` hook:
  - Connects to `/api/workspace/events` via `EventSource`
  - Auto-reconnect with exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s (AC-9)
  - Tracks connection state: `connected`, `reconnecting`, `disconnected`
  - Pauses reconnection when browser tab is hidden, resumes on visibility
  - Calls `callback` with parsed `WorkspaceEvent` on each message

**Components to modify:**
- `packages/workspace/src/index.ts` -- export `useWorkspaceEvents`

**Estimated complexity:** M (~180 lines)

#### Subtask 207-4: SSE status indicator in tray bar

**Components to create:**
- `packages/workspace/src/components/SSEStatusIndicator/SSEStatusIndicator.tsx` (NEW) -- small dot in tray bar showing connection status
- `packages/workspace/src/components/SSEStatusIndicator/SSEStatusIndicator.module.css` (NEW)
- `packages/workspace/src/components/SSEStatusIndicator/index.ts` (NEW)

**Components to modify:**
- `packages/workspace/src/components/TrayBar/index.ts` -- include SSEStatusIndicator

**Design system mapping:**
- Green dot: `--v-status-success` (connected) per Style Guide SS1.3
- Amber dot: `--v-accent-tertiary` (reconnecting)
- Red dot: `--v-status-error` (disconnected)
- Dot size: 8px, `--v-radius-pill`

**Estimated complexity:** S (~80 lines)

#### Subtask 207-5: TanStack Query cache invalidation on SSE events

**Components to create:**
- `packages/workspace/src/hooks/useEventInvalidation.ts` (NEW) -- wraps `useWorkspaceEvents`, calls `queryClient.invalidateQueries()` based on event type/table

**Components to modify:**
- `packages/workspace/src/providers/WorkspaceProviders.tsx` -- wire up `useEventInvalidation` at provider level

**Key logic per AC-6:**
- `record.created` / `record.updated` / `record.deleted` for table X -- invalidate queries keyed with `['data', 'query', X]` and `['data', 'aggregate', X]`
- Debounce invalidation: 300ms (rapid-fire events during bulk operations)

**Edge cases:**
- Event for unknown table -- ignore silently
- Component unmounted during debounce -- cancel timer in cleanup

**Testing strategy:**
- Unit test: verify correct query keys invalidated per event type
- Unit test: debouncing behavior

**Estimated complexity:** S (~80 lines)

---

### US-208: CASL query scoping middleware [#384] [VASTU-2A-208]

**Goal:** Database queries automatically respect role permissions.

#### Subtask 208-1: scopeQuery function

**Components to create:**
- `packages/shared/src/data-engine/caslScope.ts` (NEW):
  ```typescript
  function scopeQuery(
    ability: AppAbility,
    action: string,
    table: string,
    existingWhere: Record<string, unknown>
  ): Record<string, unknown>
  ```
- `packages/shared/src/data-engine/__tests__/caslScope.test.ts` (NEW) -- exhaustive tests

**WARNING -- HUMAN DECISION NEEDED:** The CASL `Resource` type in `packages/shared/src/permissions/resources.ts` is a fixed union of string literals (`'User' | 'Role' | ... | 'all'`). Domain tables (Race, Driver, etc.) are not in this list. Options:
1. **Use `Record` resource for all domain data** -- simpler, less granular (viewer can read all or none)
2. **Make resource list extensible** -- apps register new resources
3. **(Recommended)** Use Prisma model name as CASL subject string. The `scopeQuery` function accepts `string` (not `Resource`), and CASL's `createMongoAbility` supports arbitrary strings. The existing `Resource` type remains for framework-level checks; domain checks use raw strings.

**Key logic:**
- If `ability.cannot(action, table)` entirely (no rules matching) -- throw 403 Forbidden (AC-4)
- Extract conditions from matching rules via `ability.relevantRuleFor(action, table)` -- merge conditions into Prisma where clause (AC-5)
- Admin (`manage` + `all`) -- return `existingWhere` unchanged (no scoping)
- Viewer with conditional read (e.g., `can('read', 'Race', { status: 'Completed' })`) -- inject `{ status: 'Completed' }` into where (AC-5)

**Components to modify:**
- `packages/shell/src/app/api/workspace/data/query/route.ts` -- call `scopeQuery()` before executing query (AC-2)
- `packages/shell/src/app/api/workspace/data/aggregate/route.ts` -- call `scopeQuery()` before aggregating (AC-3)

**Edge cases:**
- Multiple conditional rules for same table -- AND them together
- Rule with complex nested conditions -- flatten to Prisma where
- Table not mentioned in any CASL rule -- 403

**Testing strategy:**
- Unit test: exhaustive matrix -- admin/builder/editor/viewer x read/create/update/delete x each system table (AC-8)
- Unit test: conditional permission injection
- Unit test: 403 for completely denied access
- Integration test: viewer user hits query API for admin-only table, gets 403

**Estimated complexity:** M (~200 lines + 200 lines tests)

#### Subtask 208-2: Documentation -- "Permissions and scoping" guide

**Components to create:**
- `packages/docs/content/docs/extensions/permissions-scoping.mdx` (NEW)

**Estimated complexity:** S (~70 lines)

---

### US-209: Cross-page navigation system [#385] [VASTU-2A-209]

**Goal:** Table cells as links that open another page template in a new panel.

#### Subtask 209-1: NavigateTo column config and LinkCell renderer

**Components to modify:**
- `packages/workspace/src/components/VastuTable/types.ts` -- add to `VastuColumn`:
  ```typescript
  navigateTo?: {
    pageId: string;
    recordId: string;  // template: '{value}' replaced with cell value
  };
  ```

**Components to create:**
- `packages/workspace/src/components/VastuTable/LinkCell.tsx` (NEW) -- renders clickable text:
  - Left-click: open target page panel with record ID pre-loaded (AC-2)
  - Cmd/Ctrl+Click: open in new split panel (AC-3)
  - Hover on non-existent pageId: tooltip "Page not configured" (AC-7)
  - Styled with `--v-accent-primary` color, underline on hover (Style Guide SS1.2)

**Components to modify:**
- `packages/workspace/src/components/VastuTable/VastuTableCell.tsx` -- detect `navigateTo` config on column, render `LinkCell` instead of plain formatter
- `packages/workspace/src/stores/panelStore.ts` -- add `openPageWithRecord(pageId: string, recordId: string)` action that opens a Dockview panel for the target page with params

**Design system mapping:**
- Link cells: Patterns Library SS1.8 (link display type) + Principle 01 (everything is addressable)
- Context menu per Patterns Library SS5.1: "Open", "Open in new panel", "Copy link" (AC-6)

**Edge cases:**
- `navigateTo.pageId` not registered in PageRegistry AND not in DB pages -- show tooltip on hover (AC-7)
- Record ID template `{value}` when cell value is null -- link disabled, show plain text
- Keyboard: Enter on focused link cell triggers navigation (AC-5 compatible)

**Testing strategy:**
- Component test: click LinkCell, verify `openPageWithRecord` called with correct pageId and recordId
- Component test: Cmd+Click opens in new panel
- Component test: tooltip appears for non-existent pageId
- Component test: context menu items present

**Estimated complexity:** M (~200 lines)

#### Subtask 209-2: Breadcrumb back-link in target panel

**Components to create:**
- `packages/workspace/src/components/DockviewHost/PanelBreadcrumb.tsx` (NEW) -- renders "< Back to {source page}" link above panel content

**Components to modify:**
- `packages/workspace/src/stores/panelStore.ts` -- track `sourcePageId` and `sourcePageName` per panel in panel params
- `packages/workspace/src/components/DockviewHost/PanelTab.tsx` -- render `PanelBreadcrumb` when panel has a `sourcePageId`

**Design system mapping:**
- Breadcrumbs: Style Guide SS9.1 (`Breadcrumbs` Mantine component)
- Link color: `--v-accent-primary`

**Testing strategy:**
- Component test: verify breadcrumb appears when panel has source
- Component test: clicking breadcrumb closes current panel and focuses source

**Estimated complexity:** S (~100 lines)

---

### US-210: Chart keyboard accessibility [#379] [VASTU-2A-210]

**Goal:** Keyboard navigation for chart data points. (Reverted code, redo.)

#### Subtask 210-1: Chart keyboard navigation hook

**Components to create:**
- `packages/workspace/src/components/VastuChart/useChartKeyboard.ts` (NEW):
  - State: `focusedPointIndex`, `focusedSeriesIndex`
  - Left/Right arrows: move `focusedPointIndex` (AC-2)
  - Up/Down arrows: cycle `focusedSeriesIndex` at same X position (AC-3)
  - Enter: trigger drill-down (AC-4)
  - Returns: `{ focusedPointIndex, focusedSeriesIndex, handlers, ariaProps }`

**Key logic:**
- For donut charts: Left/Right cycle through segments (no X axis)
- For scatter charts: Left/Right move through data points sorted by X value
- Sparklines exempt (AC-7)

**Testing strategy:**
- Unit test: state transitions for all arrow key combinations
- Unit test: boundary conditions (first/last data point wrap-around)

**Estimated complexity:** M (~150 lines)

#### Subtask 210-2: VastuChart integration and "View as table" toggle

**Components to modify:**
- `packages/workspace/src/components/VastuChart/VastuChart.tsx`:
  - Integrate `useChartKeyboard` hook
  - Add `tabIndex={0}` on chart container (AC-1)
  - Add `role="img"` and `aria-label` describing chart type + data summary (AC-5)
  - Add "View as table" toggle button in chart header (AC-6)
  - Pass `activeIndex` to `ChartRenderer` for tooltip display at focused point
- `packages/workspace/src/components/VastuChart/ChartRenderer.tsx` -- accept `activeIndex` prop, set Recharts `activeIndex` for focused tooltip display

**Components to create:**
- `packages/workspace/src/components/VastuChart/ChartDataTable.tsx` (NEW) -- accessible table fallback rendering chart data using VastuTable (AC-6)

**Design system mapping:**
- Patterns Library SS3.6 (chart accessibility)
- "View as table" toggle: `IconTable` icon button in chart header per Style Guide SS8.4
- Screen reader: chart type, data point label, value, series name (AC-5)

**Edge cases:**
- Empty chart -- keyboard nav does nothing
- Chart with single data point -- arrows do nothing
- `prefers-reduced-motion` -- still allow keyboard nav, just no animation on focus change

**Testing strategy:**
- Component test: Tab focuses chart, arrow keys move focus
- Component test: Enter triggers drill-down
- Component test: "View as table" renders VastuTable with chart data
- Accessibility audit: screen reader announces correct information
- Test all chart types: line, bar, area, donut, scatter (AC-7)

**Estimated complexity:** M (~250 lines across modifications and new files)

---

### US-211: Workspace E2E in CI [#380] [VASTU-2A-211]

**Goal:** GitHub Actions workflow for workspace E2E tests. (Reverted code, redo.)

#### Subtask 211-1: CI workflow file

**Components to create:**
- `d:/Vastu/.github/workflows/ci-workspace-e2e.yml` (NEW)

**Key structure:**
```yaml
name: CI — Workspace E2E
on:
  pull_request:
    paths:
      - 'packages/workspace/**'
      - 'packages/shell/**'
      - 'packages/shared/**'

jobs:
  workspace-e2e:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16, env: ... }
      redis: { image: redis:7 }
      keycloak: { image: quay.io/keycloak/keycloak:24 }
    steps:
      - checkout
      - setup-node + pnpm
      - install deps
      - build packages
      - prisma migrate + seed
      - install Playwright browsers
      - run workspace E2E specs
      - upload Playwright trace on failure (AC-5)
    timeout-minutes: 10  # AC-6
```

**Edge cases:**
- Keycloak startup takes time -- add health check wait loop (up to 60s)
- Playwright browser install cache -- use GH Actions cache
- Flaky tests -- Playwright retry config (max 2 retries)

**Testing strategy:** Run workflow on a test branch PR.

**Estimated complexity:** M (~150 lines YAML)

---

### US-212: Framework extension documentation [#387] [VASTU-2A-212]

**Goal:** 7 guides + API reference + architecture diagram + ADRs.

#### Subtask 212-1: Extension guides (7 pages)

**Components to create:**
- `packages/docs/content/docs/extensions/getting-started.mdx` (NEW) -- AC-1
- `packages/docs/content/docs/extensions/extending-schema.mdx` (created in US-201 subtask 201-3)
- `packages/docs/content/docs/extensions/registering-pages.mdx` (created in US-206 subtask 206-3)
- `packages/docs/content/docs/extensions/custom-formatters.mdx` (created in US-205 subtask 205-4)
- `packages/docs/content/docs/extensions/data-engine.mdx` (NEW) -- AC-5: query API, aggregate API, FilterNode, TanStack Query integration
- `packages/docs/content/docs/extensions/permissions-scoping.mdx` (created in US-208 subtask 208-2)
- `packages/docs/content/docs/extensions/live-updates.mdx` (NEW) -- AC-7: SSE events, emitWorkspaceEvent, useWorkspaceEvents
- `packages/docs/content/docs/extensions/meta.json` (NEW or updated)

**Estimated complexity:** L (~400 lines total across new guides)

#### Subtask 212-2: API reference page

**Components to create:**
- `packages/docs/content/docs/extensions/api-reference.mdx` (NEW) -- AC-8: request/response schemas for `/api/workspace/data/query`, `/api/workspace/data/aggregate`, `/api/workspace/data/schema`, `/api/workspace/events`

**Estimated complexity:** M (~150 lines)

#### Subtask 212-3: Architecture diagram

**Components to create:**
- `packages/docs/content/docs/extensions/architecture.mdx` (NEW) -- AC-9: Mermaid data flow diagram: app schema -> Prisma -> data engine -> template -> component

**Estimated complexity:** S (~80 lines)

#### Subtask 212-4: Architecture Decision Records

**Components to create:**
- `packages/docs/content/docs/decisions/adr-013-framework-app-separation.mdx` (NEW)
- `packages/docs/content/docs/decisions/adr-014-prisma-composition.mdx` (NEW)
- `packages/docs/content/docs/decisions/adr-015-formatter-registry.mdx` (NEW)

**Components to modify:**
- `packages/docs/content/docs/decisions/meta.json` -- add entries for ADR-013, -014, -015

**Estimated complexity:** M (~200 lines)

---

## 3. Part 2: F1 demo application

> All Part 2 work happens in `apps/demo-f1/`. Zero modifications to `packages/*`.
> If you find yourself editing `packages/*` during Part 2, STOP -- something is missing from Part 1.

---

### US-220: F1 database schema [#388] [VASTU-2A-220]

**Goal:** 16 domain tables extending the base schema with realistic F1 data model.

#### Subtask 220-1: F1 app scaffold

**Components to create (via `pnpm vastu:init demo-f1` or manually):**
- `apps/demo-f1/package.json` (NEW)
- `apps/demo-f1/next.config.mjs` (NEW)
- `apps/demo-f1/tsconfig.json` (NEW)
- `apps/demo-f1/src/app/layout.tsx` (NEW)
- `apps/demo-f1/src/app/page.tsx` (NEW)
- `apps/demo-f1/src/app/workspace/page.tsx` (NEW)
- `apps/demo-f1/src/pages.ts` (NEW -- placeholder)
- `apps/demo-f1/src/formatters.ts` (NEW -- placeholder)

**Estimated complexity:** S (~80 lines -- generated by scaffold)

#### Subtask 220-2: F1 Prisma schema

**Components to create:**
- `apps/demo-f1/prisma/schema.prisma` (NEW) -- base schema section + 16 domain models:

  **Enums (9):**
  `CircuitType` (Street/Permanent/SemiPermanent), `ConstructorStatus` (Active/Withdrawn), `DriverStatus` (Active/Retired/Reserve), `RaceStatus` (Scheduled/Completed/Cancelled), `Weather` (Dry/Wet/Mixed), `RaceResultStatus` (Finished/DNF/DSQ/DNS), `RaceEventType` (Start/PitStop/Overtake/Penalty/SafetyCar/RedFlag/Retirement/FastestLap/Finish), `PenaltyType` (TimePenalty/GridPenalty/DriveThrough/StopGo/Reprimand/Disqualification), `TireCompound` (Soft/Medium/Hard/Intermediate/Wet)

  **Models (14):**
  `Season`, `Circuit`, `Constructor`, `Driver`, `Race`, `RaceResult`, `QualifyingResult`, `SprintResult`, `PitStop`, `LapTime`, `DriverStanding`, `ConstructorStanding`, `RaceEvent`, `Penalty`

  All per the field reference in the requirements appendix. All with `id` (UUID), `createdAt`, `updatedAt`. `Driver` and `Constructor` with `deletedAt`.

  **Indexes:** FK columns, plus composite indexes:
  - `LapTime`: `@@index([raceId, driverId])`, `@@index([raceId, lapNumber])`
  - `RaceResult`: `@@index([raceId, driverId])`
  - `DriverStanding`: `@@index([raceId, driverId])`
  - `Race`: `@@index([seasonId, round])`

**Database changes:** New migration `20260323_add_f1_domain_tables` run from `apps/demo-f1/`.

**Edge cases:**
- Migration from fresh DB (no base tables) -- fails. Must run base migration first.
- Migration from existing DB with base tables -- succeeds (additive only)

**Testing strategy:**
- `prisma validate` passes
- `prisma migrate deploy` succeeds from fresh + seeded base DB

**Estimated complexity:** L (~400 lines of Prisma schema)

---

### US-221: F1 seed data [#389] [VASTU-2A-221]

**Goal:** 5 seasons of realistic F1 data, deterministic, under 45 seconds.

#### Subtask 221-1: PRNG and reference data

**Components to create:**
- `apps/demo-f1/prisma/seed/prng.ts` (NEW) -- mulberry32 seeded PRNG (deterministic)
- `apps/demo-f1/prisma/seed/names.ts` (NEW) -- 40 fictional driver names, 10 fictional constructor names, 25+ nationalities
- `apps/demo-f1/prisma/seed/circuits.ts` (NEW) -- 25 real circuit definitions (name, location, country, length_km, turns, circuit_type)
- `apps/demo-f1/prisma/seed/distributions.ts` (NEW) -- helper functions for realistic distributions

**WARNING -- HUMAN DECISION NEEDED:** PRNG implementation:
- **Option A (recommended):** Inline mulberry32 (~10 lines). No external dependency.
- **Option B:** `seedrandom` npm package. Well-tested but adds a dependency.

Recommendation: Option A. Mulberry32 is trivial, deterministic, and avoids a new npm dependency (HITL trigger).

**Estimated complexity:** M (~250 lines)

#### Subtask 221-2: Season and race generation

**Components to create:**
- `apps/demo-f1/prisma/seed/generateSeasons.ts` (NEW) -- 5 seasons (2020-2024), 20-23 races per season
- `apps/demo-f1/prisma/seed/generateRaces.ts` (NEW) -- race details per circuit with weather (wet ~15%), safety cars (~40%)
- `apps/demo-f1/prisma/seed/generateResults.ts` (NEW) -- race results, qualifying, sprint results

**Key logic:**
- Season calendar: distribute 25 circuits across 20-23 races per season
- Qualifying: generate Q1/Q2/Q3 times based on circuit base lap time + driver skill
- Race results: simulate finishing order with DNF ~8%, points per F1 rules
- Sprint: only races with `hasSprint=true` (~30% of races)
- Standing calculations: cumulative points after each race

**Estimated complexity:** L (~400 lines)

#### Subtask 221-3: Lap times, pit stops, and events generation

**Components to create:**
- `apps/demo-f1/prisma/seed/generateLapTimes.ts` (NEW) -- ~65K rows
- `apps/demo-f1/prisma/seed/generatePitStops.ts` (NEW) -- 1-3 per driver per race
- `apps/demo-f1/prisma/seed/generateEvents.ts` (NEW) -- race events, penalties

**Key logic for lap times:**
- Base time per circuit (70,000ms Monaco to 95,000ms Spa)
- Per-driver skill offset (-2000ms to +3000ms from base)
- Tire degradation model: +100ms per lap on soft, +60ms on medium, +30ms on hard
- Random variance: +/- 500ms normally distributed
- Sector splits: ~30%/35%/35% of total lap time with own variance
- Use `prisma.lapTime.createMany({ data: batch })` with 1000-row batches for performance

**Edge cases:**
- Lap times for DNF drivers: only up to their retirement lap
- Safety car laps: all drivers within 500ms of leader
- Personal best tracking: `isPersonalBest` computed during generation

**Testing strategy:**
- Timing test: full seed completes under 45 seconds
- Determinism test: run seed twice, verify identical row counts and key data points
- Integrity test: FK relationships valid, standings are consistent with results

**Estimated complexity:** L (~400 lines)

#### Subtask 221-4: Seed entry point and orchestration

**Components to create:**
- `apps/demo-f1/prisma/seed.ts` (NEW) -- orchestrator:
  1. Import `runBaseSeed` from `@vastu/shared/prisma`
  2. Run base seed (users, roles, org, tenant)
  3. Run domain seed functions in order: seasons -> circuits -> constructors -> drivers -> races -> qualifying -> sprint -> results -> standings -> lap times -> pit stops -> events -> penalties
  4. Create audit_events for race confirmations, penalties, standing updates (AC-5)

**Components to modify:**
- Root `package.json` -- add `"prisma:seed:demo": "cd apps/demo-f1 && npx prisma db seed"` or `tsx prisma/seed.ts`

**Key logic:**
- Wrap all inserts in transaction where possible
- Log progress: "Seeding seasons... Seeding races... Seeding lap times (65,000)..."

**Estimated complexity:** M (~150 lines)

---

### US-222: F1 display formatters [#390] [VASTU-2A-222]

**Goal:** 8 custom formatters demonstrating the formatter registry.

#### Subtask 222-1: F1 formatter implementations

**Components to create:**
- `apps/demo-f1/src/formatters.ts` (FILL) -- register 8 formatters:

| Formatter | render | sort | export |
|-----------|--------|------|--------|
| `lap-time` | `ms -> 1:23.456` (mm:ss.ms) | numeric on ms value | `1:23.456` string |
| `pit-duration` | `ms -> 2.4s` (seconds, 1 decimal) | numeric on ms value | `2.4s` string |
| `tire-compound` | Colored pill using Mantine `Badge`: Soft=`--v-status-error`, Medium=`--v-accent-tertiary`, Hard=`--v-bg-tertiary`+`--v-text-primary`, Inter=`--v-status-success`, Wet=`--v-accent-primary` | alphabetical | plain text |
| `position-change` | `+3` green / `-2` red / `0` gray with triangle arrows | numeric on delta | `+3` / `-2` / `0` string |
| `race-status` | Badge: Finished=`--v-status-success`, DNF=`--v-status-error`, DSQ=`--v-accent-tertiary`, DNS=`--v-text-tertiary` | alphabetical | plain text |
| `nationality-flag` | Two-letter code with flag emoji prefix | alphabetical | plain text |
| `circuit-type` | Badge: Street=`--v-accent-quaternary`, Permanent=`--v-accent-primary`, Semi-permanent=`--v-status-success` | alphabetical | plain text |
| `weather` | Icon span + label | alphabetical | plain text |

**Design system mapping:**
- Badges: Style Guide SS9.1 (Badge component), `--v-radius-pill` per SS4
- Colors: Style Guide SS1.3 (semantic status colors)

**Edge cases:**
- Null lap time value -- render "---" in `--v-text-tertiary`
- Unknown tire compound string -- render gray pill with raw text
- Unknown nationality code -- render plain text without flag emoji

**Testing strategy:**
- Unit test per formatter: `render` returns expected React node shape
- Unit test per formatter: `sort` function produces correct ordering
- Unit test per formatter: `export` returns expected string
- 8 formatters x 3 functions = 24 test cases minimum

**Estimated complexity:** M (~300 lines)

---

### US-223: F1 demo pages [#391] [VASTU-2A-223]

**Goal:** 9 pre-configured pages demonstrating all 6 templates.

#### Subtask 223-1: Page registration configuration

**Components to create/fill:**
- `apps/demo-f1/src/pages.ts` (FILL) -- register 9 pages via `PageRegistry.register()`:

| # | Page | Template | Icon | Config highlights |
|---|------|----------|------|-------------------|
| 1 | Races | `table-listing` | `IconFlag` | Columns: season/round/name/circuit/date/winner(link)/pole(link)/weather/safety cars/laps. KPI strip: total races, wet %, avg safety cars. Default sort: date desc. |
| 2 | Drivers | `table-listing` | `IconUsers` | Columns: name(link)/number/nationality(flag)/constructor(link)/championships/wins/podiums/poles/status. |
| 3 | Constructors | `table-listing` | `IconBuildingFactory2` | Columns: name(link)/nationality/principal/engine/championships/status. |
| 4 | Championship | `summary-dashboard` | `IconTrophy` | Season picker. KPIs: leader+points, races completed, next race. Charts: driver points progression (line, top 5), constructor wins (donut), constructor points (bar). Mini table: latest race top 10. |
| 5 | Driver Profile | `multi-tab-detail` | `IconUser` | Header: name, number, flag, constructor, championships. Tabs: Overview, Results, Qualifying, Penalties, Career timeline. |
| 6 | Lap Time Explorer | `data-explorer` | `IconClock` | Default: avg lap time by circuit, 2024, line chart. Controls: metric (avg/fastest/pit duration), group by (circuit/driver/constructor/tire), time resolution (per-race/per-season). |
| 7 | Race Report | `form-page` | `IconClipboard` | Multi-step: select race -> enter results grid -> incidents/penalties -> review. |
| 8 | Race Weekend | `timeline-activity` | `IconCalendar` | Per-race scoped. Event types: practice, qualifying, race start, pit stops, overtakes, penalties, safety cars, finish. |
| 9 | My Dashboard | `dashboard` | `IconLayoutDashboard` | Pinned: next race KPI, championship leader KPI, season wins by constructor chart, latest race top 10 table. |

**Key logic:**
- Cross-page navigation configured: driver name column -> Driver Profile, race name -> Race Weekend, constructor name -> constructor detail (uses `navigateTo` from US-209)
- All formatters from US-222 mapped to appropriate columns via `displayType`
- Data sources use generic data engine (US-202/203): `dataSource.type = 'prisma'`, `dataSource.model = 'Race'` etc.

**Design system mapping:**
- Table listing: Patterns Library SS1 (data tables)
- Summary dashboard: Patterns Library SS3 (charts) + KPICard component
- Multi-tab detail: existing MultiTabDetailTemplate
- Data explorer: existing DataExplorerTemplate
- Form page: Patterns Library SS9 (form patterns)
- Timeline: existing TimelineActivityTemplate
- Dashboard: existing DashboardTemplate

**Edge cases:**
- Pages work immediately after seed -- no manual config needed (AC-4)
- Empty state before seed: pages render empty states per Patterns Library SS8

**Testing strategy:**
- E2E test: all 9 pages appear in sidebar
- E2E test: Races table loads seeded data, pagination works
- E2E test: click driver name in Races -> Driver Profile opens with correct driver
- E2E test: Championship dashboard shows charts with data

**Estimated complexity:** L (~400 lines of config objects -- largest config-only subtask)

#### Subtask 223-2: App startup wiring

**Components to create/modify:**
- `apps/demo-f1/src/app/workspace/page.tsx` -- import `./pages` and `./formatters` to trigger registration at app startup
- Ensure registration happens before WorkspaceShell renders

**Estimated complexity:** S (~30 lines)

#### Subtask 223-3: F1 demo E2E smoke tests

**Components to create:**
- `apps/demo-f1/e2e/smoke.spec.ts` (NEW) -- Playwright tests:
  - App starts and renders workspace
  - Sidebar shows 9 F1 pages
  - Click "Races" -- table loads with data rows
  - Pagination: navigate to page 2
  - Click driver name -- Driver Profile opens in new panel
  - Championship dashboard renders KPI cards and charts
  - Lap Time Explorer renders chart

**Estimated complexity:** M (~150 lines)

---

### US-224: F1 demo documentation [#392] [VASTU-2A-224]

**Goal:** Demo-specific docs explaining how the F1 app is structured.

#### Subtask 224-1: README and inline comments

**Components to create:**
- `apps/demo-f1/README.md` (FILL) -- AC-1: purpose, setup instructions, architecture diagram, file map
- Add inline code comments to `pages.ts`, `formatters.ts`, `seed.ts` explaining "why" not just "what" (AC-2)

**Estimated complexity:** M (~150 lines)

#### Subtask 224-2: Fumadocs demo pages

**Components to create:**
- `packages/docs/content/docs/demo/demo-walkthrough.mdx` (NEW) -- AC-3: guided tour of the F1 app
- `packages/docs/content/docs/demo/building-your-own.mdx` (NEW) -- AC-4: step-by-step from `vastu:init` to first page
- `packages/docs/content/docs/demo/meta.json` (NEW)

**Components to modify:**
- `packages/docs/content/docs/meta.json` -- add "Demo" section

**Estimated complexity:** M (~200 lines)

---

## 4. Cross-cutting concerns

### 4.1 FilterNode type relocation

**Impact:** All workspace files importing from `./components/FilterSystem/types.ts` continue to work via re-export. No consumer code changes needed.

**Timing:** Must be the FIRST subtask of US-202 (subtask 202-0).

**Files affected:**
- `packages/workspace/src/components/FilterSystem/types.ts` -- becomes a re-export shim
- `packages/workspace/src/components/FilterSystem/FilterEngine.ts` -- imports unchanged (uses local re-export)
- `packages/workspace/src/stores/viewFilterStore.ts` -- imports unchanged
- All test files importing filter types -- unchanged

### 4.2 CASL resource extensibility

The `Resource` type in `packages/shared/src/permissions/resources.ts` is a fixed union. The `scopeQuery` function (US-208) will accept `string` for the table parameter rather than `Resource`, allowing domain tables to be used as CASL subjects. No changes to the `Resource` type itself are needed.

### 4.3 pnpm-workspace.yaml update

Must add `"apps/*"` to the packages list in Wave 1 (US-200). This is prerequisite for all F1 work.

### 4.4 Shared package exports expansion

`packages/shared/src/index.ts` must export the new `data-engine` module. This is a public API addition (not a breaking change) that affects both `@vastu/shell` (API routes) and `@vastu/workspace` (types). Consistent with existing pattern.

### 4.5 VastuColumn type additions

Adding `displayType?: string` and `navigateTo?: { pageId: string; recordId: string }` to `VastuColumn` in `packages/workspace/src/components/VastuTable/types.ts`. These are optional fields -- all existing code compiles without changes.

### 4.6 Builder panel display type picker

The `DISPLAY_TYPES` array in `packages/workspace/src/components/BuilderPanel/sections/FieldConfigSection.tsx` is currently hardcoded. US-205 should modify it to also include custom formatters from `FormatterRegistry.getAll()`, so F1 formatters appear in the builder field config picker (US-222 AC-4).

### 4.7 Schema migration strategy

- Framework schema (`packages/shared/src/prisma/schema.prisma`) is NOT modified in this phase
- `packages/shared/prisma/base-schema.prisma` is a template COPY (not referenced at runtime)
- F1 schema lives at `apps/demo-f1/prisma/schema.prisma` with its own migration directory
- Each app generates its own Prisma Client via `prisma generate` with output to `node_modules/.prisma/client` (per-app)

### 4.8 CI/CD impact

- New CI workflow for workspace E2E (US-211)
- Existing CI workflows (`ci-build.yml`, `ci-lint.yml`, `ci-typecheck.yml`, `ci-test.yml`) should pick up `apps/*` packages automatically via Turborepo
- Fumadocs build should be tested in CI (`ci-build.yml` already runs `turbo run build`)

---

## 5. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Prisma DMMF API instability** | Low | High | Pin Prisma version, add unit tests for DMMF field access |
| **65K lap_times seed > 45s** | Medium | Medium | Use `createMany` with 1000-row batches. If still slow, use raw `COPY` command. |
| **FilterNode type relocation breaks imports** | Low | Medium | Re-export from workspace, run full `pnpm typecheck` after move |
| **Dynamic Prisma model access type safety** | Medium | High | Validate all table names against DMMF before query. Wrapper function with runtime check. |
| **Per-app Prisma Client generation collisions** | Medium | High | Test with two apps side by side. Use distinct `output` path per app. |
| **SSE connection management leaks** | Low | Medium | Explicit cleanup in `ReadableStream` cancel callback. Test with connection drops. |
| **CASL condition-to-Prisma mapping edge cases** | Medium | Medium | Extensive unit testing. Support only simple equality conditions in Phase 2A. |
| **Chart keyboard nav across 5 chart types** | Low | Medium | Systematic testing per chart type. Sparklines explicitly exempt. |
| **Fumadocs build with new sections** | Low | Low | Test docs build as part of CI. |
| **F1 page configs too complex for template system** | Medium | Medium | Validate each template accepts the config shape. May need minor template fixes. |

### Highest uncertainty items

1. **Per-app Prisma clients** (US-201) -- this is an uncommon monorepo pattern. The `output` directive and `@prisma/client` import resolution need careful testing.
2. **Dynamic table queries** (US-202) -- `prisma[tableName]` dynamic access bypasses TypeScript type checking. A safe wrapper with DMMF validation is essential.
3. **Aggregate time bucketing** (US-203) -- raw SQL for `date_trunc` is the one exception to the no-raw-SQL rule. Must be carefully parameterized to prevent SQL injection.

---

## 6. Architecture Decision Records

### ADR-013: Framework/Application Separation Model

**File:** `packages/docs/content/docs/decisions/adr-013-framework-app-separation.mdx`

**Status:** Proposed

**Context:** Vastu needs a clear boundary between framework code (`packages/*`) and application code (`apps/*`). Applications must consume framework features without modifying framework packages. The F1 demo proves this boundary works.

**Decision:** Applications live in `apps/<name>/` with their own `package.json`, Prisma schema, and Next.js config. They depend on `@vastu/shell`, `@vastu/workspace`, and `@vastu/shared` as pnpm workspace packages. Framework packages NEVER import from app packages. The framework provides three extension registries (FormatterRegistry, PageRegistry, TemplateRegistry) that apps populate at startup.

**Consequences:**
- `rm -rf apps/<name>/` leaves framework fully functional (no broken imports)
- Apps have their own Prisma Client with domain-specific models
- Template configs, formatters, and page registrations are code-level (committed, versioned)
- No dynamic plugin loading -- apps are first-party workspace members, not plugins
- Trade-off: apps must manually sync base schema changes (mitigated by CI check)

### ADR-014: Prisma Schema Composition via Copy-and-Extend

**File:** `packages/docs/content/docs/decisions/adr-014-prisma-composition.mdx`

**Status:** Proposed

**Context:** Domain tables must coexist with framework tables in the same database. Options considered: (a) single shared schema (all apps share one schema.prisma), (b) separate databases per app, (c) copy-and-extend (each app gets a copy of the base schema and adds domain models).

**Decision:** Copy-and-extend. `vastu:init` copies the base schema template into the app's `prisma/` directory. The app extends it with domain models. Each app generates its own Prisma Client. The base seed function is importable from `@vastu/shared`.

**Rationale:**
- (+) Each app has full control of its schema and migrations
- (+) No complex multi-schema Prisma setup (Prisma does not natively support multi-file schemas well)
- (+) Clean `prisma migrate` workflow per app
- (-) Base schema updates require manual sync to existing apps
- (-) Each app has its own migration history (cannot share migrations)
- Mitigation: CI check verifies all apps contain the expected base model set

**Alternatives rejected:**
- Single shared schema: tight coupling, all apps affected by schema changes to any app
- Separate databases: complex auth/session sharing, multiple connection pools

### ADR-015: Formatter Registry Pattern

**File:** `packages/docs/content/docs/decisions/adr-015-formatter-registry.mdx`

**Status:** Proposed

**Context:** VastuTable and VastuChart need to render domain-specific values (lap times, tire compounds) without framework code knowing about these domains. The framework defines display infrastructure; apps provide display implementations.

**Decision:** Global `FormatterRegistry` singleton in `@vastu/workspace` with `register(name, definition)` API. Apps call `register()` at startup before rendering. VastuTableCell checks the registry by `displayType` column config before falling back to built-in rendering. Built-in formatters are pre-registered by the framework. Apps extend but can also replace built-ins.

**Rationale:**
- (+) Zero framework modification for new display types
- (+) Formatters include sort/export/filter functions, not just rendering
- (+) Builder mode can enumerate registered formatters for the display type picker
- (-) Global singleton creates implicit ordering dependency (register before render)
- (-) SSR: not applicable (workspace is client-only)
- Mitigation: unknown displayType falls back gracefully with console.warn

---

## Summary: subtask count and total estimated effort

| Story | Subtasks | Complexity | Est. lines |
|-------|----------|-----------|-----------|
| US-200 | 2 | S+M | ~280 |
| US-201 | 3 | S+M+S | ~250 |
| US-202 | 5 | S+M+S+S+L | ~750 |
| US-203 | 2 | L+M | ~550 |
| US-204 | 2 | M+S | ~230 |
| US-205 | 4 | S+M+M+S | ~490 |
| US-206 | 3 | M+M+S | ~380 |
| US-207 | 5 | S+M+M+S+S | ~590 |
| US-208 | 2 | M+S | ~470 |
| US-209 | 2 | M+S | ~300 |
| US-210 | 2 | M+M | ~400 |
| US-211 | 1 | M | ~150 |
| US-212 | 4 | L+M+S+M | ~830 |
| US-220 | 2 | S+L | ~480 |
| US-221 | 4 | M+L+L+M | ~1200 |
| US-222 | 1 | M | ~300 |
| US-223 | 3 | L+S+M | ~580 |
| US-224 | 2 | M+M | ~350 |
| **Total** | **47** | | **~8,580** |

All subtasks are scoped to be completable within a single dev-engineer session (under ~500 lines of change each).
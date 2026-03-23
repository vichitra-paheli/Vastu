# Phase 2A Todo

## Feature dependency graph

```
Independent (can start immediately):
  VASTU-2A-200 (F1 Database Schema)
  VASTU-2A-210 (Chart Accessibility Completion)

Depends on 200:
  VASTU-2A-201 (F1 Seed Data)
  VASTU-2A-202 (Template Data Source Integration)

Depends on 200 + 201:
  VASTU-2A-203 (Demo Page Configurations)

Depends on 202 + 203:
  VASTU-2A-204 (Connect VastuTable to Real Data)
  VASTU-2A-205 (Connect VastuChart to Real Data)
  VASTU-2A-206 (Connect Record Drawer to Real Data)

Depends on 202:
  VASTU-2A-207 (CASL-Enforced Query Scoping)

Depends on 202 + 204:
  VASTU-2A-208 (Server-Sent Events for Workspace)

Depends on 200 + 201 + 204:
  VASTU-2A-209 (Workspace E2E in CI)

Depends on 204:
  VASTU-2A-211 (Cross-Page Navigation)

Depends on all others:
  VASTU-2A-212 (Phase 2A Documentation)
```

Critical path: US-200 -> US-201 -> US-202 -> US-204/205/206 -> US-211

## Features and tasks

### VASTU-2A-200: F1 Database Schema (#320) [INDEPENDENT]
Branch: feature/VASTU-2A-200-f1-schema
- [ ] VASTU-2A-200a: Prisma Schema -- Enums and Core Entities (#333) (shared, M) [no deps] {dev-engineer}
- [ ] VASTU-2A-200b: Prisma Schema -- Race Weekend Models (#334) (shared, M) [deps: 200a] {dev-engineer}
- [ ] VASTU-2A-200c: Prisma Schema -- Granular Data and Standings (#335) (shared, M) [deps: 200a] {dev-engineer}
- [ ] VASTU-2A-200d: Run Migration and Validate (#336) (shared, S) [deps: 200a, 200b, 200c] {dev-engineer}
- [ ] VASTU-2A-200e: F1 TypeScript Types in Shared (#337) (shared, M) [deps: 200a, 200b, 200c] {dev-engineer}

### VASTU-2A-210: Chart Accessibility Completion (#330) [INDEPENDENT]
Branch: feature/VASTU-2A-210-chart-a11y
- [ ] VASTU-2A-210a: Chart Keyboard Navigation Hook (#367) (workspace, M) [no deps] {design-engineer}
- [ ] VASTU-2A-210b: Screen Reader Announcements and View-as-Table (#368) (workspace, M) [deps: 210a] {design-engineer}

### VASTU-2A-201: F1 Seed Data (#321) [DEPENDS ON: 200 merged to main]
Branch: feature/VASTU-2A-201-f1-seed (branch from main AFTER 200 merges)
- [ ] VASTU-2A-201a: Seeded PRNG and Core Data Generators (#338) (shared, L) [deps: 200d] {dev-engineer}
- [ ] VASTU-2A-201b: Race Results and Qualifying Generators (#339) (shared, L) [deps: 201a] {dev-engineer}
- [ ] VASTU-2A-201c: Pit Stops, Lap Times, and Tire Strategy (#340) (shared, L) [deps: 201a, 201b] {dev-engineer}
- [ ] VASTU-2A-201d: Standings, Events, Penalties, and Audit Events (#341) (shared, L) [deps: 201b] {dev-engineer}
- [ ] VASTU-2A-201e: Seed Orchestrator and CLI Integration (#342) (shared, M) [deps: 201a, 201b, 201c, 201d] {dev-engineer}

### VASTU-2A-202: Template Data Source Integration (#322) [DEPENDS ON: 200 merged to main]
Branch: feature/VASTU-2A-202-data-api (branch from main AFTER 200 merges)
- [ ] VASTU-2A-202a: FilterNode to Prisma Where Translator (#343) (shared, M) [deps: 200e] {dev-engineer}
- [ ] VASTU-2A-202b: Data Query API Route (#344) (shell, L) [deps: 202a, 200d] {dev-engineer}
- [ ] VASTU-2A-202c: Data Aggregate API Route (#345) (shell, M) [deps: 202a, 200d] {dev-engineer}
- [ ] VASTU-2A-202d: Data Schema API Route (#346) (shell, S) [deps: 200d] {dev-engineer}
- [ ] VASTU-2A-202e: TanStack Query Hooks for Data Fetching (#347) (workspace, M) [deps: 202b, 202c] {dev-engineer}

### VASTU-2A-203: Demo Page Configurations (#323) [DEPENDS ON: 200, 201 merged to main]
Branch: feature/VASTU-2A-203-page-configs (branch from main AFTER 200 and 201 merge)
- [ ] VASTU-2A-203a: Seed Page Records for 9 F1 Pages (#348) (shared, M) [deps: 200d, 201e] {dev-engineer}
- [ ] VASTU-2A-203b: Seed Page Configurations with Column/Chart Config (#349) (shared, L) [deps: 203a] {dev-engineer}
- [ ] VASTU-2A-203c: Update Sidebar to Load Pages from Database (#350) (workspace, M) [deps: 203a] {design-engineer}

### VASTU-2A-204: Connect VastuTable to Real Data (#324) [DEPENDS ON: 202, 203 merged to main]
Branch: feature/VASTU-2A-204-table-data (branch from main AFTER 202 and 203 merge)
- [ ] VASTU-2A-204a: Add Server-Side Mode to useVastuTable (#351) (workspace, M) [deps: 202e] {dev-engineer}
- [ ] VASTU-2A-204b: Create useServerTable Hook (#352) (workspace, M) [deps: 204a, 202e] {dev-engineer}
- [ ] VASTU-2A-204c: Wire TableListingTemplate to Server Data (#353) (workspace, M) [deps: 204b, 203b] {dev-engineer}

### VASTU-2A-205: Connect VastuChart to Real Data (#325) [DEPENDS ON: 202, 203 merged to main]
Branch: feature/VASTU-2A-205-chart-data (branch from main AFTER 202 and 203 merge)
- [ ] VASTU-2A-205a: Add dataSource Prop to VastuChart (#354) (workspace, M) [deps: 202e] {dev-engineer}
- [ ] VASTU-2A-205b: Wire SummaryDashboardTemplate to Server Data (#355) (workspace, L) [deps: 205a, 203b] {design-engineer}
- [ ] VASTU-2A-205c: Wire DataExplorerTemplate to Server Data (#356) (workspace, M) [deps: 205a, 203b] {design-engineer}

### VASTU-2A-206: Connect Record Drawer to Real Data (#326) [DEPENDS ON: 202, 203 merged to main]
Branch: feature/VASTU-2A-206-drawer-data (branch from main AFTER 202 and 203 merge)
- [ ] VASTU-2A-206a: Create useRecordDetail Hook and API Route (#357) (workspace/shell, M) [deps: 202b] {dev-engineer}
- [ ] VASTU-2A-206b: Wire RecordDrawer Tabs to Real Data (#358) (workspace, L) [deps: 206a, 203b] {design-engineer}

### VASTU-2A-207: CASL-Enforced Query Scoping (#327) [DEPENDS ON: 202 merged to main]
Branch: feature/VASTU-2A-207-casl-scoping (branch from main AFTER 202 merges)
- [ ] VASTU-2A-207a: Add F1 Resources to CASL (#359) (shared, S) [no deps] {dev-engineer}
- [ ] VASTU-2A-207b: Apply CASL Checks in Data API Routes (#360) (shell/shared, M) [deps: 207a, 202b] {dev-engineer}
- [ ] VASTU-2A-207c: Client-Side Permission Checks (#361) (workspace, S) [deps: 207a] {dev-engineer}

### VASTU-2A-208: Server-Sent Events for Workspace (#328) [DEPENDS ON: 202, 204 merged to main]
Branch: feature/VASTU-2A-208-sse (branch from main AFTER 202 and 204 merge)
- [ ] VASTU-2A-208a: SSE Endpoint (#362) (shell, M) [no deps] {dev-engineer}
- [ ] VASTU-2A-208b: SSE Event Bus Server-Side (#363) (shell, S) [deps: 208a] {dev-engineer}
- [ ] VASTU-2A-208c: SSE Client Hook and UI Integration (#364) (workspace, M) [deps: 208a] {design-engineer}
- [ ] VASTU-2A-208d: Wire SSE to Dashboard, Timeline, and Table (#365) (workspace, M) [deps: 208c, 204c] {design-engineer}

### VASTU-2A-209: Workspace E2E in CI (#329) [DEPENDS ON: 200, 201, 204 merged to main]
Branch: feature/VASTU-2A-209-ci-e2e (branch from main AFTER 200, 201, 204 merge)
- [ ] VASTU-2A-209a: GitHub Actions Workflow for Workspace E2E (#366) (infra, M) [deps: 200d, 201e] {devops-engineer}

### VASTU-2A-211: Cross-Page Navigation (#331) [DEPENDS ON: 204 merged to main]
Branch: feature/VASTU-2A-211-cross-nav (branch from main AFTER 204 merges)
- [ ] VASTU-2A-211a: NavigateTo Cell Type (#369) (workspace, M) [deps: 204c] {dev-engineer}
- [ ] VASTU-2A-211b: Back Navigation Breadcrumb (#370) (workspace, M) [deps: 211a] {design-engineer}

### VASTU-2A-212: Phase 2A Documentation (#332) [DEPENDS ON: all others merged to main]
Branch: feature/VASTU-2A-212-docs (branch from main AFTER all other features merge)
- [ ] VASTU-2A-212a: Getting Started and Data Pipeline Guides (#371) (docs, M) [deps: all features] {dev-engineer}
- [ ] VASTU-2A-212b: API Reference Documentation (#372) (docs, S) [deps: 202b, 202c, 202d] {dev-engineer}
- [ ] VASTU-2A-212c: Architecture Documentation and ADRs (#373) (docs, S) [deps: all features] {dev-engineer}

## Summary

- **Total features:** 13
- **Total tasks:** 40
- **Independent features (can start now):** 2 (VASTU-2A-200, VASTU-2A-210)
- **Estimated total effort:** ~8,200 lines across 40 subtasks
- **Critical path:** US-200 -> US-201 -> US-202 -> US-204/205/206 -> US-211

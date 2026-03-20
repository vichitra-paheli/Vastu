# Vastu

Enterprise web application framework for data-intensive business tools. Vastu provides a configurable shell (auth, settings, admin) and a panel-based workspace where teams build, query, and visualize data without writing code.

## Goal

Replace the pattern of "one-off internal tools per team" with a single platform that handles auth, permissions, multi-tenancy, and audit out of the box — so teams focus on their data workflows instead of re-implementing boilerplate.

## Architecture

```
packages/
  shell/          Next.js 14 App Router — auth pages, settings, admin
  shared/         Prisma schema, types, utilities, CASL permissions
  workspace/      Panel-based workspace with Dockview (Phase 1)
  agent-runtime/  LangGraph workflows, AG-UI, MCP server (Phase 3)
```

**Monorepo** managed by Turborepo + pnpm workspaces. Each package has independent build, lint, test, and typecheck targets with dependency-aware caching.

## Technical choices

| Choice | Why |
|--------|-----|
| **Next.js 14 App Router** | Server components by default reduce client JS; layouts and route groups map naturally to the shell/auth/admin split |
| **Mantine v7** | Enterprise-grade component library with built-in dark mode, form validation, and notification system — avoids building a design system from scratch |
| **Keycloak + next-auth v5** | Production-ready SSO/OIDC provider; next-auth handles session management with database strategy via PrismaAdapter |
| **CASL.js** | Attribute-based access control that works on both server and client; permission rules serialized into the session for zero-latency client checks |
| **Prisma + PostgreSQL** | Type-safe database access with auto-generated migrations; PostgreSQL for JSON support, full-text search, and row-level security (future) |
| **Dockview** (Phase 1) | VS Code-style panel layout; users arrange query editors, tables, and charts in persistent layouts |
| **LangGraph + MCP** (Phase 3) | Agentic workflows that can read/write data and call external tools through the Model Context Protocol |

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| **0 — Foundation** | Monorepo, Docker, CI, auth (login/register/MFA/SSO), settings, admin, design system | Complete |
| **1 — Workspace** | Dockview panels, query editor, table viewer, chart builder, persistent layouts | Planned |
| **2 — Data layer** | Database connection pooling, query execution engine, schema introspection, data export | Planned |
| **3 — Agents** | LangGraph workflows, AG-UI streaming, MCP tool server, natural language queries | Planned |

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9 --activate`)
- Docker + Docker Compose

### Setup

```bash
git clone <repo-url> vastu && cd vastu
pnpm install
cp .env.example .env

# Start PostgreSQL, Redis, Keycloak, MinIO
docker compose up -d

# Database setup
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed

# Start dev server (http://localhost:3000)
pnpm dev
```

### Seed users

| Email | Role | Password |
|-------|------|----------|
| admin@vastu.dev | Admin | (set in Keycloak) |
| editor@vastu.dev | Editor | (set in Keycloak) |
| viewer@vastu.dev | Viewer | (set in Keycloak) |

### Docker services

| Service | Port | Console |
|---------|------|---------|
| PostgreSQL 16 | 5432 | — |
| Redis 7 | 6379 | — |
| Keycloak 24 | 8080 | http://localhost:8080 (admin/admin) |
| MinIO | 9000/9001 | http://localhost:9001 (minioadmin/minioadmin) |

## Commands

```bash
pnpm dev              # Next.js dev server (port 3000)
pnpm build            # production build (all packages)
pnpm test             # unit + component tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)
pnpm lint             # ESLint + Prettier
pnpm typecheck        # TypeScript strict mode
pnpm prisma:studio    # database GUI (port 5555)
pnpm prisma:reset     # drop + migrate + seed (destructive)
```

## Project structure

```
vastu/
  packages/
    shell/             Auth, settings, admin (Next.js App Router)
    shared/            Prisma schema, types, CASL, utilities
    workspace/         Stub (Phase 1)
    agent-runtime/     Stub (Phase 3)
  docker/
    keycloak/          Realm export for dev Keycloak
    postgres/          Init script for Keycloak DB
  docs/
    design-principles.md
    style-guide.md
    patterns-library.md
  phases/              Requirements, plans, completion reports
  .github/workflows/   CI (lint, typecheck, test, build, E2E)
```

See [SETUP.md](SETUP.md) for detailed setup instructions and troubleshooting.

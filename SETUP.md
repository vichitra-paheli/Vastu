# Vastu -- Developer Setup Guide

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 20+ | `node --version` |
| pnpm | 9+ | `pnpm --version` |
| Docker + Docker Compose | Latest stable | `docker --version && docker compose version` |
| Git | 2.30+ | `git --version` |

**Install pnpm** (if not already installed):
```bash
corepack enable
corepack prepare pnpm@9 --activate
```

Or via npm:
```bash
npm install -g pnpm@9
```

---

## 1. Clone and install

```bash
git clone <repo-url> vastu
cd vastu
pnpm install
```

This installs all dependencies for all four packages (shell, shared, workspace, agent-runtime).

---

## 2. Environment variables

Copy the example env file and review it:

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box with Docker Compose. The key variables are:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://vastu:vastu@localhost:5432/vastu` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `KEYCLOAK_URL` | `http://localhost:8080` | Keycloak base URL |
| `KEYCLOAK_REALM` | `vastu` | Keycloak realm name |
| `KEYCLOAK_CLIENT_ID` | `vastu-app` | OIDC client ID |
| `KEYCLOAK_CLIENT_SECRET` | `dev-secret` | OIDC client secret |
| `AUTH_SECRET` | `dev-secret-change-in-production` | next-auth session encryption |
| `ENCRYPTION_KEY` | `dev-encryption-key-change-in-production` | AES-256-GCM for DB passwords and SSO secrets |
| `MINIO_ENDPOINT` | `localhost` | MinIO S3 API host |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `vastu-uploads` | MinIO bucket for file uploads |

**For production**, you must generate proper secrets:
```bash
# AUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (32-byte hex)
openssl rand -hex 32
```

---

## 3. Start Docker services

```bash
docker compose up -d
```

This starts:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 16 | 5432 | Primary database |
| Redis 7 | 6379 | Rate limiting, caching |
| Keycloak 24 | 8080 | Identity provider (SSO, OIDC) |
| MinIO | 9000 (API), 9001 (console) | Object storage (avatars, uploads) |

**Verify services are healthy:**
```bash
docker compose ps
```

All services should show `healthy` status. Keycloak takes 30-60 seconds to start.

**Access service consoles:**
- Keycloak admin: http://localhost:8080 (admin / admin)
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)

The Keycloak `vastu` realm and the MinIO `vastu-uploads` bucket are auto-created on first start.

---

## 4. Database migration and seeding

Generate the Prisma client, run migrations, and seed dev data:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

**Seed data creates:**
- 1 organization: "Acme Corp"
- 1 tenant: "Default"
- 3 users: admin@vastu.dev, editor@vastu.dev, viewer@vastu.dev
- 4 system roles: Admin, Builder, Editor, Viewer
- Permissions for each role
- 2 sample database connections
- 2 sample API keys
- 20 audit events

**Inspect the database** (opens Prisma Studio at localhost:5555):
```bash
pnpm prisma:studio
```

**Reset the database** (drops all tables, re-migrates, re-seeds):
```bash
pnpm prisma:reset
```

---

## 5. Running the dev server

```bash
pnpm dev
```

The Next.js dev server starts on http://localhost:3000.

**Login with seed users:**
- Admin: admin@vastu.dev
- Editor: editor@vastu.dev
- Viewer: viewer@vastu.dev

Note: Auth flows through Keycloak. If Keycloak is not running, login will fail. In development, you may see the Keycloak login page redirect.

---

## 6. Running tests

### Unit and component tests (Vitest)

```bash
pnpm test              # run all tests once
pnpm test -- --coverage  # with coverage report
```

Per-package:
```bash
pnpm --filter @vastu/shared test
pnpm --filter @vastu/shell test
```

### E2E tests (Playwright)

E2E tests require PostgreSQL and Redis to be running:

```bash
# Install Playwright browsers (first time only)
pnpm --filter @vastu/shell exec playwright install --with-deps chromium

# Run E2E tests
pnpm test:e2e
```

### Linting and type checking

```bash
pnpm lint              # ESLint + Prettier
pnpm lint --fix        # auto-fix
pnpm typecheck         # TypeScript strict mode
```

---

## 7. Build

```bash
pnpm build
```

Builds all packages via Turborepo. The shell package produces a Next.js production build; the shared package runs a type check.

---

## 8. Docker cleanup

Stop services and keep data:
```bash
docker compose down
```

Stop services and remove all data (volumes):
```bash
docker compose down -v
```

---

## 9. Project structure

```
vastu/
  packages/
    shell/          Next.js 14 App Router (auth, settings, admin pages)
    shared/         Prisma schema, types, utilities, CASL permissions
    workspace/      Stub (Phase 1: Dockview workspace)
    agent-runtime/  Stub (Phase 3: LangGraph, AG-UI, MCP)
  docker/
    keycloak/       Realm export for dev Keycloak
    postgres/       Init script for Keycloak DB
  docs/             Design system docs (principles, style guide, patterns)
  phases/           Phase requirements, plans, and completion reports
  .github/          CI workflow
```

---

## 10. Common troubleshooting

**Port conflicts:**
If a service port is already in use, override it in your `.env` file. See the commented-out port variables in `.env.example` (e.g., `POSTGRES_PORT`, `KEYCLOAK_PORT`, `REDIS_PORT`).

**Keycloak not starting:**
Keycloak depends on PostgreSQL being healthy first. Check that PostgreSQL is running:
```bash
docker compose logs postgres
docker compose logs keycloak
```

**Prisma client out of date:**
After any schema change, regenerate the client:
```bash
pnpm prisma:generate
```

**"Missing required environment variable" error:**
The shell package validates env vars at startup (`src/lib/env.ts`). Make sure your `.env` file exists and contains all required variables from `.env.example`.

**pnpm install fails:**
Ensure you are using pnpm 9+. The root `package.json` specifies `"packageManager": "pnpm@9.15.4"`. Run `corepack enable` to use the exact version.

**Tests fail with database connection errors:**
Unit tests that touch the database need PostgreSQL running on localhost:5432. Start Docker services first:
```bash
docker compose up -d postgres redis
```

**Next.js build errors after switching branches:**
Clear caches and reinstall:
```bash
rm -rf node_modules packages/*/node_modules packages/*/.next .turbo
pnpm install
pnpm prisma:generate
```

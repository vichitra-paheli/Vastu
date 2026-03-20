# Vastu

## Project
Enterprise web application framework. Monorepo (Turborepo).
Next.js 14 App Router + Mantine v7 + Dockview + Prisma + PostgreSQL.

## Architecture
- `packages/shell` — SSR pages: auth, settings, admin. Next.js App Router, server components.
- `packages/workspace` — Client-heavy workspace: Dockview panels, Mantine UI, Zustand state. (Stub until Phase 1)
- `packages/shared` — Prisma schema, TypeScript types, utility functions, CASL permission definitions.
- `packages/agent-runtime` — LangGraph workflows, AG-UI/A2UI protocols, MCP server. (Stub until Phase 3)

## Build & test
```
pnpm install          # install all dependencies
pnpm build            # build all packages
pnpm dev              # start Next.js dev server (port 3000)
pnpm test             # run all unit tests (Vitest)
pnpm test:e2e         # run E2E tests (Playwright)
pnpm lint             # ESLint + Prettier check
pnpm lint --fix       # auto-fix lint issues
pnpm typecheck        # TypeScript strict check
pnpm prisma:migrate   # run database migrations
pnpm prisma:seed      # seed development data
```

## Docker services
```
docker compose up -d     # start Postgres, Redis, Keycloak, MinIO
docker compose down -v   # stop and remove volumes
```
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Keycloak admin: localhost:8080 (realm: vastu)
- MinIO console: localhost:9001 (bucket: vastu-uploads)

## Commit conventions
Conventional Commits. Always reference the issue.
```
feat(shell): add login page with Keycloak auth [VASTU-0-003]
fix(shared): handle null in user role lookup [VASTU-0-012]
test(shell): add E2E for password reset flow [VASTU-0-008]
chore: update Prisma schema for api_keys table [VASTU-0-010]
```

## Testing requirements
Every PR must include tests. Target: 80% coverage on new code.
- Unit tests: Vitest. Place in `__tests__/` next to the file being tested.
- Component tests: `@testing-library/react` with Mantine provider wrapper.
- E2E tests: Playwright. Place in `e2e/` at package root.

## Code conventions
- TypeScript strict mode. No `any`. No `@ts-ignore` without a comment explaining why.
- All colors via `--v-*` CSS custom properties. Never hardcode hex values.
- All potentially truncated text uses the `TruncatedText` component.
- All async operations use the loading state pattern: skeleton → content → error.
- All user-facing strings go through `t('key')` for future i18n.
- All form validation via `@mantine/form`.
- All database access via Prisma. No raw SQL.
- Two font weights only: 400 (regular) and 500 (medium). Never 600 or 700.

## Auth
- All auth flows through Keycloak via `next-auth` with database session strategy.
- Client-side permissions via CASL.js. Definitions in `packages/shared/src/permissions/`.
- Protected routes enforced by Next.js middleware. Public routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/sso`, `/404`, `/500`.

## Design system
Read these before implementing any UI:
- Design principles: `/docs/design-principles.md` (11 principles — every judgment call references these)
- Style guide: `/docs/style-guide.md` (colors, typography, spacing, shadows, icons, components)
- Patterns library: `/docs/patterns-library.md` (tables, filters, charts, forms, loading states, truncation, context menus, toasts, keyboard nav)
- Theme config: `packages/shell/theme/vastu.theme.ts` (Mantine createTheme)
- CSS tokens: `packages/shell/theme/vastu.tokens.css` (--v-* custom properties)

## Phase workflow
- Active phase requirements: `/phases/phase-{N}/requirements.md`
- Always read requirements.md and plan.md before implementing anything.
- Update todo.md as you complete subtasks.
- Completion doc produced at end of phase: `/phases/phase-{N}/completion.md`

## Subagents
Seven specialized agents in `.claude/agents/`. Each runs in its own session.
- `architect` — reads requirements, produces plan.md. Read-only. Opus.
- `lead-engineer` — decomposes plan into issues + todo.md. Produces completion.md. Opus.
- `design-engineer` — UI components, design system compliance, accessibility. Sonnet.
- `dev-engineer` — feature implementation, business logic, tests. Sonnet.
- `qa-engineer` — E2E tests, edge cases, bug reports. Fresh context. Sonnet.
- `code-reviewer` — quality, security, patterns. Fresh context, read-only. Opus.
- `devops-engineer` — CI/CD, Docker, infrastructure. Sonnet.

## Common mistakes to avoid
- Importing from `@mantine/core` but using hardcoded colors instead of `--v-*` tokens.
- Creating one-off loading states instead of using the standard skeleton → content → error pattern.
- Forgetting to add `aria-label` on icon-only buttons.
- Using `useEffect` for data fetching instead of server components or TanStack Query.
- Writing inline styles for colors or spacing instead of using design tokens.
- Skipping the `TruncatedText` wrapper on data-driven text in constrained containers.
- Not running `pnpm lint --fix && pnpm typecheck` before committing.

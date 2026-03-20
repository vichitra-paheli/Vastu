# Phase 0: Foundation + Enterprise Shell

> Target: Weeks 1–8
> References: Wireframes (Groups A, C), Design Principles (all), Patterns Library (§9 Forms, §10 Toasts, §8 Empty states), Style Guide (full)

## Phase goal

When this phase is complete, a developer can clone the repo, run `docker compose up && pnpm dev`, authenticate via Keycloak (email/password or SSO), land on a functional settings/admin shell, manage users and roles, connect a database, generate API keys, and see a full audit trail — all styled with the Vastu design system, fully tested, and CI-gated. The workspace (Dockview, page templates, views) does not exist yet — the shell has a placeholder "Workspace coming soon" route.

---

## User stories

### Group 1: Infrastructure

#### US-001: Monorepo setup
**As a** developer, **I want** to clone the repo and have a working monorepo with all packages, build tooling, and dev scripts, **so that** I can start building features immediately.

**Acceptance criteria:**
- [ ] AC-1: Turborepo monorepo with four packages: `shell`, `workspace`, `shared`, `agent-runtime` (workspace and agent-runtime are empty stubs with package.json only)
- [ ] AC-2: `pnpm install` completes without errors
- [ ] AC-3: `pnpm build` builds all packages (shell and shared produce output)
- [ ] AC-4: `pnpm dev` starts the Next.js dev server on port 3000
- [ ] AC-5: `pnpm lint` runs ESLint + Prettier across all packages (zero errors on fresh repo)
- [ ] AC-6: `pnpm typecheck` runs TypeScript strict mode across all packages (zero errors)
- [ ] AC-7: Root `tsconfig.json` with path aliases (`@vastu/shared`, `@vastu/shell`)
- [ ] AC-8: `.nvmrc` set to Node 20, `engines` field in root package.json

**Notes:** Workspace package is an empty stub — it gets built in Phase 1. Agent-runtime is also a stub.

---

#### US-002: Docker development environment
**As a** developer, **I want** to run `docker compose up` and have all backing services ready, **so that** I don't need to install Postgres, Redis, or Keycloak locally.

**Acceptance criteria:**
- [ ] AC-1: `docker-compose.yml` starts PostgreSQL 16, Redis 7, Keycloak 24, and MinIO
- [ ] AC-2: PostgreSQL is accessible on localhost:5432 with default dev credentials in `.env.example`
- [ ] AC-3: Redis is accessible on localhost:6379
- [ ] AC-4: Keycloak admin console accessible on localhost:8080 with a pre-configured `vastu` realm
- [ ] AC-5: MinIO console accessible on localhost:9001 with a `vastu-uploads` bucket
- [ ] AC-6: Health check endpoints configured for all services
- [ ] AC-7: `.env.example` with all required environment variables documented
- [ ] AC-8: `docker compose down -v` cleanly removes all volumes

---

#### US-003: CI pipeline
**As a** developer, **I want** every push to run lint, typecheck, tests, and build automatically, **so that** broken code never reaches main.

**Acceptance criteria:**
- [ ] AC-1: GitHub Actions workflow triggers on push to any branch and on PR to main
- [ ] AC-2: Pipeline stages in order (fail fast): lint (30s target) → typecheck (45s) → unit tests (2min) → build (3min)
- [ ] AC-3: E2E test stage runs after build (added when first E2E tests exist in this phase)
- [ ] AC-4: Pipeline uses pnpm caching for fast installs
- [ ] AC-5: Service containers (Postgres, Redis) available for test stages
- [ ] AC-6: PR checks are required — cannot merge with red CI
- [ ] AC-7: Coverage report generated and posted as PR comment

---

#### US-004: Database schema and Prisma setup
**As a** developer, **I want** the core database schema defined in Prisma with migrations, **so that** all auth, user, tenant, and audit tables are ready.

**Acceptance criteria:**
- [ ] AC-1: Prisma schema in `packages/shared/prisma/schema.prisma`
- [ ] AC-2: Tables: `users`, `organizations`, `tenants`, `roles`, `user_roles`, `permissions`, `api_keys`, `db_connections`, `audit_events`, `sessions`
- [ ] AC-3: `pnpm prisma:migrate` creates all tables from a clean database
- [ ] AC-4: `pnpm prisma:seed` populates dev data: 1 org, 1 tenant, 3 users (admin, editor, viewer), 4 system roles, 2 DB connections, 2 API keys, 20 audit events
- [ ] AC-5: Prisma Client generated and importable as `@vastu/shared/prisma`
- [ ] AC-6: All foreign keys, indexes, and constraints defined (not just columns)
- [ ] AC-7: `created_at`, `updated_at` on all tables. Soft-delete via `deleted_at` on user-facing tables.

---

#### US-005: Design system deployment
**As a** developer, **I want** the Vastu design system tokens applied globally, **so that** all components use consistent colors, typography, spacing, and icons.

**Acceptance criteria:**
- [ ] AC-1: `vastu.theme.ts` (Mantine createTheme config) applied in the root MantineProvider
- [ ] AC-2: `vastu.tokens.css` imported globally — all `--v-*` custom properties available
- [ ] AC-3: Inter font loaded (weights 400, 500) via `next/font`
- [ ] AC-4: JetBrains Mono loaded for monospace contexts
- [ ] AC-5: Tabler Icons package installed and a core set of icons mapped (per style guide §8.4)
- [ ] AC-6: Dark mode toggle works — `[data-mantine-color-scheme='dark']` applies dark tokens
- [ ] AC-7: `TruncatedText` utility component implemented: ellipsis + tooltip on hover (per Patterns Library §7)
- [ ] AC-8: `EmptyState` component implemented: icon + message + action (per Patterns Library §8)
- [ ] AC-9: Toast notification wrapper configured with Mantine notifications (per Patterns Library §10)

**Wireframe:** N/A (system-level, visible in every screen)
**Patterns:** §7 Truncation, §8 Empty states, §10 Toast notifications

---

### Group 2: Authentication

#### US-006: Login
**As a** user, **I want** to sign in with email/password or SSO, **so that** I can access my workspace.

**Acceptance criteria:**
- [ ] AC-1: Login page at `/login` with Vastu branding split layout (40% brand panel with Kundli motif, 60% form)
- [ ] AC-2: Email/password form with validation (required fields, email format)
- [ ] AC-3: "Sign in with SSO" button (redirects to Keycloak)
- [ ] AC-4: "Forgot password?" link navigates to `/forgot-password`
- [ ] AC-5: "Create account" link navigates to `/register`
- [ ] AC-6: On success: redirect to `/workspace` (placeholder for now) or the originally requested URL
- [ ] AC-7: On failure: inline error message ("Invalid credentials" — not which field is wrong)
- [ ] AC-8: Session created via next-auth, stored in database strategy
- [ ] AC-9: CSRF protection on the login form

**Wireframe:** Group A, Screen 2 — Login
**Patterns:** §9 Forms

---

#### US-007: Registration
**As a** new user, **I want** to create an account and organization, **so that** I can start using Vastu.

**Acceptance criteria:**
- [ ] AC-1: Register page at `/register` with branding split layout
- [ ] AC-2: Fields: full name, organization name, work email, password, confirm password
- [ ] AC-3: Password strength indicator (4-segment bar: weak/fair/good/strong)
- [ ] AC-4: Terms and Privacy Policy checkbox (required)
- [ ] AC-5: On submit: creates user + organization + default tenant
- [ ] AC-6: Auto-assigns "Admin" role to the first user in an organization
- [ ] AC-7: Sends verification email (or skips in dev mode)
- [ ] AC-8: "Already have an account? Sign in" link

**Wireframe:** Group C, Screens 9-13 — Register variant

---

#### US-008: Password reset flow
**As a** user who forgot their password, **I want** to reset it via email, **so that** I can regain access.

**Acceptance criteria:**
- [ ] AC-1: Forgot password page at `/forgot-password` — email input + "Send reset link" button
- [ ] AC-2: On submit: sends reset email with tokenized link (Keycloak handles email)
- [ ] AC-3: Reset password page at `/reset-password?token=...` — new password + confirm fields
- [ ] AC-4: Token validation server-side. Expired token shows error with "Request new link" action
- [ ] AC-5: On success: redirect to login with "Password reset successfully" toast
- [ ] AC-6: "← Back to sign in" link on both pages

**Wireframe:** Group C — Forgot password + Reset password variants

---

#### US-009: Email verification
**As a** newly registered user, **I want** to verify my email, **so that** my account is activated.

**Acceptance criteria:**
- [ ] AC-1: Verification page at `/verify-email` — centered "Check your email" message with sent-to address
- [ ] AC-2: "Resend email" link with rate limiting (max 3 resends per 10 minutes)
- [ ] AC-3: Clicking the email link verifies the account and redirects to login
- [ ] AC-4: Expired verification link shows error with "Resend" action

**Wireframe:** Group C — Email verification variant

---

#### US-010: MFA setup and challenge
**As an** admin or security-conscious user, **I want** to enable two-factor authentication, **so that** my account is protected.

**Acceptance criteria:**
- [ ] AC-1: MFA setup page accessible from profile settings — QR code + manual secret key
- [ ] AC-2: Verification code input (6-digit) to confirm setup
- [ ] AC-3: Recovery codes displayed after setup (6 codes) with copy/download option
- [ ] AC-4: MFA challenge page at `/mfa` — 6-digit input boxes (3-3 pattern, auto-advance)
- [ ] AC-5: "Use recovery code" link as fallback
- [ ] AC-6: MFA can be enforced org-wide by admin (setting in SSO config)
- [ ] AC-7: "← Back to sign in" on challenge page

**Wireframe:** Group C — MFA setup + MFA challenge variants

---

#### US-011: SSO redirect
**As a** user whose organization uses SSO, **I want** to sign in via my identity provider, **so that** I don't need a separate password.

**Acceptance criteria:**
- [ ] AC-1: SSO page at `/sso` — email input to determine the provider
- [ ] AC-2: If single provider configured: redirect immediately after email entry
- [ ] AC-3: If multiple providers: show provider selection list (name + protocol badge)
- [ ] AC-4: Keycloak handles the SAML/OIDC redirect and callback
- [ ] AC-5: On success: session created, redirect to workspace

**Wireframe:** Group C — SSO redirect variant

---

#### US-012: Auth middleware and route protection
**As a** developer, **I want** all authenticated routes protected by middleware, **so that** unauthenticated users are redirected to login.

**Acceptance criteria:**
- [ ] AC-1: Next.js middleware protects all routes except `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/sso`, `/404`, `/500`
- [ ] AC-2: Unauthenticated access to protected routes redirects to `/login?redirect={originalUrl}`
- [ ] AC-3: After login, user is redirected to the originally requested URL (not always home)
- [ ] AC-4: Session expiry (configurable, default 24h) redirects to login with "Session expired" toast
- [ ] AC-5: CASL.js permissions loaded on session start from user's role(s)

---

### Group 3: Shell layout

#### US-013: Settings shell layout
**As a** user, **I want** a consistent layout for all settings and admin pages, **so that** navigation feels predictable.

**Acceptance criteria:**
- [ ] AC-1: Shell layout at `/settings/*` with: top bar (Vastu logo, "← Back to workspace" link, breadcrumb, user avatar menu), side nav, content area
- [ ] AC-2: Side nav sections: SETTINGS (Profile, Organization, DB Connections, API Keys, Appearance, SSO) and ADMIN (Users, Roles, Permissions, Tenants, Audit Log)
- [ ] AC-3: ADMIN section hidden for non-admin users (CASL.js check)
- [ ] AC-4: Active nav item highlighted with accent-primary
- [ ] AC-5: Breadcrumb updates per page: "Settings / Profile", "Admin / Users", etc.
- [ ] AC-6: User avatar menu: user name, email, role badge, "Sign out" action
- [ ] AC-7: "← Back to workspace" links to `/workspace` (placeholder page for now)
- [ ] AC-8: Responsive: side nav collapses to hamburger below 1024px

**Wireframe:** Group C, Screens 14-21 — shared shell layout

---

### Group 4: Settings pages

#### US-014: Profile settings
**As a** user, **I want** to edit my profile information, **so that** my account details are up to date.

**Acceptance criteria:**
- [ ] AC-1: Profile page at `/settings/profile`
- [ ] AC-2: Fields: avatar upload (circle with initials fallback), full name, email (read-only if SSO), language dropdown, timezone dropdown
- [ ] AC-3: "Change password" link (opens inline form or Keycloak redirect)
- [ ] AC-4: "Setup MFA" link (navigates to MFA setup if not enabled, shows "MFA enabled ✓" if active)
- [ ] AC-5: Save button (disabled until changes made, optimistic update with toast confirmation)
- [ ] AC-6: Inline validation on blur (name required, valid image format for avatar)

**Wireframe:** Group C — Profile settings

---

#### US-015: Organization settings
**As an** admin, **I want** to manage organization details, **so that** the workspace is correctly configured.

**Acceptance criteria:**
- [ ] AC-1: Org page at `/settings/organization` (admin-only, CASL-gated)
- [ ] AC-2: Fields: logo upload, organization name, workspace URL (read-only with edit option), default timezone dropdown, default language dropdown
- [ ] AC-3: "Delete organization" button (destructive confirmation dialog per Patterns Library §10)
- [ ] AC-4: Save button with optimistic update

**Wireframe:** Group C — Organization settings (from Group F wireframes)

---

#### US-016: Database connections
**As an** admin, **I want** to manage database connections, **so that** pages can be configured to read from external databases.

**Acceptance criteria:**
- [ ] AC-1: DB connections page at `/settings/databases`
- [ ] AC-2: List of connection cards showing: name, masked connection string, health status (Live/Idle/Error dot), protocol badge
- [ ] AC-3: "+ Add new" button opens a modal: name, host, port, database, username, password (masked), SSL toggle
- [ ] AC-4: "Test connection" button in the modal — shows success/failure inline with latency
- [ ] AC-5: Overflow menu (⋯) per card: Edit, Test connection, View schema (modal showing table list + column types), Delete (confirmation dialog)
- [ ] AC-6: Connection health polled every 60s (shows last-checked timestamp)
- [ ] AC-7: Connection credentials encrypted at rest in the database

**Wireframe:** Group C — Database connections

---

#### US-017: API keys
**As an** admin, **I want** to generate and manage API keys, **so that** external agents and integrations can access Vastu programmatically.

**Acceptance criteria:**
- [ ] AC-1: API keys page at `/settings/api-keys`
- [ ] AC-2: Table: name, masked key (`sk_live_...4f2a`), scope badge (Full/Read only), last used (relative time), overflow menu
- [ ] AC-3: "+ Generate" button opens modal: name input, scope selector (Full access / Read only), description
- [ ] AC-4: After generation: key displayed ONCE in a copyable field with warning "This key won't be shown again"
- [ ] AC-5: Overflow menu: Copy key ID, Revoke (warning confirmation dialog)
- [ ] AC-6: Keys stored as hashed values — raw key never persisted after initial display
- [ ] AC-7: Usage tracking: last used timestamp, request count (last 24h)

**Wireframe:** Group C — API keys

---

#### US-018: Appearance settings
**As a** user, **I want** to customize the app's visual appearance, **so that** it matches my preference.

**Acceptance criteria:**
- [ ] AC-1: Appearance page at `/settings/appearance`
- [ ] AC-2: Color scheme: segmented control (Light / Dark / System) — applies immediately
- [ ] AC-3: Primary accent color: swatch row (6-8 presets including default steel blue) + custom hex input
- [ ] AC-4: Density: segmented control (Compact / Comfortable / Spacious) — applies to table row heights globally
- [ ] AC-5: Preferences stored per-user in database, loaded on session start
- [ ] AC-6: Changes apply optimistically — no save button needed (auto-save on change)

**Wireframe:** Group C — Appearance

---

#### US-019: SSO configuration
**As an** admin, **I want** to configure identity providers, **so that** my team can sign in via SSO.

**Acceptance criteria:**
- [ ] AC-1: SSO config page at `/settings/sso` (admin-only)
- [ ] AC-2: List of configured provider cards: name, protocol badge (SAML/OIDC), status (Live/Draft), "Default" badge on primary provider, overflow menu
- [ ] AC-3: "+ Add provider" button opens modal: protocol selector (SAML/OIDC), metadata URL or manual config, client ID/secret, redirect URI
- [ ] AC-4: "Test connection" button per provider
- [ ] AC-5: Overflow menu: Edit, Test, Set as default, Delete
- [ ] AC-6: Enforcement toggle: "Require SSO for all users" checkbox (disables password login when checked)
- [ ] AC-7: SSO config stored encrypted in database

**Wireframe:** Group F — SSO configuration

---

### Group 5: Admin pages

#### US-020: User management
**As an** admin, **I want** to manage users in my organization, **so that** I can control who has access and what they can do.

**Acceptance criteria:**
- [ ] AC-1: Users page at `/admin/users` (admin-only)
- [ ] AC-2: Search input + Role dropdown filter + Status dropdown filter
- [ ] AC-3: Table: avatar + name, email, role badge (Admin/Builder/Editor/Viewer + custom), status dot (Active/Pending/Deactivated)
- [ ] AC-4: "+ Invite user" button opens modal: email input (supports multiple comma-separated), role selector, optional message
- [ ] AC-5: Click row opens edit drawer: name, email (read-only), role dropdown, deactivate toggle, "Reset password" action, "Remove from org" action (destructive confirmation)
- [ ] AC-6: Invite sends email via Keycloak. Pending users show in list with "Pending" status.
- [ ] AC-7: Cannot deactivate the last admin user (validation prevents it)

**Wireframe:** Group C — User management

---

#### US-021: Role management
**As an** admin, **I want** to define roles with specific permissions, **so that** access control is granular.

**Acceptance criteria:**
- [ ] AC-1: Roles page at `/admin/roles` (admin-only)
- [ ] AC-2: Role cards showing: name, system/custom badge, user count, description, overflow menu
- [ ] AC-3: System roles (Admin, Builder, Editor, Viewer) are read-only — cannot be edited or deleted
- [ ] AC-4: "+ Create role" button opens modal: name, description, base role (inherit from), permission overrides
- [ ] AC-5: Overflow menu for custom roles: Edit, Duplicate, View users, Delete (confirmation dialog)
- [ ] AC-6: Editing a custom role shows a permission checklist (CRUD per resource type)
- [ ] AC-7: Role changes take effect on next page load for affected users

**Wireframe:** Group F — Role management

---

#### US-022: Permission matrix
**As an** admin, **I want** to see and edit all role permissions in a grid, **so that** I can audit access at a glance.

**Acceptance criteria:**
- [ ] AC-1: Permissions page at `/admin/permissions` (admin-only)
- [ ] AC-2: Matrix grid: rows = resource types (Orders, Customers, Settings, etc.), columns = roles
- [ ] AC-3: Cells show CRUD permission badges (V=View, E=Edit, D=Delete, X=Export) — green for granted, gray for denied
- [ ] AC-4: System role columns are read-only. Custom role columns are editable (click to toggle)
- [ ] AC-5: Conditional permissions highlighted in amber with tooltip explaining the scope (e.g., "region = assigned")
- [ ] AC-6: Legend at bottom: V/E/D/X meanings, color coding
- [ ] AC-7: "Export matrix" button exports as CSV
- [ ] AC-8: Changes require explicit Save + confirmation dialog ("This affects N users")

**Wireframe:** Group F — Permission matrix

---

#### US-023: Tenant management
**As an** admin, **I want** to manage multiple tenants, **so that** my organization can isolate data by team or region.

**Acceptance criteria:**
- [ ] AC-1: Tenants page at `/admin/tenants` (admin-only)
- [ ] AC-2: Tenant cards showing: name, status badge (Active/Sandbox), user count, page count, subdomain, created date
- [ ] AC-3: Current tenant highlighted with accent-primary border
- [ ] AC-4: "Switch" button on non-current tenants — switches context (reloads workspace with that tenant's data)
- [ ] AC-5: "+ Create tenant" modal: name, subdomain, region, DB isolation mode (shared schema / separate schema / separate DB)
- [ ] AC-6: Overflow menu: Edit, View users, Archive (soft-delete with confirmation)
- [ ] AC-7: At least one tenant must exist (cannot delete the last active tenant)

**Wireframe:** Group F — Tenant management

---

#### US-024: Audit log
**As an** admin, **I want** to see a complete audit trail, **so that** I can track who did what and when.

**Acceptance criteria:**
- [ ] AC-1: Audit log page at `/admin/audit-log` (admin-only)
- [ ] AC-2: Filters: date range picker, user dropdown, action type dropdown (Create/Update/Delete/Login/Export), resource type dropdown
- [ ] AC-3: Table: timestamp (monospace), user name, action badge (color-coded: Create=green, Update=blue, Delete=red, Login=slate, Export=slate), resource description
- [ ] AC-4: Click row opens detail drawer: full event payload JSON, before/after diff (for updates), IP address, user agent
- [ ] AC-5: "Export CSV" button exports filtered results
- [ ] AC-6: Audit log is immutable — no edit/delete actions on entries
- [ ] AC-7: Every user action in this phase (login, user invite, role change, setting update, API key create, DB connection test) writes an audit event
- [ ] AC-8: Pagination: server-side, 50 rows per page default

**Wireframe:** Group C — Audit log

---

### Group 6: Error pages

#### US-025: Error pages
**As a** user, **I want** clear error pages when something goes wrong, **so that** I know what happened and what to do.

**Acceptance criteria:**
- [ ] AC-1: 404 page: Vastu logo, "Page not found", "Go to workspace" + "Go back" links, subtle Kundli motif in background
- [ ] AC-2: 500 page: Vastu logo, "Something went wrong", "Try again" button + "Go to workspace" link
- [ ] AC-3: Both pages are self-contained (no sidebar, no shell layout — work even if layout errors)
- [ ] AC-4: Next.js `not-found.tsx` and `error.tsx` files configured

**Wireframe:** Group C — Error pages (from spec)

---

### Group 7: Workspace placeholder

#### US-026: Workspace placeholder
**As a** developer, **I want** a placeholder workspace page, **so that** the auth redirect has a destination and Phase 1 has a mounting point.

**Acceptance criteria:**
- [ ] AC-1: Workspace page at `/workspace` — shows "Workspace" heading + empty state message: "The workspace is being built in Phase 1. This is where Dockview, page templates, and the view engine will live."
- [ ] AC-2: Page is protected (requires authentication)
- [ ] AC-3: Page uses the workspace package's root layout (even if it's just a bare shell)
- [ ] AC-4: Sidebar placeholder showing the collapsed icon rail (48px) with Vastu logo + a single "Settings" icon that links to `/settings`

---

## Technical constraints

- Next.js App Router (not Pages Router). Server components by default, `"use client"` only where interactivity requires it.
- All auth flows through Keycloak — no custom auth implementation. Use `next-auth` with Keycloak provider.
- Prisma as the only database access layer — no raw SQL queries.
- All form validation via `@mantine/form` — no custom validation libraries.
- All tables in this phase use basic Mantine `Table` component (the custom `VastuTable` with TanStack Table is Phase 1+ when we need view state serialization).
- All pages are SSR (server-rendered) — no client-side data fetching for initial page loads. Use Next.js `generateMetadata` for SEO.
- i18n: English only in Phase 0. But all user-facing strings must go through a translation function (`t('key')`) so i18n can be added later without rewriting every page.

## Out of scope

- Dockview workspace (Phase 1)
- Page templates: table listing, dashboard, detail, explorer, form, timeline (Phase 1+)
- View state engine (Phase 1)
- Builder mode (Phase 2)
- Workflow mode / React Flow (Phase 3)
- Agent panel / AG-UI / LangGraph (Phase 3)
- MCP server (Phase 4)
- Command palette / Spotlight (Phase 1)
- Tray bar (Phase 1)
- Workspace sidebar with page navigation (Phase 1)
- OpenTelemetry / monitoring (Phase 4)
- Notification subsystem beyond toasts (Phase 2)
- Real-time features / WebSocket (Phase 2+)
- Approval workflows (out of v1 entirely)

## Definition of done

- [ ] All 26 user stories implemented with acceptance criteria met
- [ ] Unit test coverage ≥ 80% on new code
- [ ] E2E tests for: login flow, registration flow, password reset flow, MFA flow, user invite flow, API key generation, audit log filtering
- [ ] All code passes lint, typecheck, and CI pipeline
- [ ] Design system applied: all colors via `--v-*` tokens, Inter font rendered, dark mode toggle works, TruncatedText and EmptyState components functional
- [ ] All admin pages CASL-gated (viewer/editor cannot access)
- [ ] Audit logging active for all user actions
- [ ] Docker Compose starts all services cleanly from scratch
- [ ] Seed data creates a usable development environment
- [ ] No regressions (this is Phase 0 — there's nothing to regress against, but CI must be green)
- [ ] Phase completion document produced with story-by-story verification

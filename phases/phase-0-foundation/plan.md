# Phase 0: Foundation + Enterprise Shell — Implementation Plan

> Produced by: Architect agent
> Date: 2026-03-18
> Based on: `/phases/phase-0-foundation/requirements.md`, design system docs, wireframes (Groups A, C, F)
> Branch: `feature/phase-0`

---

## 1. Overview

Phase 0 delivers the foundational infrastructure and enterprise shell for Vastu. On completion, a developer can clone the repo, run `docker compose up && pnpm dev`, authenticate via Keycloak, navigate the settings/admin shell, manage users and roles, connect databases, generate API keys, and review an audit log. The workspace is a placeholder.

**What ships:**
- Turborepo monorepo with 4 packages (shell, workspace stub, shared, agent-runtime stub)
- Docker Compose for PostgreSQL, Redis, Keycloak, MinIO
- GitHub Actions CI pipeline
- Prisma schema with 10 tables, migrations, and seed data
- Vastu design system: theme, tokens, fonts, TruncatedText, EmptyState, toast config
- Full auth flow: login, register, password reset, email verification, MFA, SSO, middleware
- Settings shell layout with side nav and top bar
- 6 settings pages: Profile, Organization, DB Connections, API Keys, Appearance, SSO
- 5 admin pages: Users, Roles, Permissions, Tenants, Audit Log
- 404 and 500 error pages
- Workspace placeholder page
- CASL-based permission gating on all admin routes
- Audit logging for all user actions
- 80%+ test coverage, E2E tests for critical flows

---

## 2. Dependency Graph

```
US-001 (Monorepo) ──────────────────────────────────────────────────┐
US-002 (Docker) ────────────────────────────────────────────────────┤
                                                                    ▼
US-003 (CI) ◄── depends on US-001, US-002                          │
US-004 (DB Schema) ◄── depends on US-001, US-002                   │
US-005 (Design System) ◄── depends on US-001                       │
                                                                    ▼
US-012 (Auth Middleware) ◄── depends on US-004, US-005             │
US-006 (Login) ◄── depends on US-005, US-012                       │
US-007 (Register) ◄── depends on US-006                            │
US-008 (Password Reset) ◄── depends on US-006                      │
US-009 (Email Verify) ◄── depends on US-007                        │
US-010 (MFA) ◄── depends on US-006                                 │
US-011 (SSO Redirect) ◄── depends on US-006                        │
                                                                    ▼
US-013 (Shell Layout) ◄── depends on US-005, US-012                │
US-025 (Error Pages) ◄── depends on US-005                         │
US-026 (Workspace Placeholder) ◄── depends on US-005, US-012       │
                                                                    ▼
US-014 (Profile) ◄── depends on US-013                             │
US-015 (Organization) ◄── depends on US-013                        │
US-016 (DB Connections) ◄── depends on US-013                      │
US-017 (API Keys) ◄── depends on US-013                            │
US-018 (Appearance) ◄── depends on US-013                          │
US-019 (SSO Config) ◄── depends on US-013                          │
                                                                    ▼
US-020 (Users) ◄── depends on US-013                               │
US-021 (Roles) ◄── depends on US-013                               │
US-022 (Permissions) ◄── depends on US-021                         │
US-023 (Tenants) ◄── depends on US-013                             │
US-024 (Audit Log) ◄── depends on US-013, all other stories emit events
```

---

## 3. Implementation Layers (Ordered)

### Layer 0: Infrastructure (US-001, US-002, US-003)
### Layer 1: Schema + Design System (US-004, US-005)
### Layer 2: Auth Foundation (US-012, US-006)
### Layer 3: Auth Variants (US-007, US-008, US-009, US-010, US-011)
### Layer 4: Shell + Error Pages (US-013, US-025, US-026)
### Layer 5: Settings Pages (US-014, US-015, US-016, US-017, US-018, US-019)
### Layer 6: Admin Pages (US-020, US-021, US-022, US-023, US-024)

---

## 4. Per-Story Plans

---

### US-001: Monorepo Setup

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `package.json` (root) | root | New | pnpm workspace, scripts, engines (Node 20) |
| `pnpm-workspace.yaml` | root | New | packages/* glob |
| `turbo.json` | root | New | Pipeline: build, lint, test, typecheck, dev |
| `tsconfig.json` (root) | root | New | Path aliases: `@vastu/shared`, `@vastu/shell` |
| `.nvmrc` | root | New | `20` |
| `.eslintrc.js` (root) | root | New | Shared ESLint config (TypeScript, React, Prettier) |
| `.prettierrc` | root | New | Consistent formatting |
| `.gitignore` | root | New | node_modules, .next, dist, .env |
| `packages/shell/package.json` | shell | New | Next.js 14, Mantine v7, next-auth, CASL deps |
| `packages/shell/tsconfig.json` | shell | New | Extends root, Next.js specific |
| `packages/shell/next.config.js` | shell | New | transpilePackages: ['@vastu/shared'] |
| `packages/shared/package.json` | shared | New | Prisma, CASL, vitest deps |
| `packages/shared/tsconfig.json` | shared | New | Extends root, lib target |
| `packages/shared/src/index.ts` | shared | New | Re-exports |
| `packages/workspace/package.json` | workspace | New | Stub: name only |
| `packages/agent-runtime/package.json` | agent-runtime | New | Stub: name only |
| `packages/agent-runtime/src/index.ts` | agent-runtime | New | Empty export |

#### Database changes
None.

#### API/MCP surface
None.

#### State management
None.

#### Component hierarchy
N/A (infrastructure only).

#### Design system mapping
N/A.

#### Edge cases
- pnpm version mismatch: specify `packageManager` field in root `package.json`.
- Windows path issues: ensure forward slashes in tsconfig path aliases.

#### Testing strategy
- Smoke test: `pnpm install && pnpm build && pnpm lint && pnpm typecheck` succeed with zero errors.

#### Estimated complexity
- Root config files: M (100-300 lines total across all configs)
- Package scaffolding: S per package

---

### US-002: Docker Development Environment

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `docker-compose.yml` | root | New | PostgreSQL 16, Redis 7, Keycloak 24, MinIO |
| `docker/keycloak/realm-export.json` | root | New | Pre-configured `vastu` realm with client `vastu-app` |
| `.env.example` | root | Modify | Already exists; verify all vars documented |

#### Database changes
None (Docker just runs the services).

#### API/MCP surface
None.

#### Edge cases
- Keycloak realm import must include the `vastu-app` client with correct redirect URIs (`http://localhost:3000/*`).
- MinIO bucket `vastu-uploads` must be auto-created on first run.
- Health checks: PostgreSQL `pg_isready`, Redis `redis-cli ping`, Keycloak `/health/ready`, MinIO `/minio/health/live`.
- Port conflicts on host: document in `.env.example` how to override ports.

#### Testing strategy
- Manual: `docker compose up -d` then verify each service is accessible.
- CI: Service containers for Postgres and Redis in GitHub Actions.

#### Estimated complexity
- `docker-compose.yml`: M
- Keycloak realm export: M

---

### US-003: CI Pipeline

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `.github/workflows/ci.yml` | root | New | GitHub Actions workflow |

#### Edge cases
- pnpm caching: use `pnpm/action-setup` + `actions/cache` with pnpm store path.
- Service containers for Postgres and Redis during test stage.
- Coverage report: use vitest coverage output + a PR comment action.

#### Testing strategy
- The CI pipeline itself is the test infrastructure. Validate it runs successfully on a PR.

#### Estimated complexity
- S (single workflow file, ~80 lines)

---

### US-004: Database Schema and Prisma Setup

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shared/prisma/schema.prisma` | shared | New | 10 tables |
| `packages/shared/prisma/seed.ts` | shared | New | Dev seed data |
| `packages/shared/src/prisma/client.ts` | shared | New | Singleton Prisma client export |
| `packages/shared/src/types/user.ts` | shared | New | User, Role, Permission types |
| `packages/shared/src/types/tenant.ts` | shared | New | Tenant, Organization types |
| `packages/shared/src/types/audit.ts` | shared | New | AuditEvent types |
| `packages/shared/src/types/api-key.ts` | shared | New | ApiKey types |
| `packages/shared/src/types/db-connection.ts` | shared | New | DatabaseConnection types |
| `packages/shared/src/types/index.ts` | shared | New | Re-exports |
| `packages/shared/src/index.ts` | shared | Modify | Re-export types and prisma |

#### Database changes

**Tables (all have `id` UUID PK, `created_at`, `updated_at`):**

| Table | Columns | Soft-delete | Notes |
|-------|---------|-------------|-------|
| `users` | `id`, `email`, `name`, `avatar_url`, `email_verified`, `mfa_enabled`, `mfa_secret`, `language`, `timezone`, `color_scheme`, `accent_color`, `density`, `organization_id`, `created_at`, `updated_at`, `deleted_at` | Yes | |
| `organizations` | `id`, `name`, `logo_url`, `workspace_url`, `default_timezone`, `default_language`, `created_at`, `updated_at` | No | |
| `tenants` | `id`, `name`, `subdomain`, `status` (Active/Sandbox), `region`, `db_isolation_mode`, `organization_id`, `created_at`, `updated_at`, `deleted_at` | Yes | |
| `roles` | `id`, `name`, `description`, `is_system`, `base_role_id`, `organization_id`, `created_at`, `updated_at` | No | System roles: Admin, Builder, Editor, Viewer |
| `user_roles` | `id`, `user_id`, `role_id`, `tenant_id`, `created_at`, `updated_at` | No | Junction table |
| `permissions` | `id`, `role_id`, `resource`, `action`, `granted`, `conditions`, `created_at`, `updated_at` | No | CASL-compatible |
| `api_keys` | `id`, `name`, `key_hash`, `key_prefix`, `scope`, `description`, `last_used_at`, `request_count_24h`, `user_id`, `organization_id`, `created_at`, `updated_at`, `deleted_at` | Yes | Key stored hashed only |
| `db_connections` | `id`, `name`, `host`, `port`, `database`, `username`, `encrypted_password`, `ssl_enabled`, `protocol`, `health_status`, `last_health_check`, `organization_id`, `created_at`, `updated_at`, `deleted_at` | Yes | Password encrypted at rest |
| `audit_events` | `id`, `user_id`, `user_name`, `action`, `resource_type`, `resource_id`, `resource_description`, `payload`, `before_state`, `after_state`, `ip_address`, `user_agent`, `tenant_id`, `organization_id`, `created_at` | No | Immutable, append-only (no `updated_at`) |
| `sessions` | Managed by next-auth adapter | No | TTL-based |

WARNING: The `sessions` table should use the `@next-auth/prisma-adapter` schema. Also need `accounts` and `verification_tokens` tables for next-auth.

**Seed data:** 1 org ("Acme Corp"), 1 tenant ("Default"), 3 users (admin@vastu.dev, editor@vastu.dev, viewer@vastu.dev), 4 system roles, permissions for each system role, 2 DB connections, 2 API keys, 20 audit events.

#### API/MCP surface
None directly. Prisma client is the data access layer.

#### Testing strategy
- Unit test: seed script is idempotent (run twice, verify same state).
- Unit test: Prisma client can connect and query.
- Test constraint violations (unique email, FK integrity).

#### Estimated complexity
- Schema: L (300-500 lines)
- Seed: L
- Types: M (across 5 files)
- Prisma client: S

---

### US-005: Design System Deployment

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/theme/vastu.theme.ts` | shell | New | Mantine `createTheme` config |
| `packages/shell/src/theme/vastu.tokens.css` | shell | New | All `--v-*` CSS custom properties |
| `packages/shell/src/app/layout.tsx` | shell | New | Root layout: MantineProvider, fonts, notifications, global CSS |
| `packages/shell/src/components/shared/TruncatedText.tsx` | shell | New | Ellipsis + tooltip on hover |
| `packages/shell/src/components/shared/TruncatedText.module.css` | shell | New | Truncation styles |
| `packages/shell/src/components/shared/EmptyState.tsx` | shell | New | Icon + message + action |
| `packages/shell/src/components/shared/ConfirmDialog.tsx` | shell | New | Destructive action confirmation |
| `packages/shell/src/lib/notifications.ts` | shell | New | Toast notification helper (success, error, warning, info) |
| `packages/shell/src/lib/i18n.ts` | shell | New | `t()` function stub (returns key for now, wraps for future i18n) |
| `packages/shell/src/components/shared/__tests__/TruncatedText.test.tsx` | shell | New | Component test |
| `packages/shell/src/components/shared/__tests__/EmptyState.test.tsx` | shell | New | Component test |
| `packages/shell/src/test-utils/providers.tsx` | shell | New | Test wrapper with MantineProvider |

#### Design system mapping
- `TruncatedText`: Patterns Library SS 7 — system-wide truncation with 300ms hover delay tooltip
- `EmptyState`: Patterns Library SS 8 — icon (32px, `--v-text-tertiary`) + message (`--v-text-secondary`) + action button
- `ConfirmDialog`: Style Guide SS 9.1 `Modal` + destructive button color coding
- Toast config: Patterns Library SS 10 — bottom-right, max 3 visible, auto-dismiss timers per type
- Theme: Style Guide SS 1-7 (all color tokens, typography, spacing, radii, shadows, motion, z-index)
- Fonts: Inter (400, 500) via `next/font/google`, JetBrains Mono via `next/font/google`

#### Edge cases
- Dark mode: `vastu.tokens.css` must define both light and dark values using `[data-mantine-color-scheme='dark']` selector.
- `prefers-reduced-motion`: included in `vastu.tokens.css` per Style Guide SS 7.4.
- TruncatedText with very short container: tooltip must still show full text even if text isn't visually truncated (use `scrollWidth > clientWidth` check).

#### Testing strategy
- Component test: TruncatedText renders ellipsis and shows tooltip on hover.
- Component test: EmptyState renders icon, message, and action; action click fires callback.
- Component test: ConfirmDialog renders impact text, confirm triggers callback, cancel closes.
- Visual: dark mode toggle switches token values.

#### Estimated complexity
- Theme + tokens: M
- Root layout: M
- TruncatedText: S
- EmptyState: S
- ConfirmDialog: S
- Notification helper: S
- i18n stub: S

---

### US-006: Login

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(auth)/layout.tsx` | shell | New | Auth split layout: 40% brand panel, 60% form |
| `packages/shell/src/components/auth/BrandingPanel.tsx` | shell | New | Vastu logo, tagline, Kundli motif SVG |
| `packages/shell/src/components/auth/KundliMotif.tsx` | shell | New | Inline SVG per wireframe Group A, Screen 2 |
| `packages/shell/src/app/(auth)/login/page.tsx` | shell | New | Login page server component with metadata |
| `packages/shell/src/components/auth/LoginForm.tsx` | shell | New | `"use client"` — email/password form + SSO button |
| `packages/shell/src/lib/auth.ts` | shell | New | next-auth config: Keycloak provider, Prisma adapter, session callbacks |
| `packages/shell/src/app/api/auth/[...nextauth]/route.ts` | shell | New | next-auth API route handler |
| `packages/shell/src/components/auth/__tests__/LoginForm.test.tsx` | shell | New | |

#### Database changes
None (uses next-auth tables from US-004).

#### API/MCP surface
- `POST /api/auth/callback/keycloak` — next-auth handles this
- `POST /api/auth/signin` — next-auth handles this
- `POST /api/auth/signout` — next-auth handles this

#### State management
None (server component + next-auth session).

#### Component hierarchy
```
(auth)/layout.tsx
  ├── BrandingPanel
  │     └── KundliMotif
  └── {children}  (page content)
        └── login/page.tsx
              └── LoginForm (client component)
```

#### Design system mapping
- Wireframe: Group A, Screen 2 — Login. 40/60 split, Kundli motif with colored node vertices.
- Wireframe: Group C, Screens 9-13 — auth variants all reuse same split layout.
- Forms: Patterns Library SS 9 — inline validation on blur, `*` for required fields.
- Toasts: Patterns Library SS 10 — error toast for failed login.

#### Edge cases
- Invalid credentials: show generic "Invalid credentials" (never reveal which field is wrong) per AC-7.
- CSRF: next-auth includes CSRF token by default.
- Redirect after login: read `redirect` query param, validate it's a relative URL (prevent open redirect).
- Session already exists: if user visits `/login` while authenticated, redirect to `/workspace`.
- Keycloak unavailable: show connection error with retry.

#### Testing strategy
- Component test: LoginForm renders email, password fields, SSO button.
- Component test: LoginForm shows validation errors on blur (empty email, empty password).
- Component test: LoginForm shows generic error on failed submission.
- E2E: Full login flow with test credentials from seed data.

#### Estimated complexity
- Auth layout: M
- BrandingPanel + KundliMotif: M
- LoginForm: M
- auth.ts config: M
- API route: S

---

### US-007: Registration

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(auth)/register/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/auth/RegisterForm.tsx` | shell | New | `"use client"` |
| `packages/shell/src/components/auth/PasswordStrengthBar.tsx` | shell | New | 4-segment bar |
| `packages/shell/src/app/api/auth/register/route.ts` | shell | New | Server action: create user + org + tenant |
| `packages/shared/src/utils/validation.ts` | shared | New | Password strength calculator, email validation |
| `packages/shell/src/components/auth/__tests__/RegisterForm.test.tsx` | shell | New | |

#### Database changes
None (uses existing tables).

#### API/MCP surface
- `POST /api/auth/register` — creates user, organization, default tenant, assigns Admin role.

#### Component hierarchy
```
(auth)/layout.tsx
  └── register/page.tsx
        └── RegisterForm (client)
              └── PasswordStrengthBar
```

#### Design system mapping
- Wireframe: Group C, Screen 9-13 — Register variant.
- Forms: Patterns Library SS 9 — inline validation on blur.
- Password strength: 4-segment bar (weak=red, fair=orange, good=blue, strong=green).

#### Edge cases
- Email already registered: server-side validation, inline error.
- Organization name already taken: server-side validation.
- Terms checkbox unchecked: prevent submission, show error.
- Password mismatch: inline error on confirm password blur.
- Concurrent registration with same email: database unique constraint catches it.

#### Testing strategy
- Component test: RegisterForm validates all fields on blur.
- Component test: PasswordStrengthBar shows correct segments for various passwords.
- Unit test: password strength calculation.
- E2E: Full registration flow.

#### Estimated complexity
- RegisterForm: M
- PasswordStrengthBar: S
- API route: M
- Validation utils: S

---

### US-008: Password Reset Flow

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(auth)/forgot-password/page.tsx` | shell | New | |
| `packages/shell/src/components/auth/ForgotPasswordForm.tsx` | shell | New | `"use client"` |
| `packages/shell/src/app/(auth)/reset-password/page.tsx` | shell | New | |
| `packages/shell/src/components/auth/ResetPasswordForm.tsx` | shell | New | `"use client"` |
| `packages/shell/src/app/api/auth/forgot-password/route.ts` | shell | New | Sends reset email via Keycloak |
| `packages/shell/src/app/api/auth/reset-password/route.ts` | shell | New | Validates token, sets new password |

#### Design system mapping
- Wireframe: Group C — Forgot password, Reset password variants.
- Forms: Patterns Library SS 9.

#### Edge cases
- Expired token: show error with "Request new link" action per AC-4.
- Non-existent email: still show "If this email exists, we sent a link" (prevent email enumeration).
- Token reuse: invalidate token after successful reset.

#### Testing strategy
- Component test: forms validate inputs.
- E2E: forgot password -> reset password flow.

#### Estimated complexity
- ForgotPasswordForm: S
- ResetPasswordForm: S
- API routes: S each

---

### US-009: Email Verification

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(auth)/verify-email/page.tsx` | shell | New | |
| `packages/shell/src/components/auth/VerifyEmailContent.tsx` | shell | New | `"use client"` — resend logic |
| `packages/shell/src/app/api/auth/verify-email/route.ts` | shell | New | Handles email link click |
| `packages/shell/src/app/api/auth/resend-verification/route.ts` | shell | New | Rate-limited resend |

#### Edge cases
- Rate limiting: max 3 resends per 10 minutes per AC-2. Track in Redis or database.
- Expired verification link: show error with "Resend" action.
- Already verified: redirect to login with "Already verified" toast.
- Dev mode: skip actual email sending, log verification link to console.

#### Testing strategy
- Component test: VerifyEmailContent shows email address, resend link.
- Unit test: rate limiter logic.

#### Estimated complexity
- S per file (4 files total)

---

### US-010: MFA Setup and Challenge

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(auth)/mfa/page.tsx` | shell | New | MFA challenge page |
| `packages/shell/src/components/auth/MfaChallengeForm.tsx` | shell | New | `"use client"` — 6-digit input (3-3 pattern) |
| `packages/shell/src/components/auth/MfaSetupWizard.tsx` | shell | New | `"use client"` — QR code + manual key + verify + recovery codes |
| `packages/shell/src/components/auth/OtpInput.tsx` | shell | New | Reusable 6-digit OTP input with auto-advance |
| `packages/shell/src/components/auth/RecoveryCodes.tsx` | shell | New | Display + copy/download recovery codes |
| `packages/shell/src/app/api/auth/mfa/setup/route.ts` | shell | New | Generate TOTP secret + QR code |
| `packages/shell/src/app/api/auth/mfa/verify/route.ts` | shell | New | Verify TOTP code |
| `packages/shell/src/app/api/auth/mfa/recovery/route.ts` | shell | New | Verify recovery code |
| `packages/shared/src/utils/crypto.ts` | shared | New | TOTP generation, API key hashing, token generation |

WARNING: HUMAN DECISION NEEDED -- TOTP implementation requires a library (e.g., `otplib` or `speakeasy`). This is a new external dependency not currently in the stack. Recommend `otplib` (lightweight, maintained, TypeScript-native).

WARNING: HUMAN DECISION NEEDED -- QR code generation requires a library (e.g., `qrcode`). This is a new external dependency. Recommend `qrcode` (standard, small).

#### Design system mapping
- Wireframe: Group C — MFA challenge (3-3 digit pattern with dash separator, auto-advance focus).
- Wireframe: Group C — MFA setup (QR code + manual secret key display).

#### Edge cases
- Invalid TOTP code: show inline error, allow retry.
- All recovery codes used: force MFA re-setup.
- MFA enforced org-wide: non-MFA users redirected to setup on next login.
- Clock skew: TOTP should allow 1 step tolerance (30s window).

#### Testing strategy
- Unit test: TOTP generation and verification.
- Component test: OtpInput auto-advances focus, handles paste of 6 digits.
- E2E: MFA setup flow, MFA challenge flow.

#### Estimated complexity
- MfaChallengeForm: M
- MfaSetupWizard: L
- OtpInput: M
- RecoveryCodes: S
- API routes: S each
- Crypto utils: M

---

### US-011: SSO Redirect

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(auth)/sso/page.tsx` | shell | New | |
| `packages/shell/src/components/auth/SsoForm.tsx` | shell | New | `"use client"` — email input + provider selection |
| `packages/shell/src/app/api/auth/sso/providers/route.ts` | shell | New | Lookup providers by email domain |

#### Design system mapping
- Wireframe: Group C — SSO redirect variant.

#### Edge cases
- No SSO provider configured for domain: show error "No SSO provider found for this email domain."
- Multiple providers: show selection list with protocol badges (SAML/OIDC).
- Single provider: auto-redirect after email entry per AC-2.

#### Testing strategy
- Component test: SsoForm renders email input, shows providers on domain match.

#### Estimated complexity
- S per file

---

### US-012: Auth Middleware and Route Protection

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/middleware.ts` | shell | New | Next.js middleware for route protection |
| `packages/shared/src/permissions/abilities.ts` | shared | New | CASL ability factory |
| `packages/shared/src/permissions/resources.ts` | shared | New | Resource type definitions |
| `packages/shared/src/permissions/actions.ts` | shared | New | Action definitions |
| `packages/shared/src/permissions/index.ts` | shared | New | Re-exports |
| `packages/shell/src/lib/session.ts` | shell | New | Helper to get session with CASL abilities |
| `packages/shared/src/permissions/__tests__/abilities.test.ts` | shared | New | |

#### State management
CASL abilities are derived from user roles on session start and passed via next-auth session callback. On the client side, abilities are available via a React context or hook.

#### Edge cases
- Session expired: redirect to `/login` with "Session expired" toast (via query param `?expired=true`).
- Session in cookie but user deleted in DB: middleware checks session validity against DB.
- Redirect loop: if user is on `/login` and already authenticated, redirect to `/workspace`.
- Public routes must be precisely matched to prevent bypasses.

#### Testing strategy
- Unit test: CASL ability factory for all 4 system roles (Admin, Builder, Editor, Viewer).
- Unit test: middleware redirects unauthenticated users.
- Unit test: middleware allows public routes.
- E2E: verify non-admin user cannot access `/admin/*` routes.

#### Estimated complexity
- Middleware: M
- CASL abilities: M
- Session helper: S
- Tests: M

---

### US-013: Settings Shell Layout

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/layout.tsx` | shell | New | Shell layout wrapper (top bar + side nav + content) |
| `packages/shell/src/app/(shell)/settings/layout.tsx` | shell | New | Settings route group layout |
| `packages/shell/src/app/(shell)/admin/layout.tsx` | shell | New | Admin route group layout (CASL gate) |
| `packages/shell/src/components/shell/TopBar.tsx` | shell | New | Logo, back-to-workspace link, breadcrumb, user avatar menu |
| `packages/shell/src/components/shell/SideNav.tsx` | shell | New | Settings + Admin sections |
| `packages/shell/src/components/shell/SideNavItem.tsx` | shell | New | Individual nav item with active state |
| `packages/shell/src/components/shell/UserMenu.tsx` | shell | New | `"use client"` — avatar dropdown menu |
| `packages/shell/src/components/shell/Breadcrumb.tsx` | shell | New | Dynamic breadcrumb from route |
| `packages/shell/src/components/shell/__tests__/SideNav.test.tsx` | shell | New | |
| `packages/shell/src/components/shell/__tests__/TopBar.test.tsx` | shell | New | |

Note: The requirements specify settings pages at `/settings/*` and admin pages at `/admin/*`. Both share the same shell layout. Using a `(shell)` route group to wrap them in a shared layout.

#### Component hierarchy
```
(shell)/layout.tsx
  ├── TopBar
  │     ├── Logo (link to /workspace)
  │     ├── "← Back to workspace" link
  │     ├── Breadcrumb
  │     └── UserMenu (client component)
  ├── SideNav
  │     ├── SETTINGS section
  │     │     ├── SideNavItem (Profile)
  │     │     ├── SideNavItem (Organization)
  │     │     ├── SideNavItem (DB Connections)
  │     │     ├── SideNavItem (API Keys)
  │     │     ├── SideNavItem (Appearance)
  │     │     └── SideNavItem (SSO)
  │     └── ADMIN section (CASL-gated)
  │           ├── SideNavItem (Users)
  │           ├── SideNavItem (Roles)
  │           ├── SideNavItem (Permissions)
  │           ├── SideNavItem (Tenants)
  │           └── SideNavItem (Audit Log)
  └── <main> content area
        └── {children}
```

#### Design system mapping
- Wireframe: Group C, Screens 14-21 — shared shell layout (top bar, side nav, content area).
- Active nav: `--v-accent-primary` per AC-4.
- Side nav: 110px+ sidebar with section labels in `--v-text-tertiary`, `--v-text-xs` uppercase.
- Breadcrumb: uses Mantine `Breadcrumbs` component per Style Guide SS 9.1.
- Responsive: side nav collapses to hamburger below 1024px per AC-8.

#### Edge cases
- Non-admin user: ADMIN section hidden entirely via CASL check.
- Non-admin navigating to `/admin/*` directly: show 404 or redirect (layout-level CASL gate).
- Mobile view (<1024px): hamburger menu replaces side nav.

#### Testing strategy
- Component test: SideNav renders SETTINGS section for all users.
- Component test: SideNav hides ADMIN section for viewer/editor roles.
- Component test: TopBar breadcrumb updates based on route.
- Component test: UserMenu shows name, email, role badge, sign out.
- Component test: Responsive collapse below 1024px.

#### Estimated complexity
- Shell layout: M
- TopBar: M
- SideNav: M
- UserMenu: S
- Breadcrumb: S

---

### US-014: Profile Settings

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/settings/profile/page.tsx` | shell | New | Server component, loads user data |
| `packages/shell/src/components/settings/ProfileForm.tsx` | shell | New | `"use client"` |
| `packages/shell/src/components/settings/AvatarUpload.tsx` | shell | New | `"use client"` — circle with initials fallback |
| `packages/shell/src/app/api/settings/profile/route.ts` | shell | New | PATCH profile endpoint |
| `packages/shell/src/app/api/settings/avatar/route.ts` | shell | New | POST avatar upload (MinIO) |

#### Design system mapping
- Wireframe: Group C — Profile settings (avatar, name, email read-only for SSO, language dropdown, timezone dropdown).
- Forms: Patterns Library SS 9 — inline validation on blur, save button disabled until changes.

#### Edge cases
- SSO user: email field read-only with "(SSO)" label.
- Avatar upload: validate image format (JPG, PNG), max 2MB.
- Optimistic update: show toast immediately, rollback on server error.
- No changes made: save button stays disabled.

#### Testing strategy
- Component test: ProfileForm renders fields, save disabled until change.
- Component test: AvatarUpload shows initials when no avatar set.
- Unit test: profile update endpoint validates inputs.

#### Estimated complexity
- ProfileForm: M
- AvatarUpload: M
- API routes: S each

---

### US-015: Organization Settings

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/settings/organization/page.tsx` | shell | New | Server component, CASL-gated |
| `packages/shell/src/components/settings/OrganizationForm.tsx` | shell | New | `"use client"` |
| `packages/shell/src/app/api/settings/organization/route.ts` | shell | New | PATCH org endpoint |

#### Design system mapping
- Wireframe: Group C/F — Organization settings.
- Destructive action (delete org): Patterns Library SS 10 — confirmation dialog with impact description.

#### Edge cases
- Non-admin access: CASL gate at page level, show 404.
- Delete organization: ConfirmDialog with "This will delete all data for this organization. This cannot be undone." Red action button.
- Workspace URL edit: validate uniqueness, show current URL as read-only with edit toggle.

#### Testing strategy
- Component test: form renders, CASL gate works.
- Component test: delete button shows confirmation dialog.

#### Estimated complexity
- OrganizationForm: M
- API route: S

---

### US-016: Database Connections

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/settings/databases/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/settings/DbConnectionList.tsx` | shell | New | `"use client"` — card list |
| `packages/shell/src/components/settings/DbConnectionCard.tsx` | shell | New | Name, masked conn string, health dot, protocol badge, overflow menu |
| `packages/shell/src/components/settings/DbConnectionModal.tsx` | shell | New | `"use client"` — add/edit form modal |
| `packages/shell/src/components/settings/DbSchemaModal.tsx` | shell | New | `"use client"` — view schema (table list + columns) |
| `packages/shell/src/app/api/settings/db-connections/route.ts` | shell | New | GET list, POST create |
| `packages/shell/src/app/api/settings/db-connections/[id]/route.ts` | shell | New | PATCH update, DELETE remove |
| `packages/shell/src/app/api/settings/db-connections/[id]/test/route.ts` | shell | New | POST test connection |
| `packages/shell/src/app/api/settings/db-connections/[id]/schema/route.ts` | shell | New | GET schema introspection |
| `packages/shared/src/utils/crypto.ts` | shared | Modify | Add encryption/decryption for connection passwords |

WARNING: HUMAN DECISION NEEDED -- Connection password encryption at rest requires choosing an approach. Options: (A) Use Node.js built-in `crypto.createCipheriv` with AES-256-GCM and an encryption key from env var. (B) Use PostgreSQL's `pgcrypto` extension. Recommend option A for portability and keeping encryption logic in the application layer.

#### Design system mapping
- Wireframe: Group C — Database connections (card list with health indicators).
- Health status dots: `--v-status-success` (Live), `--v-status-warning` (Idle), `--v-status-error` (Error).
- Overflow menu: Mantine `Menu` per Style Guide SS 9.1.

#### Edge cases
- Connection test failure: show error message inline in modal with latency info.
- Encrypted password: never return raw password to client, only masked version.
- Health polling: `setInterval` at 60s, update health status dot. Stop polling when page not visible.
- Empty state: use EmptyState component: "No database connections. Connect a database to start building pages."

#### Testing strategy
- Component test: DbConnectionCard renders masked connection string, health dot.
- Component test: DbConnectionModal validates required fields.
- Unit test: encryption/decryption round-trip.
- Unit test: test connection endpoint.

#### Estimated complexity
- DbConnectionList: S
- DbConnectionCard: S
- DbConnectionModal: M
- DbSchemaModal: M
- API routes: M (across 4 files)
- Crypto additions: S

---

### US-017: API Keys

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/settings/api-keys/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/settings/ApiKeyTable.tsx` | shell | New | `"use client"` — table with overflow menus |
| `packages/shell/src/components/settings/GenerateKeyModal.tsx` | shell | New | `"use client"` — name, scope, description |
| `packages/shell/src/components/settings/KeyDisplayModal.tsx` | shell | New | `"use client"` — one-time key display with copy + warning |
| `packages/shell/src/app/api/settings/api-keys/route.ts` | shell | New | GET list, POST generate |
| `packages/shell/src/app/api/settings/api-keys/[id]/route.ts` | shell | New | DELETE revoke |

#### Design system mapping
- Wireframe: Group C — API keys (table with masked keys, scope badges, relative time).
- Table: basic Mantine `Table` (not VastuTable per technical constraints).
- Scope badges: "Full" in `--v-accent-primary`, "Read only" in `--v-status-warning`.
- Key display modal: warning banner "This key won't be shown again" in `--v-status-warning-light` background.
- Copy button: Mantine `CopyButton` per Style Guide SS 9.1.

#### Edge cases
- Key shown once: raw key only in the generate response, never retrievable again.
- Revoke confirmation: warning dialog "Revoking this key will immediately disable API access for any integration using it."
- Empty state: EmptyState: "No API keys yet. Generate a key to access Vastu programmatically."
- Relative time display: use `packages/shared/src/utils/dates.ts` helper.

#### Testing strategy
- Component test: ApiKeyTable renders masked keys, scope badges.
- Component test: GenerateKeyModal validates name required.
- Component test: KeyDisplayModal shows key with copy button and warning.
- Unit test: API key hashing.
- E2E: generate key -> copy -> verify key displayed once.

#### Estimated complexity
- ApiKeyTable: M
- GenerateKeyModal: S
- KeyDisplayModal: S
- API routes: M

---

### US-018: Appearance Settings

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/settings/appearance/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/settings/AppearanceSettings.tsx` | shell | New | `"use client"` — auto-save on change |
| `packages/shell/src/app/api/settings/appearance/route.ts` | shell | New | PATCH user appearance prefs |
| `packages/shell/src/hooks/useColorScheme.ts` | shell | New | Hook for color scheme switching |

#### Design system mapping
- Wireframe: Group C — Appearance (color scheme segmented control, color swatches, density toggle).
- Color scheme: Mantine `SegmentedControl` with Light/Dark/System per Style Guide SS 9.1.
- Accent color: Mantine `ColorSwatch` row (6-8 presets) + hex input per Style Guide SS 9.1.
- Density: Mantine `SegmentedControl` with Compact/Comfortable/Spacious.

#### Edge cases
- System theme: listen to `prefers-color-scheme` media query changes.
- Auto-save: debounce 500ms, show subtle "Saved" indicator (no save button).
- Custom hex: validate hex format, show preview swatch.
- Density change: must propagate globally via CSS custom property override.

#### Testing strategy
- Component test: AppearanceSettings renders all three controls.
- Component test: changing color scheme triggers Mantine colorScheme update.
- Unit test: auto-save debounce.

#### Estimated complexity
- AppearanceSettings: M
- useColorScheme hook: S
- API route: S

---

### US-019: SSO Configuration

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/settings/sso/page.tsx` | shell | New | Server component, CASL-gated |
| `packages/shell/src/components/settings/SsoProviderList.tsx` | shell | New | `"use client"` — provider card list |
| `packages/shell/src/components/settings/SsoProviderCard.tsx` | shell | New | Name, protocol badge, status, default badge, overflow menu |
| `packages/shell/src/components/settings/SsoProviderModal.tsx` | shell | New | `"use client"` — add/edit provider form |
| `packages/shell/src/app/api/settings/sso/route.ts` | shell | New | GET list, POST create |
| `packages/shell/src/app/api/settings/sso/[id]/route.ts` | shell | New | PATCH, DELETE |
| `packages/shell/src/app/api/settings/sso/[id]/test/route.ts` | shell | New | POST test connection |

WARNING: HUMAN DECISION NEEDED -- SSO config needs a new database table `sso_providers` not explicitly listed in US-004's table list. The requirements reference SSO configuration storage. Options: (A) Add an `sso_providers` table with columns: `id`, `name`, `protocol` (SAML/OIDC), `status` (Live/Draft), `is_default`, `metadata_url`, `client_id`, `encrypted_client_secret`, `redirect_uri`, `config_json`, `organization_id`, `created_at`, `updated_at`, `deleted_at`. (B) Store SSO config as JSON in the `organizations` table. Recommend option A for proper relational modeling.

#### Design system mapping
- Wireframe: Group F — SSO configuration.
- Protocol badges: "SAML" / "OIDC" styled as badges.
- Status: "Live" in `--v-status-success`, "Draft" in `--v-text-tertiary`.

#### Edge cases
- Test connection failure: show error inline with details.
- "Require SSO" toggle: disabling password login could lock out admin. Warning dialog: "Enabling SSO enforcement will disable password login. Ensure your SSO provider is working first."
- SSO config encryption: client secret encrypted at rest (reuse crypto from US-016).
- No providers configured: EmptyState.

#### Testing strategy
- Component test: SsoProviderCard renders all fields.
- Component test: SsoProviderModal validates required fields.

#### Estimated complexity
- SsoProviderList: S
- SsoProviderCard: S
- SsoProviderModal: M
- API routes: M (across 3 files)

---

### US-020: User Management

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/admin/users/page.tsx` | shell | New | Server component, CASL-gated |
| `packages/shell/src/components/admin/UserList.tsx` | shell | New | `"use client"` — search + filters + table |
| `packages/shell/src/components/admin/UserRow.tsx` | shell | New | Avatar + name, email, role badge, status dot |
| `packages/shell/src/components/admin/InviteUserModal.tsx` | shell | New | `"use client"` — multi-email, role selector, optional message |
| `packages/shell/src/components/admin/EditUserDrawer.tsx` | shell | New | `"use client"` — edit form in slide-out drawer |
| `packages/shell/src/app/api/admin/users/route.ts` | shell | New | GET list (with search, filters), POST invite |
| `packages/shell/src/app/api/admin/users/[id]/route.ts` | shell | New | PATCH update, DELETE remove |

#### Design system mapping
- Wireframe: Group C — User management (search, role/status filters, table, edit drawer).
- Table: basic Mantine `Table` with search and filter dropdowns.
- Role badges: Admin=`--v-accent-primary`, Editor=`--v-status-success`, Viewer=neutral.
- Status dots: Active=`--v-status-success`, Pending=`--v-text-tertiary`, Deactivated=`--v-status-error`.
- Edit drawer: Mantine `Drawer` from right with form fields.
- Destructive action "Remove from org": red ConfirmDialog.

#### Edge cases
- Cannot deactivate last admin: API validates and returns error.
- Multi-email invite: parse comma-separated, validate each, show per-email errors.
- Pending users: show in list with "Pending" status until they accept invite.
- Search: debounced at 300ms per Patterns Library SS 1.1.
- Filter dropdowns: Mantine `Select` for role and status.

#### Testing strategy
- Component test: UserList renders search, filters, table rows.
- Component test: InviteUserModal validates emails.
- Component test: EditUserDrawer renders user details, CASL-gates destructive actions.
- Unit test: cannot deactivate last admin validation.
- E2E: invite user flow.

#### Estimated complexity
- UserList: M
- UserRow: S
- InviteUserModal: M
- EditUserDrawer: M
- API routes: M

---

### US-021: Role Management

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/admin/roles/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/admin/RoleList.tsx` | shell | New | `"use client"` — role cards |
| `packages/shell/src/components/admin/RoleCard.tsx` | shell | New | Name, system/custom badge, user count, description, overflow menu |
| `packages/shell/src/components/admin/CreateRoleModal.tsx` | shell | New | `"use client"` — name, description, base role, permission overrides |
| `packages/shell/src/components/admin/EditRoleDrawer.tsx` | shell | New | `"use client"` — permission checklist |
| `packages/shell/src/app/api/admin/roles/route.ts` | shell | New | GET list, POST create |
| `packages/shell/src/app/api/admin/roles/[id]/route.ts` | shell | New | PATCH, DELETE |

#### Design system mapping
- Wireframe: Group F — Role management.
- System roles: read-only badge, no overflow actions except "View users".
- Custom roles: full CRUD via overflow menu.

#### Edge cases
- System roles non-editable: UI hides edit/delete for system roles.
- Duplicate role: validate name uniqueness per organization.
- Delete role with users assigned: ConfirmDialog showing user count.
- Role inheritance: when base role changes, recalculate effective permissions.

#### Testing strategy
- Component test: RoleCard renders correctly for system vs custom roles.
- Component test: CreateRoleModal validates required fields.
- Unit test: permission inheritance logic.

#### Estimated complexity
- RoleList: S
- RoleCard: S
- CreateRoleModal: M
- EditRoleDrawer: M
- API routes: M

---

### US-022: Permission Matrix

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/admin/permissions/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/admin/PermissionMatrix.tsx` | shell | New | `"use client"` — grid |
| `packages/shell/src/components/admin/PermissionCell.tsx` | shell | New | CRUD badge (V/E/D/X) toggle |
| `packages/shell/src/components/admin/PermissionLegend.tsx` | shell | New | V/E/D/X meanings |
| `packages/shell/src/app/api/admin/permissions/route.ts` | shell | New | GET matrix, PATCH bulk update |
| `packages/shell/src/app/api/admin/permissions/export/route.ts` | shell | New | GET CSV export |

#### Design system mapping
- Wireframe: Group F — Permission matrix.
- CRUD badges: V=View, E=Edit, D=Delete, X=Export. Granted=`--v-status-success`, Denied=`--v-bg-tertiary`.
- Conditional permissions: amber (`--v-accent-tertiary`) with tooltip.
- System role columns: read-only (no click handler).

#### Edge cases
- Large matrix: if many resources/roles, consider horizontal scroll.
- Save confirmation: ConfirmDialog "This affects N users" with user count.
- CSV export: generate server-side, download as file.
- Conditional permissions: tooltip explaining scope (e.g., "region = assigned").

#### Testing strategy
- Component test: PermissionMatrix renders grid correctly.
- Component test: PermissionCell toggles on click for custom roles.
- Component test: system role columns are non-interactive.
- Unit test: CSV export format.

#### Estimated complexity
- PermissionMatrix: L
- PermissionCell: S
- PermissionLegend: S
- API routes: M

---

### US-023: Tenant Management

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/admin/tenants/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/admin/TenantList.tsx` | shell | New | `"use client"` — tenant cards |
| `packages/shell/src/components/admin/TenantCard.tsx` | shell | New | Name, status, user count, page count, subdomain, created date |
| `packages/shell/src/components/admin/CreateTenantModal.tsx` | shell | New | `"use client"` — name, subdomain, region, DB isolation mode |
| `packages/shell/src/app/api/admin/tenants/route.ts` | shell | New | GET list, POST create |
| `packages/shell/src/app/api/admin/tenants/[id]/route.ts` | shell | New | PATCH, DELETE (soft) |
| `packages/shell/src/app/api/admin/tenants/[id]/switch/route.ts` | shell | New | POST switch tenant |

#### Design system mapping
- Current tenant: `--v-accent-primary` border per AC-3.
- Status badges: Active=`--v-status-success`, Sandbox=`--v-accent-tertiary`.

#### Edge cases
- Cannot delete last active tenant: API validation.
- Tenant switch: updates session context, reloads relevant data.
- Archive (soft-delete): confirmation dialog with impact description.
- Subdomain uniqueness: validate per organization.

#### Testing strategy
- Component test: TenantCard renders all fields, current tenant highlighted.
- Component test: CreateTenantModal validates required fields.
- Unit test: cannot delete last tenant validation.

#### Estimated complexity
- TenantList: S
- TenantCard: S
- CreateTenantModal: M
- API routes: M

---

### US-024: Audit Log

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/admin/audit-log/page.tsx` | shell | New | Server component |
| `packages/shell/src/components/admin/AuditLogTable.tsx` | shell | New | `"use client"` — filters + table + pagination |
| `packages/shell/src/components/admin/AuditLogRow.tsx` | shell | New | Timestamp, user, action badge, resource |
| `packages/shell/src/components/admin/AuditDetailDrawer.tsx` | shell | New | `"use client"` — full payload, before/after diff, IP, user agent |
| `packages/shell/src/app/api/admin/audit-log/route.ts` | shell | New | GET with filters, pagination |
| `packages/shell/src/app/api/admin/audit-log/export/route.ts` | shell | New | GET CSV export |
| `packages/shared/src/utils/audit.ts` | shared | New | `createAuditEvent()` helper |
| `packages/shared/src/utils/dates.ts` | shared | New | Relative time, date formatting helpers |

#### Design system mapping
- Wireframe: Group C — Audit log (filters, table, detail drawer).
- Timestamp: monospace font (`--v-font-mono`) per Style Guide SS 2.4.
- Action badges: Create=`--v-status-success`, Update=`--v-accent-primary`, Delete=`--v-status-error`, Login/Export=`--v-accent-secondary`.
- Filters: date range picker, user dropdown, action type dropdown, resource type dropdown.
- Pagination: server-side, 50 rows per page default per AC-8.
- Detail drawer: Mantine `Drawer` with JSON payload display and diff view.

#### Edge cases
- Large audit log: server-side pagination mandatory.
- No results for filters: EmptyState "No events match these filters for the selected date range." with "Reset filters" action.
- CSV export: export filtered results, not all events.
- Before/after diff: only shown for Update actions.
- IP address and user agent: captured from request headers in `createAuditEvent()`.

#### Testing strategy
- Component test: AuditLogTable renders filters, table rows with correct badges.
- Component test: AuditDetailDrawer shows payload and diff.
- Unit test: `createAuditEvent()` produces correct structure.
- Unit test: pagination logic.
- E2E: audit log filtering.

#### Estimated complexity
- AuditLogTable: L
- AuditLogRow: S
- AuditDetailDrawer: M
- API routes: M
- Audit utility: S
- Date helpers: S

---

### US-025: Error Pages

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/not-found.tsx` | shell | New | 404 page |
| `packages/shell/src/app/error.tsx` | shell | New | 500 page (`"use client"`) |
| `packages/shell/src/components/shared/ErrorPage.tsx` | shell | New | Shared error layout: logo, message, actions, Kundli background |

#### Design system mapping
- Self-contained: no sidebar, no shell layout. Uses KundliMotif from US-006 as subtle background.
- Links: "Go to workspace" + "Go back" (404), "Try again" + "Go to workspace" (500).
- Logo: Vastu logo centered or top-left.

#### Edge cases
- `error.tsx` must be a client component (Next.js requirement for error boundaries).
- Error page must work even if MantineProvider fails: use inline styles for critical layout, CSS tokens for visual styling.

#### Testing strategy
- Component test: ErrorPage renders with correct message and actions for each variant.

#### Estimated complexity
- S per file (3 files)

---

### US-026: Workspace Placeholder

#### Components to create or modify

| File | Package | New/Modify | Notes |
|------|---------|------------|-------|
| `packages/shell/src/app/(shell)/workspace/page.tsx` | shell | New | Protected page |
| `packages/shell/src/app/(shell)/workspace/layout.tsx` | shell | New | Bare layout with icon rail |
| `packages/shell/src/components/workspace/WorkspacePlaceholder.tsx` | shell | New | EmptyState with Phase 1 message |
| `packages/shell/src/components/workspace/IconRail.tsx` | shell | New | 48px collapsed sidebar: Vastu logo + Settings icon |

Note: Per workspace package CLAUDE.md, the placeholder lives in the shell package's app directory since the workspace package is a stub.

#### Design system mapping
- Icon rail: 48px width per wireframe Group A, Screen 1. Vastu logo at top, Settings icon (`IconSettings`) linked to `/settings`.
- EmptyState: per Patterns Library SS 8.

#### Edge cases
- Protected route: middleware redirects unauthenticated users.

#### Testing strategy
- Component test: WorkspacePlaceholder renders expected message.
- Component test: IconRail renders logo and settings link.

#### Estimated complexity
- S per file

---

## 5. Cross-Cutting Concerns

### 5.1 Audit Event Emission

Every mutating action in Phase 0 must emit an audit event via `createAuditEvent()`. This includes:
- Login / logout (US-006, US-012)
- User registration (US-007)
- Password reset (US-008)
- MFA setup (US-010)
- Profile update (US-014)
- Organization update (US-015)
- DB connection CRUD + test (US-016)
- API key generate + revoke (US-017)
- Appearance change (US-018)
- SSO config CRUD (US-019)
- User invite / update / deactivate / remove (US-020)
- Role CRUD (US-021)
- Permission update (US-022)
- Tenant CRUD + switch (US-023)

The `createAuditEvent()` helper must be created early (Layer 1) and imported in every API route.

### 5.2 i18n Wrapper

All user-facing strings must use `t('key')` from `packages/shell/src/lib/i18n.ts`. In Phase 0, this simply returns the key (English). The keys should be organized by page/component namespace:

```
t('login.title')           -> "Welcome back"
t('login.subtitle')        -> "Sign in to your workspace"
t('login.email.label')     -> "Email"
t('common.save')           -> "Save"
t('error.invalidCredentials') -> "Invalid credentials"
```

### 5.3 Loading State Pattern

Every page that fetches data must follow the loading choreography from Patterns Library SS 6:
- First load: Skeleton components matching content layout.
- Refetch: stale content visible with subtle overlay.
- Error: content disappears, error message with retry.

Create a `PageSkeleton` component for the shell layout and per-page skeleton variants.

### 5.4 Shared Test Utilities

| File | Purpose |
|------|---------|
| `packages/shell/src/test-utils/providers.tsx` | MantineProvider + session mock wrapper |
| `packages/shell/src/test-utils/mocks.ts` | Mock session, mock user, mock CASL abilities |
| `packages/shell/e2e/fixtures.ts` | Playwright test fixtures with auth helpers |
| `packages/shared/src/test-utils/prisma.ts` | Test database helpers |

### 5.5 Schema Migration Strategy

Single migration for all initial tables. Run `pnpm prisma:migrate` to create from clean state. The migration is committed and reproducible. Seed script is idempotent (upserts, not inserts).

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Keycloak configuration complexity | High | High | Pre-configure realm export JSON; document manual steps; test Docker setup early |
| next-auth + Keycloak integration edge cases | Medium | High | Prototype auth flow in Layer 2 before building all variants; keep auth.ts well-documented |
| MFA implementation complexity (TOTP, QR, recovery codes) | Medium | Medium | Use `otplib` library; follow standard TOTP RFC 6238; unit test crypto |
| Permission matrix UI performance with many roles/resources | Low | Medium | Limit visible rows/columns; use virtualization if needed |
| Docker Compose port conflicts on developer machines | Medium | Low | Document port override via env vars |
| Keycloak realm import breaking across Keycloak versions | Low | High | Pin Keycloak to exact version (24.x); test realm import in CI |

---

## 7. Architecture Decision Records

### ADR-001: Auth Strategy (next-auth + Keycloak)

**To be written at:** `/docs/decisions/ADR-001-auth-strategy.md`

**Context:** Phase 0 requires full auth flows (login, register, password reset, MFA, SSO). The CLAUDE.md specifies next-auth with Keycloak provider and database session strategy.

**Decision:** Use next-auth v5 with `@auth/prisma-adapter` for session storage and Keycloak as the identity provider. All credential management (password hashing, MFA secrets, email verification) is handled by Keycloak. next-auth acts as the session layer, not the identity layer.

**Consequences:**
- Keycloak must be running for any auth flow to work (Docker requirement in dev).
- Password reset and email verification emails are sent by Keycloak, not the application.
- MFA is partially in Keycloak (enforcement) and partially in-app (UI for setup/challenge).
- Session is database-backed (Prisma), not JWT, for server-side invalidation capability.

### ADR-002: SSO Provider Storage

**To be written at:** `/docs/decisions/ADR-002-sso-provider-storage.md`

WARNING: HUMAN DECISION NEEDED -- US-019 requires storing SSO provider configurations. The `sso_providers` table is not in the original US-004 table list. This ADR documents the decision to add it (pending approval).

**Options:**
- A: Add `sso_providers` table (recommended) -- proper relational model, supports multiple providers per org
- B: Store in `organizations.sso_config` JSON column -- simpler but less queryable

### ADR-003: Connection Password Encryption

**To be written at:** `/docs/decisions/ADR-003-credential-encryption.md`

WARNING: HUMAN DECISION NEEDED -- US-016 and US-019 require encrypting secrets at rest. This ADR documents the encryption approach.

**Decision (pending approval):** AES-256-GCM via Node.js `crypto` module with encryption key from `ENCRYPTION_KEY` env var. Key rotation supported via versioned key IDs.

---

## 8. Dependency Summary (New External Packages)

The following packages are needed beyond what is already stated in the stack:

| Package | Purpose | User Story | Status |
|---------|---------|------------|--------|
| `next-auth` / `@auth/core` | Auth framework | US-006 | Already in stack (CLAUDE.md) |
| `@auth/prisma-adapter` | Prisma session adapter | US-006 | Required by auth stack |
| `@casl/ability` + `@casl/prisma` | Permission definitions | US-012 | Already in stack (CLAUDE.md) |
| `@mantine/core` + `@mantine/hooks` + `@mantine/form` + `@mantine/notifications` | UI framework | US-005 | Already in stack |
| `@tabler/icons-react` | Icon library | US-005 | Already in stack (Style Guide) |
| `@next/font` | Font loading | US-005 | Built into Next.js |
| `otplib` | TOTP generation/verification | US-010 | WARNING: NEW DEPENDENCY |
| `qrcode` | QR code generation | US-010 | WARNING: NEW DEPENDENCY |
| `vitest` + `@testing-library/react` | Testing | All | Already in stack |
| `playwright` | E2E testing | All | Already in stack |

---

## 9. Testing Strategy Summary

### Unit Tests (Vitest)
- CASL permission definitions (all role x resource x action combinations)
- Crypto utilities (TOTP, API key hashing, password encryption)
- Validation utilities (email, password strength, URL)
- Date formatting helpers
- Audit event creation
- i18n stub function

### Component Tests (@testing-library/react)
- Every `"use client"` form component: renders, validates, submits
- TruncatedText, EmptyState, ConfirmDialog
- Shell layout: SideNav with CASL gating, TopBar, UserMenu
- Auth forms: LoginForm, RegisterForm, MfaChallengeForm
- Settings forms: ProfileForm, OrganizationForm, DbConnectionModal, etc.
- Admin components: UserList, RoleCard, PermissionMatrix, AuditLogTable

### E2E Tests (Playwright)
| Flow | Priority |
|------|----------|
| Login with email/password | P0 |
| Registration flow (create account + org) | P0 |
| Password reset flow | P1 |
| MFA setup and challenge | P1 |
| User invite flow | P1 |
| API key generation | P1 |
| Audit log filtering | P1 |
| Non-admin cannot access admin pages | P0 |
| Settings profile update | P2 |
| DB connection add + test | P2 |

---

## 10. Acceptance Criteria Mapping

Each user story's acceptance criteria maps directly to implementation artifacts. The lead-engineer will decompose these into individual issues in `todo.md`. The qa-engineer will verify each AC with targeted tests.

**Total stories:** 26
**Total acceptance criteria:** ~145
**Estimated total files to create:** ~120
**Estimated total lines of code:** ~12,000-15,000
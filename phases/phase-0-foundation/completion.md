# Phase 0: Foundation + Enterprise Shell — Completion Report

> Completed: 2026-03-19 | Duration: ~8 weeks (estimated: 8 weeks)

## Summary

Phase 0 delivered the full foundational infrastructure and enterprise shell for the Vastu platform. The monorepo is operational with four packages (`shell`, `shared`, `workspace` stub, `agent-runtime` stub), Docker Compose services (PostgreSQL 16, Redis 7, Keycloak 24, MinIO), a GitHub Actions CI pipeline (8 workflows), Prisma schema with 14 tables, and a complete design system deployment.

The auth system supports login, registration, password reset, email verification, MFA (TOTP + recovery codes), and SSO via Keycloak. The settings/admin shell provides 6 settings pages and 5 admin pages, all CASL-gated. The workspace is a placeholder page with icon rail, ready for Phase 1.

**Key metrics:**

| Metric | Count |
|--------|-------|
| Source files (shell) | 203 |
| Source files (shared) | 31 |
| Unit/component test files | 61 |
| E2E spec files | 18 |
| Database tables | 14 |
| CI workflows | 8 |
| User stories delivered | 26/26 |
| i18n strings routed through `t()` | 700+ |

---

## User story status

| Story | Status | Key files | Tests |
|-------|--------|-----------|-------|
| US-001: Monorepo setup | Complete | `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.json` | Build/lint/typecheck pass |
| US-002: Docker dev environment | Complete | `docker-compose.yml`, `docker/keycloak/realm-export.json` | Health checks on all services |
| US-003: CI pipeline | Complete | `.github/workflows/` (8 workflows) | Self-validating |
| US-004: Database schema | Complete | `packages/shared/src/prisma/schema.prisma` | `prisma.test.ts` |
| US-005: Design system | Complete | `vastu.theme.ts`, `vastu.tokens.css`, `app/layout.tsx` | 6 component tests |
| US-006: Login | Complete | `LoginForm.tsx`, `lib/auth.ts` | Unit + E2E `login.spec.ts` |
| US-007: Registration | Complete | `RegisterForm.tsx`, `api/auth/register/route.ts` | Unit + E2E `register.spec.ts` |
| US-008: Password reset | Complete | `forgot-password/`, `reset-password/` | Unit + E2E `password-reset.spec.ts` |
| US-009: Email verification | Complete | `verify-email/`, rate-limited resend | Unit + E2E `verify-email.spec.ts` |
| US-010: MFA setup + challenge | Complete | `MfaSetupWizard.tsx`, `OtpInput.tsx`, `RecoveryCodes.tsx` | Unit + E2E `mfa.spec.ts`, `mfa-setup.spec.ts` |
| US-011: SSO redirect | Complete | `SsoForm.tsx`, `api/auth/sso/providers/` | Unit + E2E `sso.spec.ts` |
| US-012: Auth middleware | Complete | `middleware.ts`, CASL abilities | Unit + E2E `access-control.spec.ts` |
| US-013: Settings shell layout | Complete | `TopBar.tsx`, `SideNav.tsx`, `UserMenu.tsx`, `Breadcrumb.tsx` | Unit tests |
| US-014: Profile settings | Complete | `ProfileForm.tsx`, `AvatarUpload.tsx` | Unit test |
| US-015: Organization settings | Complete | `OrganizationForm.tsx` | Unit + API route test |
| US-016: Database connections | Complete | `DbConnectionCard.tsx`, `SchemaModal.tsx` | Unit + E2E `database-connections.spec.ts` |
| US-017: API keys | Complete | `ApiKeyTable.tsx`, `GenerateKeyModal.tsx` | Unit + E2E `api-keys.spec.ts` |
| US-018: Appearance settings | Complete | `AppearanceSettings.tsx`, `useColorScheme.ts` | Unit + E2E `appearance.spec.ts` |
| US-019: SSO configuration | Complete | `SsoProviderCard.tsx`, `SsoProviderList.tsx` | Unit + API route test |
| US-020: User management | Complete | `UserList.tsx`, `InviteUserModal.tsx`, `EditUserDrawer.tsx` | Unit + E2E `user-invite.spec.ts`, `last-admin-protection.spec.ts` |
| US-021: Role management | Complete | `RoleList.tsx`, `RoleCard.tsx`, `CreateRoleModal.tsx` | Unit + E2E `roles.spec.ts` |
| US-022: Permission matrix | Complete | `PermissionMatrix.tsx`, `PermissionCell.tsx` | Unit + E2E `permissions.spec.ts` |
| US-023: Tenant management | Complete | `TenantList.tsx`, `TenantCard.tsx`, `CreateTenantModal.tsx` | Unit + E2E `tenants.spec.ts` |
| US-024: Audit log | Complete | `AuditLogTable.tsx`, `AuditDetailDrawer.tsx` | Unit + E2E `audit-log.spec.ts` |
| US-025: Error pages | Complete | `not-found.tsx`, `error.tsx`, `ErrorPage.tsx` | Unit test |
| US-026: Workspace placeholder | Complete | `WorkspacePlaceholder.tsx`, `IconRail.tsx` | Unit tests |

---

## Architecture decisions

### ADR-001: Auth — next-auth v5 + Keycloak OIDC
- next-auth v5 (beta) with `@auth/prisma-adapter` for database session storage
- Keycloak as the identity provider; provider conditionally registered when env vars are present
- Session callback enriches session with user roles and serialized CASL rules
- Middleware uses cookie-presence check to avoid PrismaAdapter in Edge Runtime

### ADR-002: SSO provider storage
- Dedicated `sso_providers` table (not JSON in organizations)
- Supports multiple providers per org with relational querying
- Credentials encrypted at rest via AES-256-GCM

### ADR-003: Credential encryption
- AES-256-GCM via Node.js `crypto` module
- `ENCRYPTION_KEY` env var (32-byte hex string in production)
- Applied to: DB connection passwords, SSO client secrets

### ADR-004: Route group structure
- `(auth)` group — all auth pages (shared 40/60 split layout)
- `(shell)` group — settings + admin pages (shared TopBar + SideNav layout)
- `/workspace` — outside shell group (own layout with IconRail)

### ADR-005: CI architecture
- 8 separate workflow files (lint, typecheck, test, build, 3 E2E suites, Keycloak integration)
- E2E suites split by domain (auth, admin, settings) for parallel execution
- Keycloak integration tests run in a dedicated workflow with full Docker stack

### ADR-006: Server/client module boundary
- SSRF validation (`dns`/`net` imports) split into `validation.server.ts` to prevent webpack bundling Node.js modules into client components
- Keycloak env vars read lazily (getter functions in `env.ts`) so `next build` succeeds without env vars in CI

---

## Design system compliance

| Requirement | Status |
|-------------|--------|
| All colors via `--v-*` tokens | Yes |
| TruncatedText on truncatable text | Yes — ResizeObserver for recheck |
| Loading states (skeleton → content → error) | Yes — PageSkeleton, TableSkeleton, CardListSkeleton, FormSkeleton, ErrorState |
| Toast notifications (bottom-right, limit 3) | Yes |
| Two font weights only (400/500) | Yes — enforced in theme |
| Dark mode toggle | Yes — Light/Dark/System with `ColorSchemeScript` |
| WCAG 2.2 AA | Partial — aria-labels on icon-only buttons, semantic headings |

---

## Test coverage

### Unit and component tests (Vitest): 61 files
- `packages/shared`: permissions, crypto, validation, dates, strings, prisma
- `packages/shell`: middleware, auth events, env, i18n, notifications, rate-limit, session
- `packages/shell/components`: all auth, shared, shell, settings, admin, workspace components
- `packages/shell/app/api`: register, MFA, users, api-keys, organization, sso

### E2E tests (Playwright): 18 spec files
- **Auth:** login, register, password reset, MFA challenge, MFA setup, SSO, email verification, keycloak integration
- **Admin:** access control, audit log, last admin protection, permissions, roles, tenants, user invite
- **Settings:** API keys, appearance, database connections

---

## Known issues and tech debt

1. **Coverage PR comment:** Coverage artifacts uploaded but not posted as PR comments. Needs `marocchino/sticky-pull-request-comment` or similar.

2. **MFA enforcement toggle:** MFA enforcement tied to `ssoRequired` on Organization rather than a dedicated `mfaRequired` boolean.

3. **Responsive side nav:** CSS modules exist but hamburger collapse at 1024px needs implementation and verification.

4. **Session expiry toast:** Session maxAge is 24h but client-side "Session expired" toast is not triggered (middleware doesn't append `?expired=true`).

5. **i18n is a stub:** 700+ strings pass through `t()` but the implementation is a flat Record lookup, not a proper i18n library.

6. **`@ts-ignore` / `any` usage:** One instance in CASL ability definitions due to strict generic typing. Documented with eslint-disable comment.

---

## Recommendations for Phase 1

1. **Replace i18n stub** with `next-intl` or `i18next` before adding more pages.
2. **Add `mfaRequired` boolean** on Organization separate from SSO enforcement.
3. **Wire coverage PR comments** in CI.
4. **Add session expiry detection** on client side.
5. **Implement responsive hamburger menu** for shell SideNav.
6. **Add Storybook** for shared components.
7. **Set up GitHub branch protection rules** (admin config, not code).
8. **Migrate workspace placeholder** from shell to workspace package when Phase 1 begins.

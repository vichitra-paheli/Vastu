# Phase 0 Todo

## Parallel Groups

### Group A (no deps) -- Infrastructure
001, 002

### Group B (after A) -- CI, Schema, Design System, Shared Utilities
003, 004, 006

### Group C (after B) -- Seed, Shared Components, Toast/i18n, Test Utils, Utilities, CASL, Skeletons, Auth Layout
005, 007, 008, 009, 010, 011, 012, 015

### Group D (after C) -- Auth Config, Login
013

### Group E (after D) -- Auth Middleware, Login Page
014, 016

### Group F (after E) -- Auth Variants, Shell Layout, Error Pages, Workspace Placeholder
017, 018, 019, 020, 022, 023, 024, 025

### Group G (after F) -- MFA Challenge, Settings Pages, Admin Pages
021, 026, 027, 028, 029, 030, 031, 032, 033, 035, 036

### Group H (after G) -- Permission Matrix (depends on Roles), Auth E2E
034, 037

### Group I (after H) -- MFA E2E, Access Control E2E, Admin E2E, Audit Integration
038, 039, 040

### Group J (after I) -- Phase Verification
041

## Issues

- [ ] VASTU-0-001: Monorepo setup with Turborepo, pnpm, and package scaffolding (root, M) [deps: none]
- [ ] VASTU-0-002: Docker Compose for PostgreSQL, Redis, Keycloak, and MinIO (root, M) [deps: none]
- [ ] VASTU-0-003: GitHub Actions CI pipeline (root, S) [deps: 001, 002]
- [ ] VASTU-0-004: Prisma schema with 10+ tables, migrations, and TypeScript types (shared, L) [deps: 001, 002]
- [ ] VASTU-0-005: Prisma seed script with dev data (shared, M) [deps: 004]
- [ ] VASTU-0-006: Vastu theme, CSS tokens, and font loading (shell, M) [deps: 001]
- [ ] VASTU-0-007: TruncatedText, EmptyState, and ConfirmDialog shared components (shell, M) [deps: 006]
- [ ] VASTU-0-008: Toast notification wrapper and i18n stub (shell, S) [deps: 006]
- [ ] VASTU-0-009: Shared test utilities and test provider wrapper (shell, S) [deps: 006, 004]
- [ ] VASTU-0-010: Shared utility functions: crypto, validation, dates, audit (shared, M) [deps: 004]
- [ ] VASTU-0-011: CASL permission definitions and ability factory (shared, M) [deps: 004]
- [ ] VASTU-0-012: Loading state pattern: PageSkeleton and skeleton variants (shell, S) [deps: 006]
- [ ] VASTU-0-013: next-auth config with Keycloak provider and Prisma adapter (shell, M) [deps: 004, 011]
- [ ] VASTU-0-014: Next.js auth middleware for route protection (shell, M) [deps: 013]
- [ ] VASTU-0-015: Auth split layout with branding panel and Kundli motif (shell, M) [deps: 006]
- [ ] VASTU-0-016: Login page and LoginForm component (shell, M) [deps: 013, 014, 015]
- [ ] VASTU-0-017: Registration page with RegisterForm and PasswordStrengthBar (shell, M) [deps: 016, 010]
- [ ] VASTU-0-018: Password reset flow: forgot-password and reset-password pages (shell, M) [deps: 016]
- [ ] VASTU-0-019: Email verification page and API routes (shell, S) [deps: 017]
- [ ] VASTU-0-020: MFA setup wizard: QR code, TOTP verify, and recovery codes (shell, L) [deps: 016, 010]
- [ ] VASTU-0-021: MFA challenge page with OTP input component (shell, M) [deps: 020]
- [ ] VASTU-0-022: SSO redirect page with provider lookup (shell, S) [deps: 016]
- [ ] VASTU-0-023: Settings shell layout: TopBar, SideNav, Breadcrumb, UserMenu (shell, L) [deps: 007, 013, 014]
- [ ] VASTU-0-024: Error pages: 404 and 500 with ErrorPage component (shell, S) [deps: 015]
- [ ] VASTU-0-025: Workspace placeholder page with icon rail (shell, S) [deps: 007, 014]
- [ ] VASTU-0-026: Profile settings page with avatar upload (shell, M) [deps: 023, 010]
- [ ] VASTU-0-027: Organization settings page (shell, M) [deps: 023, 010]
- [ ] VASTU-0-028: Database connections page with CRUD modals and health polling (shell, L) [deps: 023, 010]
- [ ] VASTU-0-029: API keys page with generation, display, and revocation (shell, M) [deps: 023, 010]
- [ ] VASTU-0-030: Appearance settings page with auto-save (shell, M) [deps: 023]
- [ ] VASTU-0-031: SSO configuration page with provider CRUD (shell, M) [deps: 023, 010]
- [ ] VASTU-0-032: User management page with invite, edit drawer, and filters (shell, L) [deps: 023, 010]
- [ ] VASTU-0-033: Role management page with role cards and CRUD (shell, M) [deps: 023, 010]
- [ ] VASTU-0-034: Permission matrix page with grid, toggles, and CSV export (shell, L) [deps: 033]
- [ ] VASTU-0-035: Tenant management page with cards and context switching (shell, M) [deps: 023, 010]
- [ ] VASTU-0-036: Audit log page with filters, table, detail drawer, and CSV export (shell, L) [deps: 023, 010]
- [ ] VASTU-0-037: E2E tests: login, registration, and password reset flows (shell, M) [deps: 016, 017, 018]
- [ ] VASTU-0-038: E2E tests: MFA flow and admin access control (shell, M) [deps: 021, 023]
- [ ] VASTU-0-039: E2E tests: user invite, API key generation, and audit log filtering (shell, M) [deps: 032, 029, 036]
- [ ] VASTU-0-040: Audit event integration: wire createAuditEvent into all API routes (shell, M) [deps: 026-036]
- [ ] VASTU-0-041: Phase 0 verification: full test suite, CI green, and completion doc (root, M) [deps: all]

## Summary

- **Total issues:** 41
- **Size breakdown:** S=8, M=24, L=9
- **Agent breakdown:** dev-engineer=26, design-engineer=8, devops-engineer=3, qa-engineer=4
- **Estimated parallel depth:** 10 groups (A through J)

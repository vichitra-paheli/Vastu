# packages/shell

SSR-rendered pages: auth flows, settings, admin. This is where users land before entering the workspace.

## Stack
- Next.js 14 App Router (server components by default, `"use client"` only where interactivity requires it)
- Mantine v7 (via MantineProvider with `vastuTheme` in root layout)
- next-auth (Keycloak provider, database session strategy)
- CASL.js (client-side permission checks, definitions imported from `@vastu/shared`)
- `@mantine/form` (all form validation)
- `@mantine/notifications` (toast notifications)

## Directory structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth route group (login, register, etc.)
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── verify-email/
│   │   ├── mfa/
│   │   ├── sso/
│   │   └── layout.tsx      # Auth split layout (40% branding, 60% form)
│   ├── settings/           # Settings pages
│   │   ├── profile/
│   │   ├── organization/
│   │   ├── databases/
│   │   ├── api-keys/
│   │   ├── appearance/
│   │   ├── sso/
│   │   └── layout.tsx      # Settings shell layout (top bar + side nav + content)
│   ├── admin/              # Admin pages (CASL-gated)
│   │   ├── users/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── tenants/
│   │   ├── audit-log/
│   │   └── layout.tsx      # Same shell layout, admin nav section visible
│   ├── workspace/          # Placeholder (Phase 1 mounting point)
│   ├── layout.tsx          # Root layout: MantineProvider, fonts, global CSS
│   ├── not-found.tsx       # 404 page
│   └── error.tsx           # 500 page
├── components/
│   ├── auth/               # Auth-specific components (branding panel, Kundli motif)
│   ├── shell/              # Shell layout components (top bar, side nav, breadcrumbs, avatar menu)
│   └── shared/             # Shell-level shared components
├── lib/
│   ├── auth.ts             # next-auth configuration
│   └── keycloak.ts         # Keycloak client helpers
├── middleware.ts            # Route protection middleware
└── theme/
    ├── vastu.theme.ts       # Mantine createTheme config
    └── vastu.tokens.css     # CSS custom properties
```

## Key patterns
- Auth pages use the split layout: 40% Vastu branding panel (Kundli motif with colored node vertices), 60% form content. Layout defined in `(auth)/layout.tsx`.
- Settings/admin pages use the shell layout: top bar + side nav + content area. Defined in `settings/layout.tsx`.
- Admin section in side nav is CASL-gated: `ability.can('manage', 'admin')` check hides it for non-admin roles.
- All form pages follow `@mantine/form` with inline validation on blur. See patterns library §9.
- Server components by default. Only add `"use client"` for: form state, interactive controls, client-side navigation.
- `generateMetadata` on every page for proper titles and descriptions.

## Auth flow
1. `middleware.ts` checks session on every request to protected routes.
2. No session → redirect to `/login?redirect={originalUrl}`.
3. Login form submits to next-auth's Keycloak provider.
4. On success → session created in DB → redirect to `redirect` param or `/workspace`.
5. Session includes: userId, email, name, roles[], tenantId, permissions (CASL rules).

## Testing
```
pnpm --filter shell test        # unit + component tests
pnpm --filter shell test:e2e    # Playwright E2E tests
```
- Component tests: wrap in `TestProviders` helper that provides MantineProvider + session mock.
- E2E tests: use Playwright with test user credentials from seed data (admin@vastu.dev / editor@vastu.dev / viewer@vastu.dev).

## Common mistakes Claude makes here
- Using `<a>` tags instead of Next.js `<Link>` for internal navigation.
- Not using the auth split layout for new auth pages — every auth page must use `(auth)/layout.tsx`.
- Putting settings pages outside the shell layout — every settings/admin page must be under `settings/` or `admin/` route groups.
- Fetching data client-side when it should be a server component with direct Prisma query.
- Using Mantine's default colors instead of Vastu accent tokens (`--v-accent-primary`, etc.).
- Hardcoding admin checks instead of using CASL: `if (role === 'admin')` → `if (ability.can('manage', 'admin'))`.

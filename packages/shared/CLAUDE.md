# packages/shared

Shared code used by all other packages: database schema, types, utilities, permission definitions.
This is the only package that other packages import from. It has no UI — only logic and types.

## Stack
- Prisma ORM (PostgreSQL)
- CASL.js (permission definitions)
- TypeScript (strict mode)
- Vitest (unit tests)

## Directory structure
```
src/
├── prisma/
│   ├── schema.prisma          # Database schema (single source of truth)
│   ├── migrations/            # Prisma migrations (auto-generated, committed)
│   └── seed.ts                # Development seed data
├── types/
│   ├── user.ts                # User, Role, Permission types
│   ├── tenant.ts              # Tenant, Organization types
│   ├── audit.ts               # AuditEvent types
│   ├── api-key.ts             # ApiKey types
│   ├── db-connection.ts       # DatabaseConnection types
│   └── index.ts               # Re-exports all types
├── permissions/
│   ├── abilities.ts           # CASL ability factory: defineAbilitiesFor(user)
│   ├── resources.ts           # Resource type definitions (what can be acted on)
│   └── actions.ts             # Action definitions (view, edit, delete, export)
├── utils/
│   ├── crypto.ts              # API key hashing, token generation
│   ├── dates.ts               # Date formatting, relative time helpers
│   ├── strings.ts             # Truncation, pluralization, slug generation
│   └── validation.ts          # Shared validation schemas (email, URL, password strength)
└── index.ts                   # Package entry point — re-exports everything
```

## Import convention
Other packages import from this package as:
```typescript
import { User, Role, AuditEvent } from '@vastu/shared/types';
import { defineAbilitiesFor } from '@vastu/shared/permissions';
import { hashApiKey, generateToken } from '@vastu/shared/utils';
import { prisma } from '@vastu/shared/prisma';
```

## Database schema key tables

| Table | Purpose | Soft-delete? |
|-------|---------|-------------|
| `users` | User accounts | Yes (`deleted_at`) |
| `organizations` | Top-level org (one per deployment) | No |
| `tenants` | Data isolation units within an org | Yes |
| `roles` | System + custom roles | No |
| `user_roles` | User ↔ role junction | No |
| `permissions` | Per-role, per-resource CRUD flags | No |
| `api_keys` | External API access (hashed) | Yes |
| `db_connections` | External DB connection configs (encrypted) | Yes |
| `audit_events` | Immutable event log | No (append-only) |
| `sessions` | next-auth sessions | No (TTL-based) |

All tables have `id` (UUID), `created_at`, `updated_at`. User-facing tables have `deleted_at` for soft-delete.

## Prisma commands
```
pnpm prisma:migrate     # run pending migrations
pnpm prisma:generate    # regenerate Prisma Client after schema changes
pnpm prisma:seed        # seed dev data (idempotent — safe to re-run)
pnpm prisma:studio      # open Prisma Studio GUI (localhost:5555)
pnpm prisma:reset       # drop all tables + re-migrate + re-seed (DESTRUCTIVE)
```

## CASL permission model
Permissions are role-based with optional resource-level overrides:
```typescript
// In permissions/abilities.ts
export function defineAbilitiesFor(user: UserWithRoles) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  for (const role of user.roles) {
    // System role grants
    if (role.name === 'admin') can('manage', 'all');
    if (role.name === 'builder') { can('read', 'all'); can('configure', 'Page'); }
    if (role.name === 'editor') { can('read', 'all'); can('update', 'Record'); }
    if (role.name === 'viewer') { can('read', 'all'); }

    // Custom role overrides from permissions table
    for (const perm of role.permissions) {
      if (perm.granted) can(perm.action, perm.resource);
      else cannot(perm.action, perm.resource);
    }
  }
  return build();
}
```

## Testing
```
pnpm --filter shared test     # unit tests for utils, permissions, crypto
```
- Test permission definitions exhaustively: every role × every resource × every action.
- Test crypto functions with known vectors.
- Test seed script is idempotent: running it twice produces the same state.

## Common mistakes Claude makes here
- Adding UI code to shared — this package has NO React components, NO CSS, NO Mantine imports.
- Using raw SQL instead of Prisma queries.
- Forgetting to add `created_at`/`updated_at` on new tables.
- Forgetting soft-delete (`deleted_at`) on user-facing tables.
- Not re-running `pnpm prisma:generate` after schema changes (Prisma Client gets stale).
- Storing API keys in plaintext — always hash with `hashApiKey()` from utils/crypto.
- Defining permissions inline instead of using the CASL ability factory.

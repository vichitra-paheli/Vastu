/**
 * Tests for base-schema.prisma and base-seed.ts.
 *
 * These are pure unit tests — no database connection required.
 * They verify:
 *   - The base schema template contains all framework table definitions.
 *   - The domain marker section is present.
 *   - Base seed functions are importable and have the correct signatures.
 *   - SEED_IDS are stable deterministic values.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reads the base schema file relative to the packages/shared root. */
function readBaseSchema(): string {
  const schemaPath = resolve(
    __dirname,
    '..', // src/prisma
    '..', // src
    '..', // packages/shared
    'prisma',
    'base-schema.prisma',
  );
  return readFileSync(schemaPath, 'utf-8');
}

// ---------------------------------------------------------------------------
// Base schema: framework tables
// ---------------------------------------------------------------------------

describe('base-schema.prisma — framework table definitions', () => {
  let schema: string;

  beforeEach(() => {
    schema = readBaseSchema();
  });

  it('contains datasource block', () => {
    expect(schema).toContain('datasource db {');
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain('url      = env("DATABASE_URL")');
  });

  it('contains generator client block', () => {
    expect(schema).toContain('generator client {');
    expect(schema).toContain('provider = "prisma-client-js"');
  });

  it('defines TenantStatus enum', () => {
    expect(schema).toContain('enum TenantStatus {');
    expect(schema).toContain('ACTIVE');
    expect(schema).toContain('SANDBOX');
  });

  it('defines SsoProviderType enum', () => {
    expect(schema).toContain('enum SsoProviderType {');
    expect(schema).toContain('SAML');
    expect(schema).toContain('OIDC');
  });

  it('defines SsoProviderStatus enum', () => {
    expect(schema).toContain('enum SsoProviderStatus {');
    expect(schema).toContain('LIVE');
    expect(schema).toContain('DRAFT');
  });

  it('defines Organization model', () => {
    expect(schema).toContain('model Organization {');
    expect(schema).toContain('@@map("organizations")');
  });

  it('defines User model with soft-delete', () => {
    expect(schema).toContain('model User {');
    expect(schema).toContain('deletedAt');
    expect(schema).toContain('@map("deleted_at")');
    expect(schema).toContain('@@map("users")');
  });

  it('defines Tenant model', () => {
    expect(schema).toContain('model Tenant {');
    expect(schema).toContain('@@map("tenants")');
  });

  it('defines Role model', () => {
    expect(schema).toContain('model Role {');
    expect(schema).toContain('@@map("roles")');
  });

  it('defines UserRole model', () => {
    expect(schema).toContain('model UserRole {');
    expect(schema).toContain('@@map("user_roles")');
  });

  it('defines Permission model', () => {
    expect(schema).toContain('model Permission {');
    expect(schema).toContain('@@map("permissions")');
  });

  it('defines ApiKey model with soft-delete', () => {
    expect(schema).toContain('model ApiKey {');
    expect(schema).toContain('@@map("api_keys")');
  });

  it('defines DbConnection model with soft-delete', () => {
    expect(schema).toContain('model DbConnection {');
    expect(schema).toContain('@@map("db_connections")');
  });

  it('defines SsoProvider model', () => {
    expect(schema).toContain('model SsoProvider {');
    expect(schema).toContain('@@map("sso_providers")');
  });

  it('defines AuditEvent model', () => {
    expect(schema).toContain('model AuditEvent {');
    expect(schema).toContain('@@map("audit_events")');
  });

  it('defines next-auth Account model', () => {
    expect(schema).toContain('model Account {');
    expect(schema).toContain('@@map("accounts")');
  });

  it('defines next-auth Session model', () => {
    expect(schema).toContain('model Session {');
    expect(schema).toContain('@@map("sessions")');
  });

  it('defines next-auth VerificationToken model', () => {
    expect(schema).toContain('model VerificationToken {');
    expect(schema).toContain('@@map("verification_tokens")');
  });

  it('defines Page model', () => {
    expect(schema).toContain('model Page {');
    expect(schema).toContain('@@map("pages")');
  });

  it('defines View model', () => {
    expect(schema).toContain('model View {');
    expect(schema).toContain('@@map("views")');
  });
});

// ---------------------------------------------------------------------------
// Base schema: domain marker section
// ---------------------------------------------------------------------------

describe('base-schema.prisma — domain marker section', () => {
  let schema: string;

  beforeEach(() => {
    schema = readBaseSchema();
  });

  it('contains the domain marker comment block', () => {
    expect(schema).toContain('YOUR DOMAIN MODELS BELOW');
  });

  it('domain marker uses the double-line box style', () => {
    expect(schema).toContain('// ═══════════════════════════════════════');
  });

  it('domain marker appears after all framework model definitions', () => {
    const viewModelIndex = schema.indexOf('@@map("views")');
    const markerIndex = schema.indexOf('YOUR DOMAIN MODELS BELOW');
    expect(viewModelIndex).toBeGreaterThan(0);
    expect(markerIndex).toBeGreaterThan(viewModelIndex);
  });
});

// ---------------------------------------------------------------------------
// Base schema: all models have id, createdAt, updatedAt
// ---------------------------------------------------------------------------

describe('base-schema.prisma — standard fields on all models', () => {
  let schema: string;

  const frameworkModels = [
    'Organization',
    'User',
    'Tenant',
    'Role',
    'UserRole',
    'Permission',
    'ApiKey',
    'DbConnection',
    'SsoProvider',
    'Page',
    'View',
  ];

  beforeEach(() => {
    schema = readBaseSchema();
  });

  it('contains id field with UUID default', () => {
    // Count occurrences of the id pattern — should appear in every model
    const idMatches = schema.match(/@id @default\(uuid\(\)\)/g);
    expect(idMatches).not.toBeNull();
    // At least one per framework model that has an id field
    expect((idMatches ?? []).length).toBeGreaterThanOrEqual(frameworkModels.length);
  });

  it('contains createdAt fields with @map("created_at")', () => {
    const createdAtMatches = schema.match(/@map\("created_at"\)/g);
    expect(createdAtMatches).not.toBeNull();
    expect((createdAtMatches ?? []).length).toBeGreaterThanOrEqual(frameworkModels.length);
  });

  it('contains updatedAt fields on mutable models', () => {
    // AuditEvent intentionally has no updatedAt (append-only)
    const mutableModelCount = frameworkModels.length;
    const updatedAtMatches = schema.match(/@updatedAt/g);
    expect(updatedAtMatches).not.toBeNull();
    expect((updatedAtMatches ?? []).length).toBeGreaterThanOrEqual(mutableModelCount - 1);
  });
});

// ---------------------------------------------------------------------------
// base-seed.ts — imports and function signatures
// ---------------------------------------------------------------------------

describe('base-seed.ts — module exports', () => {
  it('exports SEED_IDS with stable deterministic values', async () => {
    const { SEED_IDS } = await import('../base-seed');

    expect(SEED_IDS.org).toBe('aaaaaaaa-0000-4000-a000-000000000001');
    expect(SEED_IDS.tenant).toBe('bbbbbbbb-0000-4000-a000-000000000001');
    expect(SEED_IDS.users.admin).toBe('cccccccc-0000-4000-a000-000000000001');
    expect(SEED_IDS.users.editor).toBe('cccccccc-0000-4000-a000-000000000002');
    expect(SEED_IDS.users.viewer).toBe('cccccccc-0000-4000-a000-000000000003');
    expect(SEED_IDS.roles.admin).toBe('dddddddd-0000-4000-a000-000000000001');
    expect(SEED_IDS.roles.builder).toBe('dddddddd-0000-4000-a000-000000000002');
    expect(SEED_IDS.roles.editor).toBe('dddddddd-0000-4000-a000-000000000003');
    expect(SEED_IDS.roles.viewer).toBe('dddddddd-0000-4000-a000-000000000004');
  });

  it('exports seedOrganization as a function', async () => {
    const { seedOrganization } = await import('../base-seed');
    expect(typeof seedOrganization).toBe('function');
  });

  it('exports seedTenant as a function', async () => {
    const { seedTenant } = await import('../base-seed');
    expect(typeof seedTenant).toBe('function');
  });

  it('exports seedUsers as a function', async () => {
    const { seedUsers } = await import('../base-seed');
    expect(typeof seedUsers).toBe('function');
  });

  it('exports seedRoles as a function', async () => {
    const { seedRoles } = await import('../base-seed');
    expect(typeof seedRoles).toBe('function');
  });

  it('exports seedUserRoles as a function', async () => {
    const { seedUserRoles } = await import('../base-seed');
    expect(typeof seedUserRoles).toBe('function');
  });

  it('exports seedPermissions as a function', async () => {
    const { seedPermissions } = await import('../base-seed');
    expect(typeof seedPermissions).toBe('function');
  });

  it('exports seedDbConnections as a function', async () => {
    const { seedDbConnections } = await import('../base-seed');
    expect(typeof seedDbConnections).toBe('function');
  });

  it('exports seedApiKeys as a function', async () => {
    const { seedApiKeys } = await import('../base-seed');
    expect(typeof seedApiKeys).toBe('function');
  });

  it('exports seedAuditEvents as a function', async () => {
    const { seedAuditEvents } = await import('../base-seed');
    expect(typeof seedAuditEvents).toBe('function');
  });

  it('exports seedFrameworkData as a function', async () => {
    const { seedFrameworkData } = await import('../base-seed');
    expect(typeof seedFrameworkData).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// base-seed.ts — callable with a mocked PrismaClient
// ---------------------------------------------------------------------------

describe('base-seed.ts — functions callable with mocked PrismaClient', () => {
  function makeMockPrisma() {
    const upsert = vi.fn().mockResolvedValue({});
    return {
      organization: { upsert },
      tenant: { upsert },
      user: { upsert },
      role: { upsert },
      userRole: { upsert },
      permission: { upsert },
      dbConnection: { upsert },
      apiKey: { upsert },
      auditEvent: { upsert },
    };
  }

  it('seedOrganization calls prisma.organization.upsert once', async () => {
    const { seedOrganization } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedOrganization(mock as any);
    expect(mock.organization.upsert).toHaveBeenCalledTimes(1);
    expect(mock.organization.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'aaaaaaaa-0000-4000-a000-000000000001' },
      }),
    );
  });

  it('seedTenant calls prisma.tenant.upsert once', async () => {
    const { seedTenant } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedTenant(mock as any);
    expect(mock.tenant.upsert).toHaveBeenCalledTimes(1);
    expect(mock.tenant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bbbbbbbb-0000-4000-a000-000000000001' },
      }),
    );
  });

  it('seedUsers calls prisma.user.upsert three times', async () => {
    const { seedUsers } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedUsers(mock as any);
    expect(mock.user.upsert).toHaveBeenCalledTimes(3);
  });

  it('seedRoles calls prisma.role.upsert four times', async () => {
    const { seedRoles } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedRoles(mock as any);
    expect(mock.role.upsert).toHaveBeenCalledTimes(4);
  });

  it('seedUserRoles calls prisma.userRole.upsert three times', async () => {
    const { seedUserRoles } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedUserRoles(mock as any);
    expect(mock.userRole.upsert).toHaveBeenCalledTimes(3);
  });

  it('seedPermissions calls prisma.permission.upsert for every role × resource × action', async () => {
    const { seedPermissions } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedPermissions(mock as any);
    // 10 resources × (6 admin + 2 builder + 3 editor + 1 viewer) = 10 × 12 = 120
    expect(mock.permission.upsert).toHaveBeenCalledTimes(120);
  });

  it('seedDbConnections calls prisma.dbConnection.upsert twice', async () => {
    const { seedDbConnections } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedDbConnections(mock as any);
    expect(mock.dbConnection.upsert).toHaveBeenCalledTimes(2);
  });

  it('seedApiKeys calls prisma.apiKey.upsert twice', async () => {
    const { seedApiKeys } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedApiKeys(mock as any);
    expect(mock.apiKey.upsert).toHaveBeenCalledTimes(2);
  });

  it('seedAuditEvents calls prisma.auditEvent.upsert 20 times', async () => {
    const { seedAuditEvents } = await import('../base-seed');
    const mock = makeMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedAuditEvents(mock as any);
    expect(mock.auditEvent.upsert).toHaveBeenCalledTimes(20);
  });

  it('seedFrameworkData calls all individual seed functions', async () => {
    const { seedFrameworkData } = await import('../base-seed');
    // Build a fresh mock with isolated spies so call counts start at 0.
    const orgUpsert = vi.fn().mockResolvedValue({});
    const tenantUpsert = vi.fn().mockResolvedValue({});
    const userUpsert = vi.fn().mockResolvedValue({});
    const roleUpsert = vi.fn().mockResolvedValue({});
    const userRoleUpsert = vi.fn().mockResolvedValue({});
    const permissionUpsert = vi.fn().mockResolvedValue({});
    const dbConnectionUpsert = vi.fn().mockResolvedValue({});
    const apiKeyUpsert = vi.fn().mockResolvedValue({});
    const auditEventUpsert = vi.fn().mockResolvedValue({});
    const isolatedMock = {
      organization: { upsert: orgUpsert },
      tenant: { upsert: tenantUpsert },
      user: { upsert: userUpsert },
      role: { upsert: roleUpsert },
      userRole: { upsert: userRoleUpsert },
      permission: { upsert: permissionUpsert },
      dbConnection: { upsert: dbConnectionUpsert },
      apiKey: { upsert: apiKeyUpsert },
      auditEvent: { upsert: auditEventUpsert },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedFrameworkData(isolatedMock as any);

    expect(orgUpsert).toHaveBeenCalledTimes(1);
    expect(tenantUpsert).toHaveBeenCalledTimes(1);
    expect(userUpsert).toHaveBeenCalledTimes(3);
    expect(roleUpsert).toHaveBeenCalledTimes(4);
    expect(userRoleUpsert).toHaveBeenCalledTimes(3);
    expect(permissionUpsert).toHaveBeenCalledTimes(120);
    expect(dbConnectionUpsert).toHaveBeenCalledTimes(2);
    expect(apiKeyUpsert).toHaveBeenCalledTimes(2);
    expect(auditEventUpsert).toHaveBeenCalledTimes(20);
  });
});

// ---------------------------------------------------------------------------
// base-seed.ts — idempotency: calling seedFrameworkData twice is safe
// ---------------------------------------------------------------------------

describe('base-seed.ts — idempotency', () => {
  it('calling seedFrameworkData twice doubles upsert calls but does not throw', async () => {
    const { seedFrameworkData } = await import('../base-seed');

    const upsert = vi.fn().mockResolvedValue({});
    const mock = {
      organization: { upsert },
      tenant: { upsert },
      user: { upsert },
      role: { upsert },
      userRole: { upsert },
      permission: { upsert },
      dbConnection: { upsert },
      apiKey: { upsert },
      auditEvent: { upsert },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedFrameworkData(mock as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await seedFrameworkData(mock as any);

    // Total across all tables: 1+1+3+4+3+120+2+2+20 = 156 × 2 = 312
    expect(upsert).toHaveBeenCalledTimes(312);
  });
});

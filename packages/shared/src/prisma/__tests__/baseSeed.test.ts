/**
 * Unit tests for baseSeed.ts
 *
 * Tests the exported constants and validates runBaseSeed is a callable function.
 * DB integration tests (actually running the seed) belong in E2E tests.
 */

import { describe, expect, it, vi } from 'vitest';
import { BASE_SEED_IDS, runBaseSeed } from '../baseSeed';

describe('BASE_SEED_IDS', () => {
  it('exports deterministic org ID', () => {
    expect(BASE_SEED_IDS.org).toBe('aaaaaaaa-0000-4000-a000-000000000001');
  });

  it('exports deterministic tenant ID', () => {
    expect(BASE_SEED_IDS.tenant).toBe('bbbbbbbb-0000-4000-a000-000000000001');
  });

  it('exports three user IDs', () => {
    expect(BASE_SEED_IDS.users.admin).toBeDefined();
    expect(BASE_SEED_IDS.users.editor).toBeDefined();
    expect(BASE_SEED_IDS.users.viewer).toBeDefined();
  });

  it('exports four role IDs', () => {
    expect(BASE_SEED_IDS.roles.admin).toBeDefined();
    expect(BASE_SEED_IDS.roles.builder).toBeDefined();
    expect(BASE_SEED_IDS.roles.editor).toBeDefined();
    expect(BASE_SEED_IDS.roles.viewer).toBeDefined();
  });

  it('exports three user-role assignment IDs', () => {
    expect(BASE_SEED_IDS.userRoles.adminAdmin).toBeDefined();
    expect(BASE_SEED_IDS.userRoles.editorEditor).toBeDefined();
    expect(BASE_SEED_IDS.userRoles.viewerViewer).toBeDefined();
  });

  it('all IDs are valid UUID-shaped strings', () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const allIds = [
      BASE_SEED_IDS.org,
      BASE_SEED_IDS.tenant,
      BASE_SEED_IDS.users.admin,
      BASE_SEED_IDS.users.editor,
      BASE_SEED_IDS.users.viewer,
      BASE_SEED_IDS.roles.admin,
      BASE_SEED_IDS.roles.builder,
      BASE_SEED_IDS.roles.editor,
      BASE_SEED_IDS.roles.viewer,
      BASE_SEED_IDS.userRoles.adminAdmin,
      BASE_SEED_IDS.userRoles.editorEditor,
      BASE_SEED_IDS.userRoles.viewerViewer,
      BASE_SEED_IDS.dbConnections.production,
      BASE_SEED_IDS.dbConnections.analytics,
      BASE_SEED_IDS.apiKeys.cicd,
      BASE_SEED_IDS.apiKeys.readOnly,
    ];
    for (const id of allIds) {
      expect(id, `Expected UUID format: ${id}`).toMatch(uuidPattern);
    }
  });

  it('all IDs are unique', () => {
    const allIds = [
      BASE_SEED_IDS.org,
      BASE_SEED_IDS.tenant,
      BASE_SEED_IDS.users.admin,
      BASE_SEED_IDS.users.editor,
      BASE_SEED_IDS.users.viewer,
      BASE_SEED_IDS.roles.admin,
      BASE_SEED_IDS.roles.builder,
      BASE_SEED_IDS.roles.editor,
      BASE_SEED_IDS.roles.viewer,
      BASE_SEED_IDS.userRoles.adminAdmin,
      BASE_SEED_IDS.userRoles.editorEditor,
      BASE_SEED_IDS.userRoles.viewerViewer,
      BASE_SEED_IDS.dbConnections.production,
      BASE_SEED_IDS.dbConnections.analytics,
      BASE_SEED_IDS.apiKeys.cicd,
      BASE_SEED_IDS.apiKeys.readOnly,
    ];
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });
});

describe('runBaseSeed', () => {
  it('is an async function', () => {
    expect(typeof runBaseSeed).toBe('function');
    // Function should return a Promise (is async)
    expect(runBaseSeed.constructor.name).toBe('AsyncFunction');
  });

  it('calls all expected prisma model methods', async () => {
    // Mock PrismaClient — we don't want a real DB connection in unit tests
    const mockPrisma = {
      organization: { upsert: vi.fn().mockResolvedValue({}) },
      tenant: { upsert: vi.fn().mockResolvedValue({}) },
      user: { upsert: vi.fn().mockResolvedValue({}) },
      role: { upsert: vi.fn().mockResolvedValue({}) },
      userRole: { upsert: vi.fn().mockResolvedValue({}) },
      permission: { upsert: vi.fn().mockResolvedValue({}) },
      dbConnection: { upsert: vi.fn().mockResolvedValue({}) },
      apiKey: { upsert: vi.fn().mockResolvedValue({}) },
      auditEvent: { upsert: vi.fn().mockResolvedValue({}) },
    };

    // Cast to PrismaClient — safe for testing purposes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runBaseSeed(mockPrisma as any);

    expect(mockPrisma.organization.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.tenant.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(3); // admin, editor, viewer
    expect(mockPrisma.role.upsert).toHaveBeenCalledTimes(4); // admin, builder, editor, viewer
    expect(mockPrisma.userRole.upsert).toHaveBeenCalledTimes(3);
    // Permissions: 4 roles × 10 resources × varying actions = many
    expect(mockPrisma.permission.upsert).toHaveBeenCalled();
    expect(mockPrisma.dbConnection.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.apiKey.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.auditEvent.upsert).toHaveBeenCalledTimes(20);
  });

  it('seeds org with correct ID', async () => {
    const mockPrisma = {
      organization: { upsert: vi.fn().mockResolvedValue({}) },
      tenant: { upsert: vi.fn().mockResolvedValue({}) },
      user: { upsert: vi.fn().mockResolvedValue({}) },
      role: { upsert: vi.fn().mockResolvedValue({}) },
      userRole: { upsert: vi.fn().mockResolvedValue({}) },
      permission: { upsert: vi.fn().mockResolvedValue({}) },
      dbConnection: { upsert: vi.fn().mockResolvedValue({}) },
      apiKey: { upsert: vi.fn().mockResolvedValue({}) },
      auditEvent: { upsert: vi.fn().mockResolvedValue({}) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runBaseSeed(mockPrisma as any);

    const orgCall = mockPrisma.organization.upsert.mock.calls[0][0];
    expect(orgCall.where.id).toBe(BASE_SEED_IDS.org);
    expect(orgCall.create.id).toBe(BASE_SEED_IDS.org);
    expect(orgCall.create.name).toBe('Acme Corp');
  });
});

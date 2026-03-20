/**
 * Mock data and helpers for tests.
 * Import from '@/test-utils' (re-exported via index.ts).
 */

// ---------------------------------------------------------------------------
// Mock users
// ---------------------------------------------------------------------------

export const mockAdminUser = {
  id: 'user-admin-id',
  email: 'admin@vastu.dev',
  name: 'Admin User',
  roles: [{ name: 'admin', isSystem: true, permissions: [] }],
  organizationId: 'org-id',
  tenantId: 'tenant-id',
};

export const mockEditorUser = {
  id: 'user-editor-id',
  email: 'editor@vastu.dev',
  name: 'Editor User',
  roles: [{ name: 'editor', isSystem: true, permissions: [] }],
  organizationId: 'org-id',
  tenantId: 'tenant-id',
};

export const mockViewerUser = {
  id: 'user-viewer-id',
  email: 'viewer@vastu.dev',
  name: 'Viewer User',
  roles: [{ name: 'viewer', isSystem: true, permissions: [] }],
  organizationId: 'org-id',
  tenantId: 'tenant-id',
};

// ---------------------------------------------------------------------------
// Mock session (next-auth compatible shape)
// ---------------------------------------------------------------------------

export const mockSession = {
  user: mockAdminUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// ---------------------------------------------------------------------------
// Mock CASL abilities
// ---------------------------------------------------------------------------

type AbilityRole = 'admin' | 'editor' | 'viewer' | 'builder';

/**
 * Returns a lightweight object that mimics CASL ability checks for unit tests.
 * Not a real CASL Ability instance — use only in tests where real CASL is not
 * required (e.g. rendering gate components with predictable outcomes).
 */
export function createMockAbilities(role: AbilityRole) {
  const isAdmin = role === 'admin';
  const isBuilder = role === 'builder';
  const isEditor = role === 'editor';

  const can = (action: string, subject: string): boolean => {
    if (isAdmin) return true;
    if (action === 'read') return true;
    if (isBuilder && action === 'configure' && subject === 'Page') return true;
    if (isEditor && action === 'update' && subject === 'Record') return true;
    return false;
  };

  const cannot = (action: string, subject: string): boolean => {
    return !can(action, subject);
  };

  return { can, cannot };
}

// ---------------------------------------------------------------------------
// Mock organization
// ---------------------------------------------------------------------------

export const mockOrganization = {
  id: 'org-id',
  name: 'Acme Corp',
  logoUrl: null as string | null,
  workspaceUrl: 'acme',
  defaultTimezone: 'UTC',
  defaultLanguage: 'en',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ---------------------------------------------------------------------------
// Mock tenant
// ---------------------------------------------------------------------------

export const mockTenant = {
  id: 'tenant-id',
  name: 'Default',
  subdomain: 'default',
  status: 'ACTIVE' as const,
  region: null as string | null,
  dbIsolationMode: 'shared_schema',
  organizationId: 'org-id',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null as Date | null,
};

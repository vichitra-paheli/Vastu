/**
 * Tests for mock data and createMockAbilities helper.
 */

import { describe, expect, it } from 'vitest';
import {
  mockAdminUser,
  mockEditorUser,
  mockViewerUser,
  mockSession,
  mockOrganization,
  mockTenant,
  createMockAbilities,
} from '../mocks';

// ---------------------------------------------------------------------------
// Mock user shapes
// ---------------------------------------------------------------------------

describe('mockAdminUser', () => {
  it('has the correct role name', () => {
    expect(mockAdminUser.roles[0].name).toBe('admin');
  });

  it('has required fields', () => {
    expect(mockAdminUser.id).toBeTruthy();
    expect(mockAdminUser.email).toBeTruthy();
    expect(mockAdminUser.organizationId).toBeTruthy();
  });
});

describe('mockEditorUser', () => {
  it('has the editor role', () => {
    expect(mockEditorUser.roles[0].name).toBe('editor');
  });
});

describe('mockViewerUser', () => {
  it('has the viewer role', () => {
    expect(mockViewerUser.roles[0].name).toBe('viewer');
  });
});

// ---------------------------------------------------------------------------
// mockSession
// ---------------------------------------------------------------------------

describe('mockSession', () => {
  it('references the admin user', () => {
    expect(mockSession.user).toStrictEqual(mockAdminUser);
  });

  it('has an expires field that is a future ISO string', () => {
    expect(new Date(mockSession.expires).getTime()).toBeGreaterThan(Date.now());
  });
});

// ---------------------------------------------------------------------------
// mockOrganization
// ---------------------------------------------------------------------------

describe('mockOrganization', () => {
  it('has required fields', () => {
    expect(mockOrganization.id).toBe('org-id');
    expect(mockOrganization.name).toBe('Acme Corp');
    expect(mockOrganization.createdAt).toBeInstanceOf(Date);
  });

  it('logoUrl can be null', () => {
    expect(mockOrganization.logoUrl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mockTenant
// ---------------------------------------------------------------------------

describe('mockTenant', () => {
  it('has ACTIVE status', () => {
    expect(mockTenant.status).toBe('ACTIVE');
  });

  it('links to the mock organization', () => {
    expect(mockTenant.organizationId).toBe(mockOrganization.id);
  });

  it('deletedAt is null by default', () => {
    expect(mockTenant.deletedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createMockAbilities — happy path
// ---------------------------------------------------------------------------

describe('createMockAbilities', () => {
  it('admin can do anything', () => {
    const ability = createMockAbilities('admin');
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(true);
    expect(ability.can('configure', 'Page')).toBe(true);
    expect(ability.can('some_unknown_action', 'SomeSubject')).toBe(true);
  });

  it('viewer can read but not write', () => {
    const ability = createMockAbilities('viewer');
    expect(ability.can('read', 'Record')).toBe(true);
    expect(ability.can('update', 'Record')).toBe(false);
    expect(ability.can('delete', 'Record')).toBe(false);
  });

  it('editor can update Record', () => {
    const ability = createMockAbilities('editor');
    expect(ability.can('update', 'Record')).toBe(true);
    expect(ability.can('configure', 'Page')).toBe(false);
  });

  it('builder can configure Page but not update Record', () => {
    const ability = createMockAbilities('builder');
    expect(ability.can('configure', 'Page')).toBe(true);
    expect(ability.can('update', 'Record')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // cannot() is the inverse of can()
  // ---------------------------------------------------------------------------

  it('cannot() returns true when action is not permitted', () => {
    const ability = createMockAbilities('viewer');
    expect(ability.cannot('delete', 'Record')).toBe(true);
  });

  it('cannot() returns false when action is permitted', () => {
    const ability = createMockAbilities('admin');
    expect(ability.cannot('delete', 'Record')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('editor can still read', () => {
    const ability = createMockAbilities('editor');
    expect(ability.can('read', 'AnyThing')).toBe(true);
  });

  it('builder can still read', () => {
    const ability = createMockAbilities('builder');
    expect(ability.can('read', 'AnyThing')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { defineAbilitiesFor, isAdmin } from '../abilities';
import type { UserForAbilities } from '../abilities';

function makeUser(roleName: string, permissions: UserForAbilities['roles'][number]['permissions'] = []): UserForAbilities {
  return {
    roles: [
      {
        name: roleName,
        isSystem: true,
        permissions,
      },
    ],
  };
}

describe('defineAbilitiesFor — admin role', () => {
  const ability = defineAbilitiesFor(makeUser('admin'));

  it('can manage all', () => {
    expect(ability.can('manage', 'all')).toBe(true);
  });

  it('can do any action on User', () => {
    expect(ability.can('create', 'User')).toBe(true);
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('update', 'User')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(true);
    expect(ability.can('export', 'User')).toBe(true);
    expect(ability.can('configure', 'User')).toBe(true);
  });

  it('can do any action on Role', () => {
    expect(ability.can('create', 'Role')).toBe(true);
    expect(ability.can('read', 'Role')).toBe(true);
    expect(ability.can('update', 'Role')).toBe(true);
    expect(ability.can('delete', 'Role')).toBe(true);
  });

  it('can do any action on Page', () => {
    expect(ability.can('read', 'Page')).toBe(true);
    expect(ability.can('configure', 'Page')).toBe(true);
    expect(ability.can('delete', 'Page')).toBe(true);
  });

  it('can do any action on Record', () => {
    expect(ability.can('create', 'Record')).toBe(true);
    expect(ability.can('delete', 'Record')).toBe(true);
  });
});

describe('defineAbilitiesFor — builder role', () => {
  const ability = defineAbilitiesFor(makeUser('builder'));

  it('can read all resources', () => {
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('read', 'Role')).toBe(true);
    expect(ability.can('read', 'Permission')).toBe(true);
    expect(ability.can('read', 'Tenant')).toBe(true);
    expect(ability.can('read', 'Page')).toBe(true);
    expect(ability.can('read', 'Record')).toBe(true);
    expect(ability.can('read', 'AuditEvent')).toBe(true);
  });

  it('can configure, create, update, delete Page', () => {
    expect(ability.can('configure', 'Page')).toBe(true);
    expect(ability.can('create', 'Page')).toBe(true);
    expect(ability.can('update', 'Page')).toBe(true);
    expect(ability.can('delete', 'Page')).toBe(true);
  });

  it('cannot manage User', () => {
    expect(ability.can('manage', 'User')).toBe(false);
  });

  it('cannot create, update, or delete User', () => {
    expect(ability.can('create', 'User')).toBe(false);
    expect(ability.can('update', 'User')).toBe(false);
    expect(ability.can('delete', 'User')).toBe(false);
  });

  it('cannot create, update, or delete Role', () => {
    expect(ability.can('create', 'Role')).toBe(false);
    expect(ability.can('update', 'Role')).toBe(false);
    expect(ability.can('delete', 'Role')).toBe(false);
  });

  it('cannot create, update, or delete Record', () => {
    expect(ability.can('create', 'Record')).toBe(false);
    expect(ability.can('update', 'Record')).toBe(false);
    expect(ability.can('delete', 'Record')).toBe(false);
  });
});

describe('defineAbilitiesFor — editor role', () => {
  const ability = defineAbilitiesFor(makeUser('editor'));

  it('can read all resources', () => {
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('read', 'Role')).toBe(true);
    expect(ability.can('read', 'Page')).toBe(true);
    expect(ability.can('read', 'Record')).toBe(true);
  });

  it('can create, update, delete Record', () => {
    expect(ability.can('create', 'Record')).toBe(true);
    expect(ability.can('update', 'Record')).toBe(true);
    expect(ability.can('delete', 'Record')).toBe(true);
  });

  it('cannot manage User or Role', () => {
    expect(ability.can('manage', 'User')).toBe(false);
    expect(ability.can('manage', 'Role')).toBe(false);
  });

  it('cannot create, update, or delete User', () => {
    expect(ability.can('create', 'User')).toBe(false);
    expect(ability.can('update', 'User')).toBe(false);
    expect(ability.can('delete', 'User')).toBe(false);
  });

  it('cannot configure or delete Page', () => {
    expect(ability.can('configure', 'Page')).toBe(false);
    expect(ability.can('delete', 'Page')).toBe(false);
  });
});

describe('defineAbilitiesFor — viewer role', () => {
  const ability = defineAbilitiesFor(makeUser('viewer'));

  it('can read all resources', () => {
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('read', 'Role')).toBe(true);
    expect(ability.can('read', 'Tenant')).toBe(true);
    expect(ability.can('read', 'Page')).toBe(true);
    expect(ability.can('read', 'Record')).toBe(true);
  });

  it('cannot create anything', () => {
    expect(ability.can('create', 'User')).toBe(false);
    expect(ability.can('create', 'Role')).toBe(false);
    expect(ability.can('create', 'Page')).toBe(false);
    expect(ability.can('create', 'Record')).toBe(false);
  });

  it('cannot update anything', () => {
    expect(ability.can('update', 'User')).toBe(false);
    expect(ability.can('update', 'Role')).toBe(false);
    expect(ability.can('update', 'Page')).toBe(false);
    expect(ability.can('update', 'Record')).toBe(false);
  });

  it('cannot delete anything', () => {
    expect(ability.can('delete', 'User')).toBe(false);
    expect(ability.can('delete', 'Role')).toBe(false);
    expect(ability.can('delete', 'Page')).toBe(false);
    expect(ability.can('delete', 'Record')).toBe(false);
  });

  it('cannot manage anything', () => {
    expect(ability.can('manage', 'all')).toBe(false);
    expect(ability.can('manage', 'User')).toBe(false);
  });
});

describe('defineAbilitiesFor — custom role overrides', () => {
  it('grants permission when perm.granted is true', () => {
    const user = makeUser('viewer', [
      { resource: 'Record', action: 'create', granted: true },
    ]);
    const ability = defineAbilitiesFor(user);
    expect(ability.can('create', 'Record')).toBe(true);
  });

  it('revokes permission when perm.granted is false', () => {
    const user = makeUser('editor', [
      { resource: 'Record', action: 'delete', granted: false },
    ]);
    const ability = defineAbilitiesFor(user);
    expect(ability.can('delete', 'Record')).toBe(false);
  });

  it('passes conditions through when conditions are provided', () => {
    const user = makeUser('viewer', [
      {
        resource: 'Record',
        action: 'update',
        granted: true,
        conditions: { tenantId: 'tenant-123' },
      },
    ]);
    const ability = defineAbilitiesFor(user);
    // With conditions, the permission is granted (conditions are stored for runtime checking)
    expect(ability.can('update', 'Record')).toBe(true);
    // The rules contain the condition
    const rules = ability.rulesFor('update', 'Record');
    expect(rules.some((r) => r.conditions && 'tenantId' in r.conditions)).toBe(true);
  });

  it('ignores null conditions and grants broadly', () => {
    const user = makeUser('viewer', [
      {
        resource: 'Record',
        action: 'create',
        granted: true,
        conditions: null,
      },
    ]);
    const ability = defineAbilitiesFor(user);
    expect(ability.can('create', 'Record')).toBe(true);
  });
});

describe('isAdmin helper', () => {
  it('returns true for admin', () => {
    const ability = defineAbilitiesFor(makeUser('admin'));
    expect(isAdmin(ability)).toBe(true);
  });

  it('returns false for builder', () => {
    const ability = defineAbilitiesFor(makeUser('builder'));
    expect(isAdmin(ability)).toBe(false);
  });

  it('returns false for editor', () => {
    const ability = defineAbilitiesFor(makeUser('editor'));
    expect(isAdmin(ability)).toBe(false);
  });

  it('returns false for viewer', () => {
    const ability = defineAbilitiesFor(makeUser('viewer'));
    expect(isAdmin(ability)).toBe(false);
  });
});

describe('defineAbilitiesFor — multiple roles combined', () => {
  it('user with editor and builder roles gets combined permissions', () => {
    const user: UserForAbilities = {
      roles: [
        { name: 'editor', isSystem: true, permissions: [] },
        { name: 'builder', isSystem: true, permissions: [] },
      ],
    };
    const ability = defineAbilitiesFor(user);

    // From editor
    expect(ability.can('create', 'Record')).toBe(true);
    expect(ability.can('update', 'Record')).toBe(true);
    expect(ability.can('delete', 'Record')).toBe(true);

    // From builder
    expect(ability.can('configure', 'Page')).toBe(true);
    expect(ability.can('create', 'Page')).toBe(true);
    expect(ability.can('update', 'Page')).toBe(true);
    expect(ability.can('delete', 'Page')).toBe(true);

    // From both (read all)
    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('read', 'Role')).toBe(true);

    // Neither grants admin
    expect(isAdmin(ability)).toBe(false);
  });

  it('user with viewer and editor roles can read and mutate records', () => {
    const user: UserForAbilities = {
      roles: [
        { name: 'viewer', isSystem: true, permissions: [] },
        { name: 'editor', isSystem: true, permissions: [] },
      ],
    };
    const ability = defineAbilitiesFor(user);
    expect(ability.can('read', 'Record')).toBe(true);
    expect(ability.can('create', 'Record')).toBe(true);
    expect(ability.can('delete', 'Record')).toBe(true);
    // Still cannot manage users
    expect(ability.can('delete', 'User')).toBe(false);
  });
});

describe('defineAbilitiesFor — unknown role', () => {
  it('grants no permissions for an unrecognised system role name with no permissions', () => {
    const ability = defineAbilitiesFor(makeUser('unknown-role'));
    expect(ability.can('read', 'User')).toBe(false);
    expect(ability.can('create', 'Record')).toBe(false);
  });
});

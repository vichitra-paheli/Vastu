/**
 * caslScope unit tests.
 *
 * Implements US-208 AC-8 — exhaustive matrix:
 *   system roles × tables × actions verified.
 *
 * Tests cover:
 *  - Admin: unconditional access, existingWhere preserved
 *  - Builder: read-all, no extra where injection
 *  - Editor: read-all, create/update/delete on Record
 *  - Viewer: read-all, no extra where injection
 *  - Custom role with conditional permissions: where injection
 *  - Denied access: ForbiddenError thrown (AC-4)
 *  - Conditional permissions: conditions injected into where (AC-5)
 *  - Multiple conditional rules: OR'd together
 */

import { describe, it, expect } from 'vitest';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { AnyMongoAbility } from '@casl/ability';
import { scopeQuery, ForbiddenError } from '../caslScope';
import { defineAbilitiesFor } from '../../permissions/abilities';
import type { AppAbility } from '../../permissions/abilities';

// ─── Test helpers ──────────────────────────────────────────────────────────────

/** Create an ability using defineAbilitiesFor (real system roles). */
function abilityFor(roleName: string): AppAbility {
  return defineAbilitiesFor({
    roles: [
      {
        name: roleName,
        isSystem: true,
        permissions: [],
      },
    ],
  });
}

/**
 * Create a custom ability with explicit rules.
 *
 * Uses `AnyMongoAbility` (the union of all MongoAbility variants) so that
 * condition objects with arbitrary properties are accepted by the builder.
 */
function customAbility(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- builder uses any to allow flexible condition shapes in tests
  builder: (b: AbilityBuilder<any>) => void,
): AnyMongoAbility {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- createMongoAbility with any subject type for test flexibility
  const b = new AbilityBuilder<any>(createMongoAbility);
  builder(b);
  return b.build() as AnyMongoAbility;
}

// ─── ForbiddenError ────────────────────────────────────────────────────────────

describe('ForbiddenError', () => {
  it('has statusCode 403', () => {
    const err = new ForbiddenError('read', 'Race');
    expect(err.statusCode).toBe(403);
  });

  it('includes action and table in message', () => {
    const err = new ForbiddenError('delete', 'Driver');
    expect(err.message).toContain('delete');
    expect(err.message).toContain('Driver');
  });

  it('name is ForbiddenError', () => {
    const err = new ForbiddenError('read', 'Race');
    expect(err.name).toBe('ForbiddenError');
  });

  it('is instanceof ForbiddenError', () => {
    expect(new ForbiddenError('read', 'Race')).toBeInstanceOf(ForbiddenError);
  });

  it('is instanceof Error', () => {
    expect(new ForbiddenError('read', 'Race')).toBeInstanceOf(Error);
  });
});

// ─── Admin role ────────────────────────────────────────────────────────────────

describe('scopeQuery — admin role', () => {
  const ability = abilityFor('admin');
  const existing = { organizationId: 'org-1' };

  it('read User: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'read', 'User', existing)).toEqual(existing);
  });

  it('read Race: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'read', 'Race', existing)).toEqual(existing);
  });

  it('delete Driver: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'delete', 'Driver', existing)).toEqual(existing);
  });

  it('configure Page: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'configure', 'Page', existing)).toEqual(existing);
  });

  it('read with empty existingWhere: returns {}', () => {
    expect(scopeQuery(ability, 'read', 'User', {})).toEqual({});
  });
});

// ─── Builder role ──────────────────────────────────────────────────────────────

describe('scopeQuery — builder role', () => {
  const ability = abilityFor('builder');
  const existing = { organizationId: 'org-1' };

  it('read User: returns existing where unchanged (unconditional read all)', () => {
    expect(scopeQuery(ability, 'read', 'User', existing)).toEqual(existing);
  });

  it('read Page: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'read', 'Page', existing)).toEqual(existing);
  });

  it('configure Page: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'configure', 'Page', existing)).toEqual(existing);
  });

  it('delete User: throws ForbiddenError (builder cannot delete users)', () => {
    expect(() => scopeQuery(ability, 'delete', 'User', existing)).toThrow(ForbiddenError);
  });
});

// ─── Editor role ───────────────────────────────────────────────────────────────

describe('scopeQuery — editor role', () => {
  const ability = abilityFor('editor');
  const existing = { organizationId: 'org-1' };

  it('read User: returns existing where unchanged (unconditional read all)', () => {
    expect(scopeQuery(ability, 'read', 'User', existing)).toEqual(existing);
  });

  it('create Record: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'create', 'Record', existing)).toEqual(existing);
  });

  it('update Record: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'update', 'Record', existing)).toEqual(existing);
  });

  it('delete Record: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'delete', 'Record', existing)).toEqual(existing);
  });

  it('configure Page: throws ForbiddenError', () => {
    expect(() => scopeQuery(ability, 'configure', 'Page', existing)).toThrow(ForbiddenError);
  });
});

// ─── Viewer role ───────────────────────────────────────────────────────────────

describe('scopeQuery — viewer role', () => {
  const ability = abilityFor('viewer');
  const existing = { organizationId: 'org-1' };

  it('read User: returns existing where unchanged (unconditional read all)', () => {
    expect(scopeQuery(ability, 'read', 'User', existing)).toEqual(existing);
  });

  it('read Page: returns existing where unchanged', () => {
    expect(scopeQuery(ability, 'read', 'Page', existing)).toEqual(existing);
  });

  it('create Record: throws ForbiddenError', () => {
    expect(() => scopeQuery(ability, 'create', 'Record', existing)).toThrow(ForbiddenError);
  });

  it('update Record: throws ForbiddenError', () => {
    expect(() => scopeQuery(ability, 'update', 'Record', existing)).toThrow(ForbiddenError);
  });

  it('delete Record: throws ForbiddenError', () => {
    expect(() => scopeQuery(ability, 'delete', 'Record', existing)).toThrow(ForbiddenError);
  });

  it('configure Page: throws ForbiddenError', () => {
    expect(() => scopeQuery(ability, 'configure', 'Page', existing)).toThrow(ForbiddenError);
  });

  it('delete User: throws ForbiddenError', () => {
    expect(() => scopeQuery(ability, 'delete', 'User', existing)).toThrow(ForbiddenError);
  });
});

// ─── Conditional permissions (AC-5) ───────────────────────────────────────────

describe('scopeQuery — conditional permissions (AC-5)', () => {
  it('single condition injected into where (empty existing)', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Race', { status: 'Completed' });
    });

    const result = scopeQuery(ability, 'read', 'Race', {});
    expect(result).toEqual({ status: 'Completed' });
  });

  it('single condition merged with existing where via AND', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Race', { status: 'Completed' });
    });

    const result = scopeQuery(ability, 'read', 'Race', { organizationId: 'org-1' });
    expect(result).toEqual({
      AND: [{ organizationId: 'org-1' }, { status: 'Completed' }],
    });
  });

  it('multiple conditional rules are OR-ed together', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Race', { status: 'Completed' });
      can('read', 'Race', { status: 'Cancelled' });
    });

    const result = scopeQuery(ability, 'read', 'Race', {});
    expect(result).toEqual({
      OR: [{ status: 'Completed' }, { status: 'Cancelled' }],
    });
  });

  it('multiple conditional rules with existing where: AND wraps OR', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Race', { status: 'Completed' });
      can('read', 'Race', { status: 'Cancelled' });
    });

    const result = scopeQuery(ability, 'read', 'Race', { organizationId: 'org-1' });
    expect(result).toEqual({
      AND: [
        { organizationId: 'org-1' },
        { OR: [{ status: 'Completed' }, { status: 'Cancelled' }] },
      ],
    });
  });

  it('unconditional rule mixed with conditional: unconditional wins (all rows visible)', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Race', { status: 'Completed' });
      can('read', 'Race'); // unconditional
    });

    const existing = { organizationId: 'org-1' };
    const result = scopeQuery(ability, 'read', 'Race', existing);
    // Unconditional rule means no extra scoping needed
    expect(result).toEqual(existing);
  });

  it('nested condition object injected correctly', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'RaceResult', { race: { status: 'Completed' } });
    });

    const result = scopeQuery(ability, 'read', 'RaceResult', {});
    expect(result).toEqual({ race: { status: 'Completed' } });
  });
});

// ─── Denied access (AC-4) ─────────────────────────────────────────────────────

describe('scopeQuery — denied access (AC-4)', () => {
  it('no matching rules at all: throws ForbiddenError', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'User');
    });

    expect(() => scopeQuery(ability, 'read', 'Race', {})).toThrow(ForbiddenError);
  });

  it('only inverted (cannot) rules: throws ForbiddenError', () => {
    const ability = customAbility(({ can, cannot }) => {
      can('read', 'all');
      cannot('read', 'SecretTable');
    });

    expect(() => scopeQuery(ability, 'read', 'SecretTable', {})).toThrow(ForbiddenError);
  });

  it('empty ability (no rules): throws ForbiddenError', () => {
    const ability = customAbility(() => {
      // no rules
    });

    expect(() => scopeQuery(ability, 'read', 'Race', {})).toThrow(ForbiddenError);
  });

  it('throws ForbiddenError (not generic Error)', () => {
    const ability = customAbility(() => {});
    const err = (() => {
      try {
        scopeQuery(ability, 'read', 'Race', {});
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(ForbiddenError);
    expect((err as ForbiddenError).statusCode).toBe(403);
  });
});

// ─── Domain tables (arbitrary string subjects) ────────────────────────────────

describe('scopeQuery — domain table names (arbitrary string subjects)', () => {
  it('can scope domain table Race not in Resource union', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Race');
    });

    expect(scopeQuery(ability, 'read', 'Race', {})).toEqual({});
  });

  it('can scope domain table Driver with condition', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Driver', { status: 'Active' });
    });

    expect(scopeQuery(ability, 'read', 'Driver', {})).toEqual({ status: 'Active' });
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('scopeQuery — edge cases', () => {
  it('returns empty object when existingWhere is empty and no conditions', () => {
    const ability = customAbility(({ can }) => {
      can('read', 'Race');
    });

    expect(scopeQuery(ability, 'read', 'Race', {})).toEqual({});
  });

  it('admin with complex existing where: returns it unchanged', () => {
    const ability = abilityFor('admin');
    const complex = { AND: [{ orgId: 'org-1' }, { status: { in: ['A', 'B'] } }] };
    expect(scopeQuery(ability, 'read', 'Race', complex)).toEqual(complex);
  });

  it('manage rule on specific table grants unconditional access', () => {
    const ability = customAbility(({ can }) => {
      can('manage', 'Race');
    });

    const existing = { organizationId: 'org-1' };
    expect(scopeQuery(ability, 'read', 'Race', existing)).toEqual(existing);
    expect(scopeQuery(ability, 'delete', 'Race', existing)).toEqual(existing);
  });
});

/**
 * Unit tests for the schema introspector utility.
 *
 * Uses vitest module mocking to provide a controlled DMMF fixture
 * without a live Prisma client or database.
 *
 * Implements US-204 AC-1, AC-2, AC-3.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Prisma DMMF mock fixture ─────────────────────────────────────────────────

/**
 * vi.mock is hoisted to the top of the file by vitest, so we cannot reference
 * any const that is declared in the same file. Use vi.hoisted() to declare
 * the fixture value at hoist-time so it is available inside the factory.
 *
 * Minimal DMMF fixture covering:
 *   - A model with scalar fields (String, Int, Boolean, DateTime)
 *   - An enum field (Status)
 *   - A hasOne relation (organizationId → Organization)
 *   - A hasMany back-reference (posts ← Post)
 *   - Nullable and required variants
 */
const { MOCK_DMMF } = vi.hoisted(() => ({
  MOCK_DMMF: {
    datamodel: {
      models: [
        {
          name: 'User',
          fields: [
            // PK
            { name: 'id', kind: 'scalar', type: 'String', isRequired: true, isId: true, isList: false },
            // Plain scalar
            { name: 'email', kind: 'scalar', type: 'String', isRequired: true, isId: false, isList: false },
            // Nullable scalar
            { name: 'displayName', kind: 'scalar', type: 'String', isRequired: false, isId: false, isList: false },
            // Int
            { name: 'age', kind: 'scalar', type: 'Int', isRequired: false, isId: false, isList: false },
            // Boolean
            { name: 'isActive', kind: 'scalar', type: 'Boolean', isRequired: true, isId: false, isList: false },
            // DateTime
            { name: 'createdAt', kind: 'scalar', type: 'DateTime', isRequired: true, isId: false, isList: false },
            // Enum field
            { name: 'status', kind: 'enum', type: 'UserStatus', isRequired: true, isId: false, isList: false },
            // FK scalar — backed by relation below
            { name: 'organizationId', kind: 'scalar', type: 'String', isRequired: true, isId: false, isList: false },
            // hasOne relation (owns FK scalar)
            {
              name: 'organization',
              kind: 'object',
              type: 'Organization',
              isRequired: true,
              isId: false,
              isList: false,
              relationName: 'UserToOrganization',
              relationFromFields: ['organizationId'],
              relationToFields: ['id'],
            },
            // hasMany back-reference (no FK on this side)
            {
              name: 'posts',
              kind: 'object',
              type: 'Post',
              isRequired: false,
              isId: false,
              isList: true,
              relationName: 'PostToUser',
              relationFromFields: [],
              relationToFields: [],
            },
          ],
        },
        {
          name: 'Organization',
          fields: [
            { name: 'id', kind: 'scalar', type: 'String', isRequired: true, isId: true, isList: false },
            { name: 'name', kind: 'scalar', type: 'String', isRequired: true, isId: false, isList: false },
          ],
        },
      ],
      enums: [
        {
          name: 'UserStatus',
          values: [{ name: 'Active' }, { name: 'Inactive' }, { name: 'Suspended' }],
        },
      ],
    },
  },
}));

// Mock @prisma/client before importing the module under test
vi.mock('@prisma/client', () => ({
  Prisma: {
    dmmf: MOCK_DMMF,
  },
}));

// Import AFTER mocking so the module picks up the mock
import {
  getModelList,
  getModelSchema,
  getModelFields,
  getModelRelations,
  _clearSchemaCache,
} from '../schemaIntrospector';

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset the cache so tests don't interfere with each other
  _clearSchemaCache();
});

// ─── getModelList ─────────────────────────────────────────────────────────────

describe('getModelList', () => {
  it('returns all model names from DMMF', () => {
    const names = getModelList();
    expect(names).toContain('User');
    expect(names).toContain('Organization');
  });

  it('returns an array of strings', () => {
    const names = getModelList();
    expect(Array.isArray(names)).toBe(true);
    for (const n of names) {
      expect(typeof n).toBe('string');
    }
  });
});

// ─── getModelSchema — error handling ─────────────────────────────────────────

describe('getModelSchema — unknown model', () => {
  it('throws for an unknown model name', () => {
    expect(() => getModelSchema('NonExistentModel')).toThrow(
      'Unknown Prisma model: "NonExistentModel"',
    );
  });
});

// ─── getModelSchema — scalar fields ──────────────────────────────────────────

describe('getModelSchema — scalar fields', () => {
  it('returns the correct model name', () => {
    const schema = getModelSchema('User');
    expect(schema.name).toBe('User');
  });

  it('maps String scalars correctly', () => {
    const { fields } = getModelSchema('User');
    const emailField = fields.find((f) => f.name === 'email');
    expect(emailField).toBeDefined();
    expect(emailField?.type).toBe('String');
    expect(emailField?.isRequired).toBe(true);
    expect(emailField?.isId).toBe(false);
  });

  it('marks the @id field with isId=true', () => {
    const { fields } = getModelSchema('User');
    const idField = fields.find((f) => f.name === 'id');
    expect(idField?.isId).toBe(true);
    expect(idField?.isForeignKey).toBe(false);
    expect(idField?.isRequired).toBe(true);
  });

  it('marks nullable scalars with isRequired=false', () => {
    const { fields } = getModelSchema('User');
    const displayNameField = fields.find((f) => f.name === 'displayName');
    expect(displayNameField?.isRequired).toBe(false);
  });

  it('maps Int scalars correctly', () => {
    const { fields } = getModelSchema('User');
    const ageField = fields.find((f) => f.name === 'age');
    expect(ageField?.type).toBe('Int');
  });

  it('maps Boolean scalars correctly', () => {
    const { fields } = getModelSchema('User');
    const isActiveField = fields.find((f) => f.name === 'isActive');
    expect(isActiveField?.type).toBe('Boolean');
    expect(isActiveField?.isRequired).toBe(true);
  });

  it('maps DateTime scalars correctly', () => {
    const { fields } = getModelSchema('User');
    const createdAtField = fields.find((f) => f.name === 'createdAt');
    expect(createdAtField?.type).toBe('DateTime');
  });

  it('excludes relation object fields from the fields array', () => {
    const { fields } = getModelSchema('User');
    const fieldNames = fields.map((f) => f.name);
    expect(fieldNames).not.toContain('organization');
    expect(fieldNames).not.toContain('posts');
  });
});

// ─── getModelSchema — enum fields ─────────────────────────────────────────────

describe('getModelSchema — enum fields', () => {
  it('maps enum fields with type=Enum', () => {
    const { fields } = getModelSchema('User');
    const statusField = fields.find((f) => f.name === 'status');
    expect(statusField?.type).toBe('Enum');
  });

  it('includes enumValues for enum fields', () => {
    const { fields } = getModelSchema('User');
    const statusField = fields.find((f) => f.name === 'status');
    expect(statusField?.enumValues).toEqual(['Active', 'Inactive', 'Suspended']);
  });

  it('does not include enumValues for non-enum fields', () => {
    const { fields } = getModelSchema('User');
    const emailField = fields.find((f) => f.name === 'email');
    expect(emailField?.enumValues).toBeUndefined();
  });
});

// ─── getModelSchema — FK fields ───────────────────────────────────────────────

describe('getModelSchema — foreign key fields', () => {
  it('marks FK scalar as isForeignKey=true', () => {
    const { fields } = getModelSchema('User');
    const orgIdField = fields.find((f) => f.name === 'organizationId');
    expect(orgIdField?.isForeignKey).toBe(true);
  });

  it('sets relatedModel on FK scalar', () => {
    const { fields } = getModelSchema('User');
    const orgIdField = fields.find((f) => f.name === 'organizationId');
    expect(orgIdField?.relatedModel).toBe('Organization');
  });

  it('marks non-FK fields as isForeignKey=false', () => {
    const { fields } = getModelSchema('User');
    const emailField = fields.find((f) => f.name === 'email');
    expect(emailField?.isForeignKey).toBe(false);
    expect(emailField?.relatedModel).toBeUndefined();
  });
});

// ─── getModelSchema — relations ───────────────────────────────────────────────

describe('getModelSchema — relations', () => {
  it('includes hasOne relations', () => {
    const { relations } = getModelSchema('User');
    const orgRelation = relations.find((r) => r.name === 'organization');
    expect(orgRelation).toBeDefined();
    expect(orgRelation?.type).toBe('hasOne');
    expect(orgRelation?.relatedModel).toBe('Organization');
  });

  it('includes the foreignKey on hasOne relations', () => {
    const { relations } = getModelSchema('User');
    const orgRelation = relations.find((r) => r.name === 'organization');
    expect(orgRelation?.foreignKey).toEqual(['organizationId']);
  });

  it('includes hasMany back-references', () => {
    const { relations } = getModelSchema('User');
    const postsRelation = relations.find((r) => r.name === 'posts');
    expect(postsRelation).toBeDefined();
    expect(postsRelation?.type).toBe('hasMany');
    expect(postsRelation?.relatedModel).toBe('Post');
  });

  it('sets empty foreignKey array for hasMany back-relations', () => {
    const { relations } = getModelSchema('User');
    const postsRelation = relations.find((r) => r.name === 'posts');
    expect(postsRelation?.foreignKey).toEqual([]);
  });
});

// ─── getModelSchema — caching (AC-3) ─────────────────────────────────────────

describe('getModelSchema — caching', () => {
  it('returns the same object reference on repeated calls', () => {
    const first = getModelSchema('User');
    const second = getModelSchema('User');
    expect(first).toBe(second);
  });

  it('cache is cleared by _clearSchemaCache', () => {
    const first = getModelSchema('User');
    _clearSchemaCache();
    const second = getModelSchema('User');
    // Different object reference after cache clear
    expect(first).not.toBe(second);
    // But structurally equal
    expect(second.name).toBe('User');
  });
});

// ─── getModelFields convenience wrapper ───────────────────────────────────────

describe('getModelFields', () => {
  it('returns the same fields as getModelSchema().fields', () => {
    const fields = getModelFields('User');
    const schema = getModelSchema('User');
    expect(fields).toEqual(schema.fields);
  });

  it('throws for unknown model', () => {
    expect(() => getModelFields('Unknown')).toThrow('Unknown Prisma model: "Unknown"');
  });
});

// ─── getModelRelations convenience wrapper ────────────────────────────────────

describe('getModelRelations', () => {
  it('returns the same relations as getModelSchema().relations', () => {
    const relations = getModelRelations('User');
    const schema = getModelSchema('User');
    expect(relations).toEqual(schema.relations);
  });

  it('throws for unknown model', () => {
    expect(() => getModelRelations('Unknown')).toThrow('Unknown Prisma model: "Unknown"');
  });
});

// ─── Organization model (minimal model sanity check) ─────────────────────────

describe('getModelSchema — Organization model', () => {
  it('returns the correct fields for a minimal model', () => {
    const { fields } = getModelSchema('Organization');
    expect(fields).toHaveLength(2);
    expect(fields.find((f) => f.name === 'id')?.isId).toBe(true);
    expect(fields.find((f) => f.name === 'name')?.type).toBe('String');
  });

  it('returns empty relations array for a model with no relations', () => {
    const { relations } = getModelSchema('Organization');
    expect(relations).toHaveLength(0);
  });
});

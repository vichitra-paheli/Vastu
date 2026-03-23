/**
 * FilterTranslator unit tests.
 *
 * Implements US-202 AC-10 — 15+ test cases covering all mode combinations
 * and nesting levels.
 */

import { describe, it, expect } from 'vitest';
import { translateFilter } from '../filterTranslator';
import type { FilterNode, FilterCondition, FilterGroup } from '../filterTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function condition(
  column: string,
  mode: FilterCondition['mode'],
  dataType: FilterCondition['dataType'],
  value: FilterCondition['value'],
): FilterCondition {
  return { type: 'condition', column, mode, dataType, value };
}

function andGroup(...children: FilterNode[]): FilterGroup {
  return { type: 'group', connector: 'AND', children };
}

function orGroup(...children: FilterNode[]): FilterGroup {
  return { type: 'group', connector: 'OR', children };
}

// ─── Null / empty tests ───────────────────────────────────────────────────────

describe('translateFilter — null/empty', () => {
  it('returns {} for null input', () => {
    expect(translateFilter(null)).toEqual({});
  });

  it('returns {} for undefined input', () => {
    expect(translateFilter(undefined)).toEqual({});
  });

  it('returns {} for empty AND group', () => {
    expect(translateFilter(andGroup())).toEqual({});
  });

  it('returns {} for empty OR group', () => {
    expect(translateFilter(orGroup())).toEqual({});
  });

  it('returns {} for condition with null value', () => {
    expect(translateFilter(condition('name', 'include', 'text', null))).toEqual({});
  });

  it('returns {} for condition with empty string array', () => {
    expect(translateFilter(condition('name', 'include', 'enum', []))).toEqual({});
  });
});

// ─── Include mode ─────────────────────────────────────────────────────────────

describe('translateFilter — include mode', () => {
  it('text include — single value', () => {
    const result = translateFilter(condition('name', 'include', 'text', 'Alice'));
    expect(result).toEqual({ name: { in: ['Alice'] } });
  });

  it('text include — multiple values (array)', () => {
    const result = translateFilter(condition('status', 'include', 'text', ['Active', 'Pending']));
    expect(result).toEqual({ status: { in: ['Active', 'Pending'] } });
  });

  it('enum include — multiple values', () => {
    const result = translateFilter(condition('role', 'include', 'enum', ['admin', 'editor']));
    expect(result).toEqual({ role: { in: ['admin', 'editor'] } });
  });

  it('boolean include — true', () => {
    const result = translateFilter(condition('active', 'include', 'boolean', true));
    expect(result).toEqual({ active: true });
  });

  it('boolean include — false', () => {
    const result = translateFilter(condition('active', 'include', 'boolean', false));
    expect(result).toEqual({ active: false });
  });

  it('number range include — both bounds', () => {
    const result = translateFilter(condition('age', 'include', 'number', { min: 18, max: 65 }));
    expect(result).toEqual({ age: { gte: 18, lte: 65 } });
  });

  it('number range include — lower bound only', () => {
    const result = translateFilter(condition('points', 'include', 'number', { min: 100 }));
    expect(result).toEqual({ points: { gte: 100 } });
  });

  it('number range include — upper bound only', () => {
    const result = translateFilter(condition('price', 'include', 'number', { max: 500 }));
    expect(result).toEqual({ price: { lte: 500 } });
  });

  it('date range include — both bounds', () => {
    const result = translateFilter(
      condition('createdAt', 'include', 'date', {
        start: '2024-01-01',
        end: '2024-12-31',
      }),
    );
    expect(result).toEqual({
      createdAt: {
        gte: new Date('2024-01-01'),
        lte: new Date('2024-12-31'),
      },
    });
  });

  it('date range include — start only', () => {
    const result = translateFilter(
      condition('date', 'include', 'date', { start: '2024-06-01' }),
    );
    expect(result).toEqual({ date: { gte: new Date('2024-06-01') } });
  });
});

// ─── Exclude mode ─────────────────────────────────────────────────────────────

describe('translateFilter — exclude mode', () => {
  it('text exclude — single value', () => {
    const result = translateFilter(condition('status', 'exclude', 'text', 'deleted'));
    expect(result).toEqual({ status: { NOT: { in: ['deleted'] } } });
  });

  it('enum exclude — multiple values', () => {
    const result = translateFilter(
      condition('type', 'exclude', 'enum', ['draft', 'archived']),
    );
    expect(result).toEqual({ type: { NOT: { in: ['draft', 'archived'] } } });
  });

  it('number range exclude', () => {
    const result = translateFilter(condition('age', 'exclude', 'number', { min: 0, max: 17 }));
    expect(result).toEqual({ age: { NOT: { gte: 0, lte: 17 } } });
  });

  it('date range exclude', () => {
    const result = translateFilter(
      condition('deletedAt', 'exclude', 'date', {
        start: '2020-01-01',
        end: '2021-01-01',
      }),
    );
    expect(result).toEqual({
      deletedAt: {
        NOT: {
          gte: new Date('2020-01-01'),
          lte: new Date('2021-01-01'),
        },
      },
    });
  });
});

// ─── Regex mode ───────────────────────────────────────────────────────────────

describe('translateFilter — regex mode', () => {
  it('regex — simple pattern', () => {
    const result = translateFilter(condition('name', 'regex', 'text', '^Alice'));
    expect(result).toEqual({ name: { contains: '^Alice', mode: 'insensitive' } });
  });

  it('regex — complex pattern', () => {
    const result = translateFilter(condition('email', 'regex', 'text', '@vastu\\.io$'));
    expect(result).toEqual({ email: { contains: '@vastu\\.io$', mode: 'insensitive' } });
  });

  it('regex — throws on invalid pattern', () => {
    expect(() =>
      translateFilter(condition('name', 'regex', 'text', '[invalid')),
    ).toThrow('Invalid regex pattern');
  });

  it('regex — returns {} for empty pattern', () => {
    expect(translateFilter(condition('name', 'regex', 'text', ''))).toEqual({});
  });
});

// ─── AND / OR groups ──────────────────────────────────────────────────────────

describe('translateFilter — AND/OR groups', () => {
  it('AND group with two conditions', () => {
    const result = translateFilter(
      andGroup(
        condition('status', 'include', 'enum', ['active']),
        condition('role', 'include', 'enum', ['admin']),
      ),
    );
    expect(result).toEqual({
      AND: [
        { status: { in: ['active'] } },
        { role: { in: ['admin'] } },
      ],
    });
  });

  it('OR group with two conditions', () => {
    const result = translateFilter(
      orGroup(
        condition('firstName', 'include', 'text', 'Alice'),
        condition('lastName', 'include', 'text', 'Smith'),
      ),
    );
    expect(result).toEqual({
      OR: [
        { firstName: { in: ['Alice'] } },
        { lastName: { in: ['Smith'] } },
      ],
    });
  });

  it('single child group unwraps (no AND/OR wrapper)', () => {
    const result = translateFilter(
      andGroup(condition('name', 'include', 'text', 'Bob')),
    );
    expect(result).toEqual({ name: { in: ['Bob'] } });
  });

  it('AND group skips empty conditions', () => {
    const result = translateFilter(
      andGroup(
        condition('name', 'include', 'text', null),  // skipped
        condition('status', 'include', 'enum', ['active']),
      ),
    );
    expect(result).toEqual({ status: { in: ['active'] } });
  });
});

// ─── Nesting ──────────────────────────────────────────────────────────────────

describe('translateFilter — nested groups', () => {
  it('two-level nesting: (A AND B) OR (C AND D)', () => {
    const result = translateFilter(
      orGroup(
        andGroup(
          condition('country', 'include', 'enum', ['US']),
          condition('active', 'include', 'boolean', true),
        ),
        andGroup(
          condition('country', 'include', 'enum', ['UK']),
          condition('active', 'include', 'boolean', true),
        ),
      ),
    );
    expect(result).toEqual({
      OR: [
        { AND: [{ country: { in: ['US'] } }, { active: true }] },
        { AND: [{ country: { in: ['UK'] } }, { active: true }] },
      ],
    });
  });

  it('three-level nesting', () => {
    const result = translateFilter(
      andGroup(
        orGroup(
          andGroup(
            condition('a', 'include', 'text', 'x'),
          ),
        ),
      ),
    );
    expect(result).toEqual({ a: { in: ['x'] } });
  });
});

// ─── Dot-notation relation columns ────────────────────────────────────────────

describe('translateFilter — dot-notation columns', () => {
  it('one level relation: "driver.name"', () => {
    const result = translateFilter(
      condition('driver.name', 'include', 'text', 'Hamilton'),
    );
    expect(result).toEqual({ driver: { name: { in: ['Hamilton'] } } });
  });

  it('two level relation: "race.circuit.name"', () => {
    const result = translateFilter(
      condition('race.circuit.name', 'include', 'text', 'Monaco'),
    );
    expect(result).toEqual({ race: { circuit: { name: { in: ['Monaco'] } } } });
  });

  it('dot-notation with boolean', () => {
    const result = translateFilter(
      condition('driver.isActive', 'include', 'boolean', true),
    );
    expect(result).toEqual({ driver: { isActive: true } });
  });

  it('dot-notation in AND group', () => {
    const result = translateFilter(
      andGroup(
        condition('driver.name', 'regex', 'text', 'Lewis'),
        condition('driver.nationality', 'include', 'enum', ['British']),
      ),
    );
    expect(result).toEqual({
      AND: [
        { driver: { name: { contains: 'Lewis', mode: 'insensitive' } } },
        { driver: { nationality: { in: ['British'] } } },
      ],
    });
  });
});

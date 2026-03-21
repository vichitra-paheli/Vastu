/**
 * FilterEngine unit tests.
 *
 * Covers:
 * - All 5 data types × 3 modes
 * - Nested AND/OR groups
 * - Edge cases: empty filters, null values, invalid regex
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  evaluateGroup,
  evaluateFilter,
  applyFilters,
  validateRegex,
} from '../FilterEngine';
import type { FilterCondition, FilterGroup } from '../types';

// ─────────────────────────────────────────────
// Helper factories
// ─────────────────────────────────────────────

function textCondition(
  mode: FilterCondition['mode'],
  value: string | string[],
): FilterCondition {
  return { type: 'condition', column: 'name', dataType: 'text', mode, value };
}

function enumCondition(
  mode: FilterCondition['mode'],
  value: string[],
): FilterCondition {
  return { type: 'condition', column: 'status', dataType: 'enum', mode, value };
}

function numberCondition(
  mode: FilterCondition['mode'],
  value: { min?: number; max?: number },
): FilterCondition {
  return { type: 'condition', column: 'amount', dataType: 'number', mode, value };
}

function dateCondition(
  mode: FilterCondition['mode'],
  value: { start?: string; end?: string },
): FilterCondition {
  return { type: 'condition', column: 'date', dataType: 'date', mode, value };
}

function booleanCondition(
  mode: FilterCondition['mode'],
  value: boolean | null,
): FilterCondition {
  return { type: 'condition', column: 'active', dataType: 'boolean', mode, value };
}

// ─────────────────────────────────────────────
// Text filters
// ─────────────────────────────────────────────

describe('text filters', () => {
  const row = { name: 'Alice Johnson' };

  it('include: matches substring (case-insensitive)', () => {
    expect(evaluateCondition(textCondition('include', ['alice']), row)).toBe(true);
    expect(evaluateCondition(textCondition('include', ['ALICE']), row)).toBe(true);
  });

  it('include: no match returns false', () => {
    expect(evaluateCondition(textCondition('include', ['bob']), row)).toBe(false);
  });

  it('include: empty array returns true (no filter)', () => {
    expect(evaluateCondition(textCondition('include', []), row)).toBe(true);
  });

  it('include: multiple terms — any match is enough (OR within terms)', () => {
    expect(evaluateCondition(textCondition('include', ['bob', 'alice']), row)).toBe(true);
  });

  it('exclude: hides matching rows', () => {
    expect(evaluateCondition(textCondition('exclude', ['alice']), row)).toBe(false);
  });

  it('exclude: shows non-matching rows', () => {
    expect(evaluateCondition(textCondition('exclude', ['bob']), row)).toBe(true);
  });

  it('exclude: empty array returns true', () => {
    expect(evaluateCondition(textCondition('exclude', []), row)).toBe(true);
  });

  it('regex: matches pattern', () => {
    expect(evaluateCondition(textCondition('regex', '^Alice'), row)).toBe(true);
  });

  it('regex: no match', () => {
    expect(evaluateCondition(textCondition('regex', '^Bob'), row)).toBe(false);
  });

  it('regex: invalid pattern returns false (no crash)', () => {
    expect(evaluateCondition(textCondition('regex', '[invalid'), row)).toBe(false);
  });

  it('regex: empty pattern returns true', () => {
    expect(evaluateCondition(textCondition('regex', ''), row)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Enum filters
// ─────────────────────────────────────────────

describe('enum filters', () => {
  const row = { status: 'Shipped' };

  it('include: exact match', () => {
    expect(evaluateCondition(enumCondition('include', ['Shipped']), row)).toBe(true);
  });

  it('include: no match', () => {
    expect(evaluateCondition(enumCondition('include', ['Pending']), row)).toBe(false);
  });

  it('include: multiple values — match if any', () => {
    expect(
      evaluateCondition(enumCondition('include', ['Pending', 'Shipped']), row),
    ).toBe(true);
  });

  it('include: empty array returns true', () => {
    expect(evaluateCondition(enumCondition('include', []), row)).toBe(true);
  });

  it('exclude: hides matched value', () => {
    expect(evaluateCondition(enumCondition('exclude', ['Shipped']), row)).toBe(false);
  });

  it('exclude: shows unmatched value', () => {
    expect(evaluateCondition(enumCondition('exclude', ['Pending']), row)).toBe(true);
  });

  it('regex: matches label', () => {
    expect(
      evaluateCondition(
        { type: 'condition', column: 'status', dataType: 'enum', mode: 'regex', value: '^Ship' },
        row,
      ),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Number filters
// ─────────────────────────────────────────────

describe('number filters', () => {
  it('include: within range', () => {
    const row = { amount: 500 };
    expect(
      evaluateCondition(numberCondition('include', { min: 100, max: 1000 }), row),
    ).toBe(true);
  });

  it('include: below min', () => {
    const row = { amount: 50 };
    expect(
      evaluateCondition(numberCondition('include', { min: 100, max: 1000 }), row),
    ).toBe(false);
  });

  it('include: above max', () => {
    const row = { amount: 2000 };
    expect(
      evaluateCondition(numberCondition('include', { min: 100, max: 1000 }), row),
    ).toBe(false);
  });

  it('include: min only', () => {
    const row = { amount: 150 };
    expect(evaluateCondition(numberCondition('include', { min: 100 }), row)).toBe(true);
  });

  it('include: max only', () => {
    const row = { amount: 50 };
    expect(evaluateCondition(numberCondition('include', { max: 100 }), row)).toBe(true);
  });

  it('include: no bounds → true', () => {
    const row = { amount: 999 };
    expect(evaluateCondition(numberCondition('include', {}), row)).toBe(true);
  });

  it('include: null value → false', () => {
    const row = { amount: null };
    expect(
      evaluateCondition(numberCondition('include', { min: 0, max: 1000 }), row),
    ).toBe(false);
  });

  it('exclude: outside range', () => {
    const row = { amount: 5000 };
    expect(
      evaluateCondition(numberCondition('exclude', { min: 100, max: 1000 }), row),
    ).toBe(true);
  });

  it('exclude: inside range', () => {
    const row = { amount: 500 };
    expect(
      evaluateCondition(numberCondition('exclude', { min: 100, max: 1000 }), row),
    ).toBe(false);
  });

  it('regex mode: always returns true (N/A for numbers)', () => {
    const row = { amount: 500 };
    expect(
      evaluateCondition(numberCondition('regex', { min: 100, max: 1000 }), row),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Date filters
// ─────────────────────────────────────────────

describe('date filters', () => {
  it('include: within range', () => {
    const row = { date: '2026-03-10' };
    expect(
      evaluateCondition(
        dateCondition('include', { start: '2026-03-01', end: '2026-03-31' }),
        row,
      ),
    ).toBe(true);
  });

  it('include: before start', () => {
    const row = { date: '2026-02-15' };
    expect(
      evaluateCondition(
        dateCondition('include', { start: '2026-03-01', end: '2026-03-31' }),
        row,
      ),
    ).toBe(false);
  });

  it('include: after end', () => {
    const row = { date: '2026-04-01' };
    expect(
      evaluateCondition(
        dateCondition('include', { start: '2026-03-01', end: '2026-03-31' }),
        row,
      ),
    ).toBe(false);
  });

  it('include: start only', () => {
    const row = { date: '2026-03-20' };
    expect(
      evaluateCondition(dateCondition('include', { start: '2026-03-01' }), row),
    ).toBe(true);
  });

  it('include: no bounds → true', () => {
    const row = { date: '2026-03-20' };
    expect(evaluateCondition(dateCondition('include', {}), row)).toBe(true);
  });

  it('include: null date → false', () => {
    const row = { date: null };
    expect(
      evaluateCondition(
        dateCondition('include', { start: '2026-03-01', end: '2026-03-31' }),
        row,
      ),
    ).toBe(false);
  });

  it('exclude: outside range', () => {
    const row = { date: '2026-04-15' };
    expect(
      evaluateCondition(
        dateCondition('exclude', { start: '2026-03-01', end: '2026-03-31' }),
        row,
      ),
    ).toBe(true);
  });

  it('regex mode: always returns true (N/A for dates)', () => {
    const row = { date: '2026-03-10' };
    expect(evaluateCondition(dateCondition('regex', {}), row)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Boolean filters
// ─────────────────────────────────────────────

describe('boolean filters', () => {
  it('include true: matches true value', () => {
    expect(evaluateCondition(booleanCondition('include', true), { active: true })).toBe(true);
  });

  it('include true: rejects false value', () => {
    expect(evaluateCondition(booleanCondition('include', true), { active: false })).toBe(false);
  });

  it('include false: matches false value', () => {
    expect(evaluateCondition(booleanCondition('include', false), { active: false })).toBe(true);
  });

  it('include null (any): always true', () => {
    expect(evaluateCondition(booleanCondition('include', null), { active: true })).toBe(true);
    expect(evaluateCondition(booleanCondition('include', null), { active: false })).toBe(true);
  });

  it('exclude true: hides true rows', () => {
    expect(evaluateCondition(booleanCondition('exclude', true), { active: true })).toBe(false);
  });

  it('exclude true: shows false rows', () => {
    expect(evaluateCondition(booleanCondition('exclude', true), { active: false })).toBe(true);
  });

  it('exclude null: always true', () => {
    expect(evaluateCondition(booleanCondition('exclude', null), { active: true })).toBe(true);
  });

  it('regex mode: always returns true (N/A for boolean)', () => {
    expect(evaluateCondition(booleanCondition('regex', null), { active: true })).toBe(true);
  });

  it('handles string "true"/"false" cell values', () => {
    expect(evaluateCondition(booleanCondition('include', true), { active: 'true' })).toBe(true);
    expect(evaluateCondition(booleanCondition('include', false), { active: 'false' })).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Group evaluation (AND/OR)
// ─────────────────────────────────────────────

describe('evaluateGroup', () => {
  const row = { name: 'Alice', status: 'Shipped', amount: 500 };

  it('empty group returns true', () => {
    const group: FilterGroup = { type: 'group', connector: 'AND', children: [] };
    expect(evaluateGroup(group, row)).toBe(true);
  });

  it('AND: all must pass', () => {
    const group: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        textCondition('include', ['Alice']),
        enumCondition('include', ['Shipped']),
      ],
    };
    expect(evaluateGroup(group, row)).toBe(true);
  });

  it('AND: one failing condition fails the group', () => {
    const group: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        textCondition('include', ['Alice']),
        enumCondition('include', ['Pending']),
      ],
    };
    expect(evaluateGroup(group, row)).toBe(false);
  });

  it('OR: at least one must pass', () => {
    const group: FilterGroup = {
      type: 'group',
      connector: 'OR',
      children: [
        textCondition('include', ['Bob']),
        enumCondition('include', ['Shipped']),
      ],
    };
    expect(evaluateGroup(group, row)).toBe(true);
  });

  it('OR: all failing fails the group', () => {
    const group: FilterGroup = {
      type: 'group',
      connector: 'OR',
      children: [
        textCondition('include', ['Bob']),
        enumCondition('include', ['Pending']),
      ],
    };
    expect(evaluateGroup(group, row)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Nested AND/OR groups
// ─────────────────────────────────────────────

describe('nested AND/OR groups', () => {
  it('nested OR inside AND: matches correctly', () => {
    // (name=Alice AND (status=Pending OR amount>=1000))
    const innerOr: FilterGroup = {
      type: 'group',
      connector: 'OR',
      children: [
        enumCondition('include', ['Pending']),
        numberCondition('include', { min: 1000 }),
      ],
    };
    const outer: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [textCondition('include', ['Alice']), innerOr],
    };

    // Alice + Shipped + 500 → Alice matches, innerOR: Pending=false, amount>=1000=false → false
    expect(evaluateGroup(outer, { name: 'Alice', status: 'Shipped', amount: 500 })).toBe(false);
    // Alice + Shipped + 2000 → Alice matches, innerOR: amount>=1000=true → true
    expect(evaluateGroup(outer, { name: 'Alice', status: 'Shipped', amount: 2000 })).toBe(true);
    // Alice + Pending + 500 → Alice matches, innerOR: Pending=true → true
    expect(evaluateGroup(outer, { name: 'Alice', status: 'Pending', amount: 500 })).toBe(true);
    // Bob + Pending + 500 → Alice=false → entire AND=false
    expect(evaluateGroup(outer, { name: 'Bob', status: 'Pending', amount: 500 })).toBe(false);
  });

  it('triple nested: AND → OR → AND', () => {
    const innerAnd: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        enumCondition('include', ['Shipped']),
        numberCondition('include', { min: 100 }),
      ],
    };
    const midOr: FilterGroup = {
      type: 'group',
      connector: 'OR',
      children: [textCondition('include', ['Bob']), innerAnd],
    };
    const outerAnd: FilterGroup = {
      type: 'group',
      connector: 'AND',
      children: [
        {
          type: 'condition',
          column: 'active',
          dataType: 'boolean',
          mode: 'include',
          value: true,
        },
        midOr,
      ],
    };

    // active=true, name=Alice, status=Shipped, amount=200
    // → active=true, OR: Bob=false, innerAnd: Shipped=true AND >=100=true → true → true
    expect(
      evaluateFilter(outerAnd, { active: true, name: 'Alice', status: 'Shipped', amount: 200 }),
    ).toBe(true);

    // active=false → whole thing false
    expect(
      evaluateFilter(outerAnd, { active: false, name: 'Alice', status: 'Shipped', amount: 200 }),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// applyFilters
// ─────────────────────────────────────────────

describe('applyFilters', () => {
  const rows = [
    { name: 'Alice', status: 'Shipped', amount: 500 },
    { name: 'Bob', status: 'Pending', amount: 200 },
    { name: 'Charlie', status: 'Shipped', amount: 1500 },
  ];

  it('null root returns all rows', () => {
    expect(applyFilters(rows, null)).toHaveLength(3);
  });

  it('empty root returns all rows', () => {
    const root = { type: 'group' as const, connector: 'AND' as const, children: [] };
    expect(applyFilters(rows, root)).toHaveLength(3);
  });

  it('filters by status include', () => {
    const root = {
      type: 'group' as const,
      connector: 'AND' as const,
      children: [enumCondition('include', ['Shipped'])],
    };
    const result = applyFilters(rows, root);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['Alice', 'Charlie']);
  });

  it('filters by amount exclude', () => {
    const root = {
      type: 'group' as const,
      connector: 'AND' as const,
      children: [numberCondition('exclude', { min: 500 })],
    };
    const result = applyFilters(rows, root);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bob');
  });
});

// ─────────────────────────────────────────────
// validateRegex
// ─────────────────────────────────────────────

describe('validateRegex', () => {
  it('returns null for valid patterns', () => {
    expect(validateRegex('')).toBeNull();
    expect(validateRegex('^Alice')).toBeNull();
    expect(validateRegex('[a-z]+')).toBeNull();
    expect(validateRegex('\\d{4}-\\d{2}')).toBeNull();
  });

  it('returns error message for invalid patterns', () => {
    expect(validateRegex('[invalid')).not.toBeNull();
    expect(typeof validateRegex('[invalid')).toBe('string');
  });
});

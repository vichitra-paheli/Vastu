/**
 * filterTranslator unit tests.
 *
 * Tests every filter mode, nesting, and edge cases.
 * No database connection needed — translateFilter is a pure function.
 *
 * Implements VASTU-2A-202f.
 */

import { describe, it, expect } from 'vitest';
import { translateFilter } from '../filterTranslator';
import type { FilterNode, FilterCondition, FilterGroup, FilterValue } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convenience: cast an arbitrary value to FilterValue for test purposes.
 * The translator handles shapes beyond the union (e.g. object ranges) that
 * arrive from the FilterSystem component. We cast here to avoid duplicating
 * all those union variants in the shared view.ts type.
 */
function asValue(v: unknown): FilterValue {
  return v as FilterValue;
}

function cond(
  overrides: Partial<FilterCondition> & Pick<FilterCondition, 'column' | 'value'>,
): FilterCondition {
  return {
    type: 'condition',
    mode: 'include',
    dataType: 'text',
    ...overrides,
  };
}

function group(connector: 'AND' | 'OR', children: FilterNode[]): FilterGroup {
  return { type: 'group', connector, children };
}

// ---------------------------------------------------------------------------
// Empty / null inputs
// ---------------------------------------------------------------------------

describe('empty and null inputs', () => {
  it('returns {} for null filter', () => {
    expect(translateFilter(null)).toEqual({});
  });

  it('returns {} for undefined filter', () => {
    expect(translateFilter(undefined)).toEqual({});
  });

  it('returns {} for empty AND group', () => {
    const filter = group('AND', []);
    expect(translateFilter(filter)).toEqual({});
  });

  it('returns {} for empty OR group', () => {
    const filter = group('OR', []);
    expect(translateFilter(filter)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Include mode — text/enum
// ---------------------------------------------------------------------------

describe('include mode — text/enum', () => {
  it('single string value → equals', () => {
    const filter = cond({ column: 'status', value: 'Active' });
    expect(translateFilter(filter)).toEqual({ status: { equals: 'Active' } });
  });

  it('empty string → returns {}', () => {
    const filter = cond({ column: 'name', value: '' });
    expect(translateFilter(filter)).toEqual({});
  });

  it('single-element array → equals (not in)', () => {
    const filter = cond({ column: 'status', value: ['Active'] });
    expect(translateFilter(filter)).toEqual({ status: { equals: 'Active' } });
  });

  it('multi-element array → in', () => {
    const filter = cond({ column: 'status', value: ['Active', 'Retired'] });
    expect(translateFilter(filter)).toEqual({ status: { in: ['Active', 'Retired'] } });
  });

  it('empty array → returns {}', () => {
    const filter = cond({ column: 'status', value: [] });
    expect(translateFilter(filter)).toEqual({});
  });

  it('null value → returns {}', () => {
    const filter = cond({ column: 'name', value: null });
    expect(translateFilter(filter)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Exclude mode — text/enum
// ---------------------------------------------------------------------------

describe('exclude mode — text/enum', () => {
  it('single string → NOT equals', () => {
    const filter = cond({ column: 'status', mode: 'exclude', value: 'Retired' });
    expect(translateFilter(filter)).toEqual({ NOT: { status: { equals: 'Retired' } } });
  });

  it('single-element array → NOT equals', () => {
    const filter = cond({ column: 'status', mode: 'exclude', value: ['Retired'] });
    expect(translateFilter(filter)).toEqual({ NOT: { status: { equals: 'Retired' } } });
  });

  it('multi-element array → NOT in', () => {
    const filter = cond({
      column: 'status',
      mode: 'exclude',
      value: ['Retired', 'Reserve'],
    });
    expect(translateFilter(filter)).toEqual({
      NOT: { status: { in: ['Retired', 'Reserve'] } },
    });
  });

  it('empty string → returns {}', () => {
    const filter = cond({ column: 'status', mode: 'exclude', value: '' });
    expect(translateFilter(filter)).toEqual({});
  });

  it('empty array → returns {}', () => {
    const filter = cond({ column: 'status', mode: 'exclude', value: [] });
    expect(translateFilter(filter)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Regex mode
// ---------------------------------------------------------------------------

describe('regex mode', () => {
  it('non-empty string → contains insensitive', () => {
    const filter = cond({ column: 'lastName', mode: 'regex', value: 'ham' });
    expect(translateFilter(filter)).toEqual({
      lastName: { contains: 'ham', mode: 'insensitive' },
    });
  });

  it('empty string → returns {}', () => {
    const filter = cond({ column: 'lastName', mode: 'regex', value: '' });
    expect(translateFilter(filter)).toEqual({});
  });

  it('special regex characters are passed through', () => {
    const filter = cond({ column: 'name', mode: 'regex', value: 'apex.*racing' });
    expect(translateFilter(filter)).toEqual({
      name: { contains: 'apex.*racing', mode: 'insensitive' },
    });
  });

  it('non-string value → returns {}', () => {
    const filter = cond({ column: 'name', mode: 'regex', value: null });
    expect(translateFilter(filter)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Number range
// ---------------------------------------------------------------------------

describe('number range', () => {
  it('tuple [min, max] → gte + lte', () => {
    const filter = cond({
      column: 'points',
      dataType: 'number',
      value: asValue([10, 25]),
    });
    expect(translateFilter(filter)).toEqual({ points: { gte: 10, lte: 25 } });
  });

  it('object {min, max} → gte + lte', () => {
    const filter = cond({
      column: 'points',
      dataType: 'number',
      value: asValue({ min: 10, max: 25 }),
    });
    expect(translateFilter(filter)).toEqual({ points: { gte: 10, lte: 25 } });
  });

  it('object {min only} → gte only', () => {
    const filter = cond({
      column: 'points',
      dataType: 'number',
      value: asValue({ min: 10 }),
    });
    expect(translateFilter(filter)).toEqual({ points: { gte: 10 } });
  });

  it('object {max only} → lte only', () => {
    const filter = cond({
      column: 'points',
      dataType: 'number',
      value: asValue({ max: 50 }),
    });
    expect(translateFilter(filter)).toEqual({ points: { lte: 50 } });
  });

  it('empty object {} → returns {}', () => {
    const filter = cond({
      column: 'points',
      dataType: 'number',
      value: asValue({}),
    });
    expect(translateFilter(filter)).toEqual({});
  });

  it('scalar number → equals', () => {
    const filter = cond({
      column: 'round',
      dataType: 'number',
      value: asValue(5),
    });
    expect(translateFilter(filter)).toEqual({ round: { equals: 5 } });
  });

  it('exclude + range → NOT clause', () => {
    const filter = cond({
      column: 'points',
      dataType: 'number',
      mode: 'exclude',
      value: asValue({ min: 0, max: 5 }),
    });
    expect(translateFilter(filter)).toEqual({ NOT: { points: { gte: 0, lte: 5 } } });
  });
});

// ---------------------------------------------------------------------------
// Date range
// ---------------------------------------------------------------------------

describe('date range', () => {
  it('object {start, end} → gte + lte as Date', () => {
    const filter = cond({
      column: 'date',
      dataType: 'date',
      value: asValue({ start: '2024-01-01', end: '2024-12-31' }),
    });
    const result = translateFilter(filter);
    expect(result).toEqual({
      date: {
        gte: new Date('2024-01-01'),
        lte: new Date('2024-12-31'),
      },
    });
  });

  it('object {start only} → gte only', () => {
    const filter = cond({
      column: 'createdAt',
      dataType: 'date',
      value: asValue({ start: '2024-06-01' }),
    });
    const result = translateFilter(filter);
    expect(result).toEqual({ createdAt: { gte: new Date('2024-06-01') } });
  });

  it('object {end only} → lte only', () => {
    const filter = cond({
      column: 'createdAt',
      dataType: 'date',
      value: asValue({ end: '2024-12-31' }),
    });
    const result = translateFilter(filter);
    expect(result).toEqual({ createdAt: { lte: new Date('2024-12-31') } });
  });

  it('ISO date string → equals', () => {
    const filter = cond({
      column: 'date',
      dataType: 'date',
      value: asValue('2024-03-15'),
    });
    const result = translateFilter(filter);
    expect(result).toEqual({ date: { equals: new Date('2024-03-15') } });
  });

  it('invalid date string → returns {}', () => {
    const filter = cond({
      column: 'date',
      dataType: 'date',
      value: asValue('not-a-date'),
    });
    expect(translateFilter(filter)).toEqual({});
  });

  it('empty date strings → returns {}', () => {
    const filter = cond({
      column: 'date',
      dataType: 'date',
      value: asValue({ start: '', end: '' }),
    });
    expect(translateFilter(filter)).toEqual({});
  });

  it('exclude + date range → NOT clause', () => {
    const filter = cond({
      column: 'date',
      dataType: 'date',
      mode: 'exclude',
      value: asValue({ start: '2024-01-01', end: '2024-06-30' }),
    });
    const result = translateFilter(filter);
    expect(result).toEqual({
      NOT: {
        date: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-06-30'),
        },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Boolean
// ---------------------------------------------------------------------------

describe('boolean', () => {
  it('true → column: true', () => {
    const filter = cond({ column: 'fastestLap', dataType: 'boolean', value: true });
    expect(translateFilter(filter)).toEqual({ fastestLap: true });
  });

  it('false → column: false', () => {
    const filter = cond({ column: 'fastestLap', dataType: 'boolean', value: false });
    expect(translateFilter(filter)).toEqual({ fastestLap: false });
  });

  it('null → returns {} (any)', () => {
    const filter = cond({ column: 'fastestLap', dataType: 'boolean', value: null });
    expect(translateFilter(filter)).toEqual({});
  });

  it('non-boolean value → returns {}', () => {
    const filter = cond({
      column: 'fastestLap',
      dataType: 'boolean',
      value: asValue('yes'),
    });
    expect(translateFilter(filter)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// AND / OR groups
// ---------------------------------------------------------------------------

describe('AND group', () => {
  it('single child — no wrapper', () => {
    const filter = group('AND', [cond({ column: 'status', value: 'Active' })]);
    expect(translateFilter(filter)).toEqual({ status: { equals: 'Active' } });
  });

  it('two children → AND array', () => {
    const filter = group('AND', [
      cond({ column: 'status', value: 'Active' }),
      cond({ column: 'nationality', value: 'British' }),
    ]);
    expect(translateFilter(filter)).toEqual({
      AND: [
        { status: { equals: 'Active' } },
        { nationality: { equals: 'British' } },
      ],
    });
  });

  it('three children → AND array', () => {
    const filter = group('AND', [
      cond({ column: 'status', value: 'Active' }),
      cond({ column: 'nationality', value: 'British' }),
      cond({ column: 'lastName', mode: 'regex', value: 'ham' }),
    ]);
    const result = translateFilter(filter);
    expect(result).toHaveProperty('AND');
    expect((result.AND as unknown[]).length).toBe(3);
  });
});

describe('OR group', () => {
  it('single child — no wrapper', () => {
    const filter = group('OR', [cond({ column: 'status', value: 'Active' })]);
    expect(translateFilter(filter)).toEqual({ status: { equals: 'Active' } });
  });

  it('two children → OR array', () => {
    const filter = group('OR', [
      cond({ column: 'status', value: 'Active' }),
      cond({ column: 'status', value: 'Reserve' }),
    ]);
    expect(translateFilter(filter)).toEqual({
      OR: [
        { status: { equals: 'Active' } },
        { status: { equals: 'Reserve' } },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Nested groups
// ---------------------------------------------------------------------------

describe('nested groups', () => {
  it('AND containing OR', () => {
    const filter = group('AND', [
      cond({ column: 'nationality', value: 'British' }),
      group('OR', [
        cond({ column: 'status', value: 'Active' }),
        cond({ column: 'status', value: 'Reserve' }),
      ]),
    ]);
    expect(translateFilter(filter)).toEqual({
      AND: [
        { nationality: { equals: 'British' } },
        {
          OR: [
            { status: { equals: 'Active' } },
            { status: { equals: 'Reserve' } },
          ],
        },
      ],
    });
  });

  it('OR containing AND', () => {
    const filter = group('OR', [
      group('AND', [
        cond({ column: 'nationality', value: 'British' }),
        cond({ column: 'championships', dataType: 'number', value: asValue(1) }),
      ]),
      group('AND', [
        cond({ column: 'nationality', value: 'Dutch' }),
        cond({ column: 'status', value: 'Active' }),
      ]),
    ]);
    const result = translateFilter(filter);
    expect(result).toEqual({
      OR: [
        {
          AND: [
            { nationality: { equals: 'British' } },
            { championships: { equals: 1 } },
          ],
        },
        {
          AND: [
            { nationality: { equals: 'Dutch' } },
            { status: { equals: 'Active' } },
          ],
        },
      ],
    });
  });

  it('three levels deep', () => {
    const filter = group('AND', [
      cond({ column: 'status', value: 'Active' }),
      group('OR', [
        group('AND', [
          cond({ column: 'nationality', value: 'British' }),
          cond({ column: 'wins', dataType: 'number', value: asValue({ min: 1 }) }),
        ]),
        cond({ column: 'championships', dataType: 'number', value: asValue({ min: 1 }) }),
      ]),
    ]);
    const result = translateFilter(filter);
    expect(result).toHaveProperty('AND');
    const and = result.AND as unknown[];
    expect(and.length).toBe(2);
    // Second element should be OR
    expect(and[1]).toHaveProperty('OR');
  });

  it('group with all invalid children → returns {}', () => {
    const filter = group('AND', [
      // null value = skipped
      cond({ column: 'status', value: null }),
      cond({ column: 'name', value: '' }),
    ]);
    expect(translateFilter(filter)).toEqual({});
  });

  it('mixed valid/invalid children — only valid ones included', () => {
    const filter = group('AND', [
      cond({ column: 'status', value: null }),   // skipped
      cond({ column: 'nationality', value: 'British' }),  // included
    ]);
    // Single valid child — no AND wrapper
    expect(translateFilter(filter)).toEqual({ nationality: { equals: 'British' } });
  });
});

// ---------------------------------------------------------------------------
// Column allowlist
// ---------------------------------------------------------------------------

describe('column allowlist', () => {
  it('allows valid columns through', () => {
    const filter = cond({ column: 'status', value: 'Active' });
    expect(translateFilter(filter, ['status', 'name'])).toEqual({
      status: { equals: 'Active' },
    });
  });

  it('rejects column not in allowlist → returns {}', () => {
    const filter = cond({ column: 'internalSecret', value: 'x' });
    expect(translateFilter(filter, ['status', 'name'])).toEqual({});
  });

  it('skips invalid columns in group, keeps valid ones', () => {
    const filter = group('AND', [
      cond({ column: 'status', value: 'Active' }),
      cond({ column: '__proto__', value: 'injected' }), // not in allowlist
    ]);
    expect(translateFilter(filter, ['status'])).toEqual({
      status: { equals: 'Active' },
    });
  });

  it('empty allowlist = no validation (trusted context)', () => {
    const filter = cond({ column: 'anyColumn', value: 'x' });
    expect(translateFilter(filter, [])).toEqual({ anyColumn: { equals: 'x' } });
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('condition node at root (not wrapped in group)', () => {
    const filter: FilterNode = cond({ column: 'status', value: 'Active' });
    expect(translateFilter(filter)).toEqual({ status: { equals: 'Active' } });
  });

  it('regex with leading/trailing whitespace — passes through as-is', () => {
    const filter = cond({ column: 'name', mode: 'regex', value: '  apex  ' });
    expect(translateFilter(filter)).toEqual({
      name: { contains: '  apex  ', mode: 'insensitive' },
    });
  });

  it('include with scalar number', () => {
    const filter = cond({
      column: 'round',
      value: asValue(5),
    });
    expect(translateFilter(filter)).toEqual({ round: { equals: 5 } });
  });

  it('deeply nested empty group is pruned', () => {
    const filter = group('AND', [
      group('OR', [
        group('AND', []),  // empty — produces null
      ]),
      cond({ column: 'status', value: 'Active' }),
    ]);
    // The empty nested group is pruned; only the condition survives
    expect(translateFilter(filter)).toEqual({ status: { equals: 'Active' } });
  });
});

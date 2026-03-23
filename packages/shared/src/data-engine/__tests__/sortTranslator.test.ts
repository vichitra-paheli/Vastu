/**
 * sortTranslator unit tests.
 *
 * Tests multi-column sort and nested relation sort.
 * No database connection needed — translateSort is a pure function.
 *
 * Implements VASTU-2A-202g.
 */

import { describe, it, expect } from 'vitest';
import { translateSort } from '../sortTranslator';
import type { SortConfig } from '../types';

// ---------------------------------------------------------------------------
// Empty inputs
// ---------------------------------------------------------------------------

describe('empty inputs', () => {
  it('empty array → empty array', () => {
    expect(translateSort([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Simple column sort
// ---------------------------------------------------------------------------

describe('simple column sort', () => {
  it('single asc sort', () => {
    const sorts: SortConfig[] = [{ column: 'lastName', direction: 'asc' }];
    expect(translateSort(sorts)).toEqual([{ lastName: 'asc' }]);
  });

  it('single desc sort', () => {
    const sorts: SortConfig[] = [{ column: 'points', direction: 'desc' }];
    expect(translateSort(sorts)).toEqual([{ points: 'desc' }]);
  });

  it('multi-column sort preserves order', () => {
    const sorts: SortConfig[] = [
      { column: 'season', direction: 'desc' },
      { column: 'round', direction: 'asc' },
    ];
    expect(translateSort(sorts)).toEqual([
      { season: 'desc' },
      { round: 'asc' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Nested relation sort (dot-path)
// ---------------------------------------------------------------------------

describe('nested relation sort', () => {
  it('one level deep — driver.lastName', () => {
    const sorts: SortConfig[] = [{ column: 'driver.lastName', direction: 'asc' }];
    expect(translateSort(sorts)).toEqual([{ driver: { lastName: 'asc' } }]);
  });

  it('one level deep — constructor.name desc', () => {
    const sorts: SortConfig[] = [{ column: 'constructor.name', direction: 'desc' }];
    expect(translateSort(sorts)).toEqual([{ constructor: { name: 'desc' } }]);
  });

  it('two levels deep — race.circuit.name', () => {
    const sorts: SortConfig[] = [{ column: 'race.circuit.name', direction: 'asc' }];
    expect(translateSort(sorts)).toEqual([
      { race: { circuit: { name: 'asc' } } },
    ]);
  });

  it('three levels deep', () => {
    const sorts: SortConfig[] = [
      { column: 'a.b.c.d', direction: 'desc' },
    ];
    expect(translateSort(sorts)).toEqual([
      { a: { b: { c: { d: 'desc' } } } },
    ]);
  });

  it('mix of simple and nested in multi-column sort', () => {
    const sorts: SortConfig[] = [
      { column: 'driver.lastName', direction: 'asc' },
      { column: 'points', direction: 'desc' },
    ];
    expect(translateSort(sorts)).toEqual([
      { driver: { lastName: 'asc' } },
      { points: 'desc' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Column allowlist
// ---------------------------------------------------------------------------

describe('column allowlist', () => {
  it('allows valid top-level column', () => {
    const sorts: SortConfig[] = [{ column: 'name', direction: 'asc' }];
    expect(translateSort(sorts, ['name', 'points'])).toEqual([{ name: 'asc' }]);
  });

  it('rejects column not in allowlist', () => {
    const sorts: SortConfig[] = [{ column: 'secret', direction: 'asc' }];
    expect(translateSort(sorts, ['name', 'points'])).toEqual([]);
  });

  it('dot-path: top-level segment validated against allowlist', () => {
    const sorts: SortConfig[] = [{ column: 'driver.lastName', direction: 'asc' }];
    // 'driver' is the top-level segment
    expect(translateSort(sorts, ['driver', 'points'])).toEqual([
      { driver: { lastName: 'asc' } },
    ]);
  });

  it('dot-path: rejects when top-level not allowed', () => {
    const sorts: SortConfig[] = [{ column: 'forbidden.field', direction: 'asc' }];
    expect(translateSort(sorts, ['name', 'points'])).toEqual([]);
  });

  it('empty allowlist = no validation', () => {
    const sorts: SortConfig[] = [{ column: 'anything', direction: 'desc' }];
    expect(translateSort(sorts, [])).toEqual([{ anything: 'desc' }]);
  });

  it('partial filter — keeps valid, drops invalid', () => {
    const sorts: SortConfig[] = [
      { column: 'name', direction: 'asc' },
      { column: 'secret', direction: 'desc' },
    ];
    expect(translateSort(sorts, ['name'])).toEqual([{ name: 'asc' }]);
  });
});

// ---------------------------------------------------------------------------
// Invalid sort entries
// ---------------------------------------------------------------------------

describe('invalid sort entries', () => {
  it('invalid direction is filtered out', () => {
    const sorts = [{ column: 'name', direction: 'random' as 'asc' | 'desc' }];
    expect(translateSort(sorts)).toEqual([]);
  });

  it('empty column string is filtered out', () => {
    const sorts: SortConfig[] = [{ column: '', direction: 'asc' }];
    expect(translateSort(sorts)).toEqual([]);
  });
});

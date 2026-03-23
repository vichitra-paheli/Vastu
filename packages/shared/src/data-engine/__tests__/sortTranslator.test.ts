/**
 * SortTranslator unit tests.
 *
 * Implements US-202 AC-3.
 */

import { describe, it, expect } from 'vitest';
import { translateSort } from '../sortTranslator';
import type { SortSpec } from '../types';

describe('translateSort', () => {
  it('returns [] for empty input', () => {
    expect(translateSort([])).toEqual([]);
  });

  it('single column asc', () => {
    const result = translateSort([{ column: 'name', direction: 'asc' }]);
    expect(result).toEqual([{ name: 'asc' }]);
  });

  it('single column desc', () => {
    const result = translateSort([{ column: 'createdAt', direction: 'desc' }]);
    expect(result).toEqual([{ createdAt: 'desc' }]);
  });

  it('multi-column sort', () => {
    const specs: SortSpec[] = [
      { column: 'points', direction: 'desc' },
      { column: 'name', direction: 'asc' },
    ];
    expect(translateSort(specs)).toEqual([
      { points: 'desc' },
      { name: 'asc' },
    ]);
  });

  it('nested relation sort — one level', () => {
    const result = translateSort([{ column: 'driver.name', direction: 'asc' }]);
    expect(result).toEqual([{ driver: { name: 'asc' } }]);
  });

  it('nested relation sort — two levels', () => {
    const result = translateSort([{ column: 'race.circuit.name', direction: 'desc' }]);
    expect(result).toEqual([{ race: { circuit: { name: 'desc' } } }]);
  });

  it('mixed flat and nested sort', () => {
    const specs: SortSpec[] = [
      { column: 'season', direction: 'desc' },
      { column: 'driver.lastName', direction: 'asc' },
    ];
    expect(translateSort(specs)).toEqual([
      { season: 'desc' },
      { driver: { lastName: 'asc' } },
    ]);
  });
});

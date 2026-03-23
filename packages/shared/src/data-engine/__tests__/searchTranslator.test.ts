/**
 * SearchTranslator unit tests.
 *
 * Implements US-202 AC-5.
 */

import { describe, it, expect } from 'vitest';
import { buildSearchWhere } from '../searchTranslator';

describe('buildSearchWhere', () => {
  it('returns {} for null term', () => {
    expect(buildSearchWhere(null, ['name', 'email'])).toEqual({});
  });

  it('returns {} for undefined term', () => {
    expect(buildSearchWhere(undefined, ['name'])).toEqual({});
  });

  it('returns {} for empty string term', () => {
    expect(buildSearchWhere('', ['name'])).toEqual({});
  });

  it('returns {} for whitespace-only term', () => {
    expect(buildSearchWhere('   ', ['name'])).toEqual({});
  });

  it('returns {} for empty columns array', () => {
    expect(buildSearchWhere('hello', [])).toEqual({});
  });

  it('single column — wraps directly (no OR)', () => {
    const result = buildSearchWhere('alice', ['name']);
    expect(result).toEqual({ name: { contains: 'alice', mode: 'insensitive' } });
  });

  it('two columns — OR clause', () => {
    const result = buildSearchWhere('vastu', ['firstName', 'lastName']);
    expect(result).toEqual({
      OR: [
        { firstName: { contains: 'vastu', mode: 'insensitive' } },
        { lastName: { contains: 'vastu', mode: 'insensitive' } },
      ],
    });
  });

  it('three columns — OR clause', () => {
    const result = buildSearchWhere('f1', ['name', 'description', 'category']);
    expect(result).toEqual({
      OR: [
        { name: { contains: 'f1', mode: 'insensitive' } },
        { description: { contains: 'f1', mode: 'insensitive' } },
        { category: { contains: 'f1', mode: 'insensitive' } },
      ],
    });
  });

  it('trims whitespace from term', () => {
    const result = buildSearchWhere('  hamilton  ', ['lastName']);
    expect(result).toEqual({
      lastName: { contains: 'hamilton', mode: 'insensitive' },
    });
  });

  it('uses insensitive mode for case-insensitive matching', () => {
    const result = buildSearchWhere('ALICE', ['name']);
    expect(result).toEqual({ name: { contains: 'ALICE', mode: 'insensitive' } });
  });
});

/**
 * searchTranslator unit tests.
 *
 * Tests global text search translation.
 * No database connection needed — translateSearch is a pure function.
 *
 * Implements VASTU-2A-202g.
 */

import { describe, it, expect } from 'vitest';
import { translateSearch, getStringColumnNames } from '../searchTranslator';
import type { ColumnMeta } from '../types';

// ---------------------------------------------------------------------------
// translateSearch
// ---------------------------------------------------------------------------

describe('translateSearch', () => {
  describe('empty / null inputs', () => {
    it('null search → {}', () => {
      expect(translateSearch(null, ['firstName', 'lastName'])).toEqual({});
    });

    it('undefined search → {}', () => {
      expect(translateSearch(undefined, ['firstName', 'lastName'])).toEqual({});
    });

    it('empty string → {}', () => {
      expect(translateSearch('', ['firstName', 'lastName'])).toEqual({});
    });

    it('whitespace-only string → {}', () => {
      expect(translateSearch('   ', ['firstName', 'lastName'])).toEqual({});
    });

    it('non-empty search but empty column list → {}', () => {
      expect(translateSearch('hamilton', [])).toEqual({});
    });
  });

  describe('single column', () => {
    it('returns plain contains clause (no OR wrapper)', () => {
      expect(translateSearch('hamilton', ['lastName'])).toEqual({
        lastName: { contains: 'hamilton', mode: 'insensitive' },
      });
    });

    it('trims the search term', () => {
      expect(translateSearch('  apex  ', ['name'])).toEqual({
        name: { contains: 'apex', mode: 'insensitive' },
      });
    });
  });

  describe('multiple columns', () => {
    it('two columns → OR clause', () => {
      expect(translateSearch('hamilton', ['firstName', 'lastName'])).toEqual({
        OR: [
          { firstName: { contains: 'hamilton', mode: 'insensitive' } },
          { lastName: { contains: 'hamilton', mode: 'insensitive' } },
        ],
      });
    });

    it('three columns → OR with three entries', () => {
      const result = translateSearch('brit', ['firstName', 'lastName', 'nationality']);
      expect(result).toEqual({
        OR: [
          { firstName: { contains: 'brit', mode: 'insensitive' } },
          { lastName: { contains: 'brit', mode: 'insensitive' } },
          { nationality: { contains: 'brit', mode: 'insensitive' } },
        ],
      });
    });

    it('column order is preserved in OR array', () => {
      const cols = ['name', 'location', 'country'];
      const result = translateSearch('UK', cols) as { OR: { [k: string]: unknown }[] };
      expect(result.OR.map((c) => Object.keys(c)[0])).toEqual(cols);
    });

    it('special characters in search term — passed through as-is', () => {
      const result = translateSearch("O'Connor", ['lastName']);
      expect(result).toEqual({
        lastName: { contains: "O'Connor", mode: 'insensitive' },
      });
    });
  });
});

// ---------------------------------------------------------------------------
// getStringColumnNames
// ---------------------------------------------------------------------------

describe('getStringColumnNames', () => {
  const cols: ColumnMeta[] = [
    { name: 'id', type: 'String', nullable: false, isPrimaryKey: true, isForeignKey: false },
    { name: 'firstName', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: false },
    { name: 'lastName', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: false },
    { name: 'points', type: 'Int', nullable: false, isPrimaryKey: false, isForeignKey: false },
    { name: 'nationality', type: 'String', nullable: true, isPrimaryKey: false, isForeignKey: false },
    // FK field — String type but should be excluded
    { name: 'constructorId', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: true, relatedModel: 'Constructor' },
    // Relation field
    { name: 'constructor', type: 'relation', nullable: false, isPrimaryKey: false, isForeignKey: false, relatedModel: 'Constructor' },
    { name: 'wins', type: 'Int', nullable: false, isPrimaryKey: false, isForeignKey: false },
    { name: 'isActive', type: 'Boolean', nullable: false, isPrimaryKey: false, isForeignKey: false },
  ];

  it('returns only String-type non-FK columns', () => {
    const names = getStringColumnNames(cols);
    // id is a String PK — included (not FK)
    // firstName, lastName, nationality — included
    // constructorId — excluded (isForeignKey: true)
    // constructor — excluded (type: 'relation', not 'String')
    // points, wins — excluded (Int)
    // isActive — excluded (Boolean)
    expect(names).toEqual(['id', 'firstName', 'lastName', 'nationality']);
  });

  it('returns empty array when no string columns', () => {
    const noStrings: ColumnMeta[] = [
      { name: 'points', type: 'Int', nullable: false, isPrimaryKey: false, isForeignKey: false },
      { name: 'active', type: 'Boolean', nullable: false, isPrimaryKey: false, isForeignKey: false },
    ];
    expect(getStringColumnNames(noStrings)).toEqual([]);
  });

  it('excludes FK string columns from search', () => {
    const withFk: ColumnMeta[] = [
      { name: 'driverId', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: true, relatedModel: 'Driver' },
      { name: 'name', type: 'String', nullable: false, isPrimaryKey: false, isForeignKey: false },
    ];
    expect(getStringColumnNames(withFk)).toEqual(['name']);
  });
});

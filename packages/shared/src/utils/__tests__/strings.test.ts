import { describe, it, expect } from 'vitest';
import { slugify, pluralize, truncate, mask } from '../strings';

describe('slugify', () => {
  it('converts a simple string to a lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('replaces underscores with hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
  });

  it('handles an empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('Phase 0 Foundation')).toBe('phase-0-foundation');
  });
});

describe('pluralize', () => {
  it('returns the singular form for count of 1', () => {
    expect(pluralize(1, 'user')).toBe('user');
  });

  it('returns the default plural (singular + s) for count of 0', () => {
    expect(pluralize(0, 'user')).toBe('users');
  });

  it('returns the default plural for count > 1', () => {
    expect(pluralize(5, 'user')).toBe('users');
  });

  it('uses a custom plural when provided', () => {
    expect(pluralize(2, 'person', 'people')).toBe('people');
  });

  it('returns singular for count of 1 with custom plural', () => {
    expect(pluralize(1, 'person', 'people')).toBe('person');
  });
});

describe('truncate', () => {
  it('returns the original string when it is shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns the original string when it equals maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and appends ellipsis when string exceeds maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('handles maxLength of 3 (only ellipsis)', () => {
    expect(truncate('hello', 3)).toBe('...');
  });

  it('handles an empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('mask', () => {
  it('masks the middle of a string showing default 4 chars on each side', () => {
    const result = mask('sk_live_abcdef1234');
    expect(result).toMatch(/^sk_l.*1234$/);
    // middle should be replaced with bullet characters
    expect(result).toContain('•');
  });

  it('returns the original string when it is too short to mask', () => {
    expect(mask('abcd', 4, 4)).toBe('abcd');
  });

  it('caps the masking dots at 8', () => {
    const longString = 'start_' + 'x'.repeat(20) + '_end123';
    const result = mask(longString, 6, 7);
    const dots = result.match(/•+/)?.[0] ?? '';
    expect(dots.length).toBeLessThanOrEqual(8);
  });

  it('uses custom visibleStart and visibleEnd', () => {
    const result = mask('hello_world_test', 2, 2);
    expect(result.startsWith('he')).toBe(true);
    expect(result.endsWith('st')).toBe(true);
  });

  it('handles a string exactly at the visibility threshold', () => {
    // visibleStart=4, visibleEnd=4, string length=8 → no masking
    expect(mask('12345678', 4, 4)).toBe('12345678');
  });
});

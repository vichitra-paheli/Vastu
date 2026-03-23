/**
 * builtins.test.ts — unit tests for built-in formatter registration.
 *
 * Verifies that all 10 built-in formatters are registered by builtins.ts,
 * and that registerBuiltinFormatters is safe to call multiple times.
 *
 * Implements VASTU-2A-205b.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { clearFormatterRegistry, getAllFormatters, hasFormatter } from '../registry';
import { BUILTIN_FORMATTERS, registerBuiltinFormatters } from '../builtins';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearFormatterRegistry();
  registerBuiltinFormatters();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

const EXPECTED_BUILTIN_IDS = [
  'text',
  'number',
  'currency',
  'date',
  'relativeDate',
  'badge',
  'avatar',
  'boolean',
  'link',
  'monospace',
];

describe('registerBuiltinFormatters', () => {
  it('registers all 10 built-in formatters', () => {
    expect(getAllFormatters()).toHaveLength(10);
  });

  it('registers each expected built-in formatter ID', () => {
    for (const id of EXPECTED_BUILTIN_IDS) {
      expect(hasFormatter(id), `Built-in "${id}" should be registered`).toBe(true);
    }
  });

  it('is idempotent — safe to call multiple times without throwing', () => {
    expect(() => registerBuiltinFormatters()).not.toThrow();
    expect(() => registerBuiltinFormatters()).not.toThrow();
    // Should still have exactly 10 formatters
    expect(getAllFormatters()).toHaveLength(10);
  });
});

describe('BUILTIN_FORMATTERS', () => {
  it('contains exactly 10 entries', () => {
    expect(BUILTIN_FORMATTERS).toHaveLength(10);
  });

  it('each built-in has a render function', () => {
    for (const def of BUILTIN_FORMATTERS) {
      expect(typeof def.render).toBe('function');
    }
  });

  it('each built-in has an id and meta', () => {
    for (const def of BUILTIN_FORMATTERS) {
      expect(typeof def.id).toBe('string');
      expect(def.id.length).toBeGreaterThan(0);
      expect(def.meta).toBeDefined();
      expect(typeof def.meta.label).toBe('string');
    }
  });
});

describe('text formatter', () => {
  it('renders a string value', () => {
    const formatter = getAllFormatters().find((f) => f.id === 'text')!;
    const result = formatter.render({ value: 'hello', row: {} });
    // render returns a React element — check it's truthy
    expect(result).toBeTruthy();
  });

  it('export returns the string value', () => {
    const formatter = getAllFormatters().find((f) => f.id === 'text')!;
    expect(formatter.export!({ value: 'hello', row: {} })).toBe('hello');
    expect(formatter.export!({ value: null, row: {} })).toBe('');
  });
});

describe('number formatter', () => {
  it('export returns numeric string', () => {
    const formatter = getAllFormatters().find((f) => f.id === 'number')!;
    expect(formatter.export!({ value: 42, row: {} })).toBe('42');
    expect(formatter.export!({ value: null, row: {} })).toBe('');
  });

  it('sort puts numbers in ascending order', () => {
    const formatter = getAllFormatters().find((f) => f.id === 'number')!;
    expect(formatter.sort!({ aValue: 1, bValue: 2 })).toBeLessThan(0);
    expect(formatter.sort!({ aValue: 2, bValue: 1 })).toBeGreaterThan(0);
    expect(formatter.sort!({ aValue: 5, bValue: 5 })).toBe(0);
  });
});

describe('boolean formatter', () => {
  it('export returns "true"/"false"', () => {
    const formatter = getAllFormatters().find((f) => f.id === 'boolean')!;
    expect(formatter.export!({ value: true, row: {} })).toBe('true');
    expect(formatter.export!({ value: false, row: {} })).toBe('false');
    expect(formatter.export!({ value: null, row: {} })).toBe('');
  });
});

describe('date formatter', () => {
  it('sort handles chronological ordering', () => {
    const formatter = getAllFormatters().find((f) => f.id === 'date')!;
    const a = '2024-01-01';
    const b = '2024-06-01';
    expect(formatter.sort!({ aValue: a, bValue: b })).toBeLessThan(0);
    expect(formatter.sort!({ aValue: b, bValue: a })).toBeGreaterThan(0);
  });

  it('export returns ISO date string', () => {
    const formatter = getAllFormatters().find((f) => f.id === 'date')!;
    expect(formatter.export!({ value: '2024-03-15T12:00:00Z', row: {} })).toBe('2024-03-15');
    expect(formatter.export!({ value: null, row: {} })).toBe('');
  });
});

/**
 * registry.test.ts — unit tests for FormatterRegistry.
 *
 * Tests: register, get, getAll, fallback, duplicate handling, unregister, clear.
 * Implements VASTU-2A-205f.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import type { FormatterDefinition } from '../types';
import {
  registerFormatter,
  getFormatter,
  getAllFormatters,
  hasFormatter,
  unregisterFormatter,
  clearFormatterRegistry,
} from '../registry';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFormatter(id: string, label = id): FormatterDefinition {
  return {
    id,
    meta: { label, group: 'test' },
    render({ value }) {
      return React.createElement('span', null, String(value ?? ''));
    },
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearFormatterRegistry();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerFormatter', () => {
  it('registers a new formatter without error', () => {
    const def = makeFormatter('myType');
    expect(() => registerFormatter(def)).not.toThrow();
  });

  it('throws when registering the same ID twice', () => {
    const def = makeFormatter('dupe');
    registerFormatter(def);
    expect(() => registerFormatter(makeFormatter('dupe'))).toThrow(
      '[formatterRegistry] Formatter "dupe" is already registered.',
    );
  });

  it('allows different formatters with different IDs', () => {
    registerFormatter(makeFormatter('alpha'));
    registerFormatter(makeFormatter('beta'));
    expect(hasFormatter('alpha')).toBe(true);
    expect(hasFormatter('beta')).toBe(true);
  });
});

describe('getFormatter', () => {
  it('returns the registered formatter for a known ID', () => {
    const def = makeFormatter('known');
    registerFormatter(def);
    expect(getFormatter('known')).toBe(def);
  });

  it('returns undefined for an unknown ID (fallback case)', () => {
    expect(getFormatter('does-not-exist')).toBeUndefined();
  });

  it('returns undefined after unregistering', () => {
    registerFormatter(makeFormatter('temp'));
    unregisterFormatter('temp');
    expect(getFormatter('temp')).toBeUndefined();
  });
});

describe('getAllFormatters', () => {
  it('returns an empty array when registry is empty', () => {
    expect(getAllFormatters()).toEqual([]);
  });

  it('returns all registered formatters', () => {
    registerFormatter(makeFormatter('z'));
    registerFormatter(makeFormatter('a'));
    registerFormatter(makeFormatter('m'));
    const all = getAllFormatters();
    expect(all).toHaveLength(3);
    // Should be sorted alphabetically by ID
    expect(all.map((f) => f.id)).toEqual(['a', 'm', 'z']);
  });

  it('returns formatters sorted by ID', () => {
    registerFormatter(makeFormatter('zebra'));
    registerFormatter(makeFormatter('apple'));
    const ids = getAllFormatters().map((f) => f.id);
    expect(ids).toEqual(['apple', 'zebra']);
  });
});

describe('hasFormatter', () => {
  it('returns false for unregistered ID', () => {
    expect(hasFormatter('nope')).toBe(false);
  });

  it('returns true for registered ID', () => {
    registerFormatter(makeFormatter('yes'));
    expect(hasFormatter('yes')).toBe(true);
  });
});

describe('unregisterFormatter', () => {
  it('removes the formatter from the registry', () => {
    registerFormatter(makeFormatter('remove-me'));
    unregisterFormatter('remove-me');
    expect(getFormatter('remove-me')).toBeUndefined();
    expect(hasFormatter('remove-me')).toBe(false);
  });

  it('does not throw when unregistering a non-existent ID', () => {
    expect(() => unregisterFormatter('ghost')).not.toThrow();
  });

  it('allows re-registration after unregistering', () => {
    registerFormatter(makeFormatter('reuse'));
    unregisterFormatter('reuse');
    expect(() => registerFormatter(makeFormatter('reuse'))).not.toThrow();
    expect(hasFormatter('reuse')).toBe(true);
  });
});

describe('clearFormatterRegistry', () => {
  it('removes all formatters', () => {
    registerFormatter(makeFormatter('one'));
    registerFormatter(makeFormatter('two'));
    clearFormatterRegistry();
    expect(getAllFormatters()).toHaveLength(0);
  });

  it('allows re-registration after clear', () => {
    registerFormatter(makeFormatter('first'));
    clearFormatterRegistry();
    expect(() => registerFormatter(makeFormatter('first'))).not.toThrow();
  });
});

describe('optional sort, export, filter functions', () => {
  it('stores optional helpers on the definition', () => {
    const def: FormatterDefinition = {
      id: 'withHelpers',
      meta: { label: 'With Helpers' },
      render({ value }) {
        return React.createElement('span', null, String(value));
      },
      sort({ aValue, bValue }) {
        return String(aValue).localeCompare(String(bValue));
      },
      export({ value }) {
        return `EXPORTED:${String(value)}`;
      },
      filter({ value }) {
        return String(value).toLowerCase();
      },
    };
    registerFormatter(def);
    const retrieved = getFormatter('withHelpers');
    expect(retrieved?.sort).toBeDefined();
    expect(retrieved?.export).toBeDefined();
    expect(retrieved?.filter).toBeDefined();
    expect(retrieved?.sort?.({ aValue: 'b', bValue: 'a' })).toBeGreaterThan(0);
    expect(retrieved?.export?.({ value: 'hello', row: {} })).toBe('EXPORTED:hello');
    expect(retrieved?.filter?.({ value: 'UPPER' })).toBe('upper');
  });
});

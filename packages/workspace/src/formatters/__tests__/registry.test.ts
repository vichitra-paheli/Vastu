/**
 * registry.test.ts — unit tests for the FormatterRegistry.
 *
 * Tests register/get/getAll/has/unregister/clear functions.
 * Verifies duplicate registration behavior and unknown ID handling.
 *
 * Implements VASTU-2A-205.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerFormatter,
  getFormatter,
  getAllFormatters,
  hasFormatter,
  unregisterFormatter,
  clearFormatterRegistry,
} from '../registry';
import type { FormatterDefinition } from '../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeFormatter(id: string): FormatterDefinition {
  return {
    id,
    meta: { label: id, group: 'test' },
    render: ({ value }) => String(value ?? ''),
    sort: ({ aValue, bValue }) => String(aValue ?? '').localeCompare(String(bValue ?? '')),
    export: ({ value }) => String(value ?? ''),
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearFormatterRegistry();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerFormatter', () => {
  it('registers a formatter and makes it retrievable', () => {
    const def = makeFormatter('test-formatter');
    registerFormatter(def);
    expect(getFormatter('test-formatter')).toBe(def);
  });

  it('throws when registering a duplicate ID', () => {
    registerFormatter(makeFormatter('dupe'));
    expect(() => registerFormatter(makeFormatter('dupe'))).toThrow(
      '[formatterRegistry] Formatter "dupe" is already registered',
    );
  });
});

describe('getFormatter', () => {
  it('returns undefined for an unregistered ID', () => {
    expect(getFormatter('does-not-exist')).toBeUndefined();
  });

  it('returns the registered definition', () => {
    const def = makeFormatter('alpha');
    registerFormatter(def);
    expect(getFormatter('alpha')).toBe(def);
  });
});

describe('hasFormatter', () => {
  it('returns false before registration', () => {
    expect(hasFormatter('beta')).toBe(false);
  });

  it('returns true after registration', () => {
    registerFormatter(makeFormatter('beta'));
    expect(hasFormatter('beta')).toBe(true);
  });

  it('returns false after unregistration', () => {
    registerFormatter(makeFormatter('gamma'));
    unregisterFormatter('gamma');
    expect(hasFormatter('gamma')).toBe(false);
  });
});

describe('getAllFormatters', () => {
  it('returns empty array when no formatters are registered', () => {
    expect(getAllFormatters()).toEqual([]);
  });

  it('returns all registered formatters sorted by ID', () => {
    registerFormatter(makeFormatter('zebra'));
    registerFormatter(makeFormatter('alpha'));
    registerFormatter(makeFormatter('mango'));
    const ids = getAllFormatters().map((f) => f.id);
    expect(ids).toEqual(['alpha', 'mango', 'zebra']);
  });
});

describe('unregisterFormatter', () => {
  it('removes a formatter from the registry', () => {
    registerFormatter(makeFormatter('temp'));
    unregisterFormatter('temp');
    expect(getFormatter('temp')).toBeUndefined();
  });

  it('silently ignores unregistering a non-existent ID', () => {
    expect(() => unregisterFormatter('ghost')).not.toThrow();
  });
});

describe('clearFormatterRegistry', () => {
  it('removes all formatters', () => {
    registerFormatter(makeFormatter('one'));
    registerFormatter(makeFormatter('two'));
    clearFormatterRegistry();
    expect(getAllFormatters()).toEqual([]);
  });
});

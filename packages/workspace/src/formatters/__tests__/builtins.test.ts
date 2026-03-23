/**
 * builtins.test.ts — unit tests for built-in formatter definitions.
 *
 * Tests that each built-in formatter:
 *   - Renders the expected React node for common inputs
 *   - Handles null / undefined gracefully
 *   - Sorts correctly
 *   - Exports a plain string
 *   - Has correct meta (label, group)
 *
 * Implements VASTU-2A-205f.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BUILTIN_FORMATTERS,
  registerBuiltinFormatters,
} from '../builtins';
import {
  clearFormatterRegistry,
  getFormatter,
} from '../registry';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearFormatterRegistry();
  // Reset internal "registered" flag by re-importing via registerBuiltinFormatters
  // We need to call it directly since the module-level flag guards against double-registration.
  // clearFormatterRegistry() resets the Map but not the `registered` flag — we call
  // registerBuiltinFormatters which re-registers them after clear.
  registerBuiltinFormatters();
});

afterEach(() => {
  clearFormatterRegistry();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderNode(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  return renderToStaticMarkup(node as React.ReactElement);
}

function getBuiltin(id: string) {
  const formatter = getFormatter(id);
  if (!formatter) throw new Error(`Built-in formatter "${id}" not registered`);
  return formatter;
}

// ─── All built-ins are registered ────────────────────────────────────────────

describe('BUILTIN_FORMATTERS list', () => {
  it('contains 10 built-in definitions', () => {
    expect(BUILTIN_FORMATTERS).toHaveLength(10);
  });

  it('includes all expected IDs', () => {
    const ids = BUILTIN_FORMATTERS.map((f) => f.id);
    expect(ids).toContain('text');
    expect(ids).toContain('number');
    expect(ids).toContain('currency');
    expect(ids).toContain('date');
    expect(ids).toContain('relativeDate');
    expect(ids).toContain('badge');
    expect(ids).toContain('avatar');
    expect(ids).toContain('boolean');
    expect(ids).toContain('link');
    expect(ids).toContain('monospace');
  });

  it('registers all built-ins in the registry', () => {
    for (const def of BUILTIN_FORMATTERS) {
      expect(getFormatter(def.id)).toBeDefined();
    }
  });
});

// ─── text ─────────────────────────────────────────────────────────────────────

describe('text formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('text');
    expect(f.meta.label).toBe('Text');
    expect(f.meta.group).toBe('text');
  });

  it('renders a string value', () => {
    const f = getBuiltin('text');
    const html = renderNode(f.render({ value: 'hello', row: {} }));
    expect(html).toContain('hello');
  });

  it('renders empty string for null', () => {
    const f = getBuiltin('text');
    const html = renderNode(f.render({ value: null, row: {} }));
    expect(html).not.toContain('null');
  });

  it('sorts alphabetically', () => {
    const f = getBuiltin('text');
    expect(f.sort?.({ aValue: 'apple', bValue: 'banana' })).toBeLessThan(0);
    expect(f.sort?.({ aValue: 'zebra', bValue: 'ant' })).toBeGreaterThan(0);
    expect(f.sort?.({ aValue: 'same', bValue: 'same' })).toBe(0);
  });

  it('exports as plain string', () => {
    const f = getBuiltin('text');
    expect(f.export?.({ value: 'hello world', row: {} })).toBe('hello world');
    expect(f.export?.({ value: null, row: {} })).toBe('');
  });
});

// ─── number ───────────────────────────────────────────────────────────────────

describe('number formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('number');
    expect(f.meta.label).toBe('Number');
    expect(f.meta.group).toBe('numbers');
  });

  it('renders a numeric value', () => {
    const f = getBuiltin('number');
    const html = renderNode(f.render({ value: 1234.5, row: {} }));
    // Locale-formatted — check that the number appears in some form
    expect(html).toMatch(/1[,.]?234/);
  });

  it('renders empty for null', () => {
    const f = getBuiltin('number');
    const html = renderNode(f.render({ value: null, row: {} }));
    expect(html).not.toContain('null');
  });

  it('sorts numerically', () => {
    const f = getBuiltin('number');
    expect(f.sort?.({ aValue: 5, bValue: 10 })).toBeLessThan(0);
    expect(f.sort?.({ aValue: 100, bValue: 1 })).toBeGreaterThan(0);
    expect(f.sort?.({ aValue: 42, bValue: 42 })).toBe(0);
  });

  it('sorts nulls last (nulls become -Infinity)', () => {
    const f = getBuiltin('number');
    // null sorts below any real number
    expect(f.sort?.({ aValue: null, bValue: 0 })).toBeLessThan(0);
  });

  it('exports as raw number string', () => {
    const f = getBuiltin('number');
    expect(f.export?.({ value: 42, row: {} })).toBe('42');
    expect(f.export?.({ value: null, row: {} })).toBe('');
  });

  it('filters to numeric value', () => {
    const f = getBuiltin('number');
    expect(f.filter?.({ value: '99' })).toBe(99);
    expect(f.filter?.({ value: null })).toBeNull();
  });
});

// ─── currency ─────────────────────────────────────────────────────────────────

describe('currency formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('currency');
    expect(f.meta.label).toBe('Currency');
    expect(f.meta.group).toBe('numbers');
  });

  it('renders with currency symbol', () => {
    const f = getBuiltin('currency');
    const html = renderNode(f.render({ value: 1234.56, row: {} }));
    // Should contain a dollar sign and the number
    expect(html).toMatch(/\$|USD/);
    expect(html).toMatch(/1[,.]?234/);
  });

  it('exports as fixed-precision string', () => {
    const f = getBuiltin('currency');
    expect(f.export?.({ value: 99.9, row: {} })).toBe('99.90');
    expect(f.export?.({ value: null, row: {} })).toBe('');
  });

  it('sorts numerically', () => {
    const f = getBuiltin('currency');
    expect(f.sort?.({ aValue: 10, bValue: 20 })).toBeLessThan(0);
  });
});

// ─── date ─────────────────────────────────────────────────────────────────────

describe('date formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('date');
    expect(f.meta.label).toBe('Date');
    expect(f.meta.group).toBe('dates');
  });

  it('renders a formatted date', () => {
    const f = getBuiltin('date');
    const html = renderNode(f.render({ value: '2024-01-15', row: {} }));
    // Should contain the year and some representation of Jan 15
    expect(html).toContain('2024');
    expect(html).toMatch(/Jan|15/);
  });

  it('renders empty for null', () => {
    const f = getBuiltin('date');
    const html = renderNode(f.render({ value: null, row: {} }));
    expect(html).not.toContain('null');
  });

  it('returns original string for invalid date', () => {
    const f = getBuiltin('date');
    const html = renderNode(f.render({ value: 'not-a-date', row: {} }));
    expect(html).toContain('not-a-date');
  });

  it('sorts chronologically', () => {
    const f = getBuiltin('date');
    expect(f.sort?.({ aValue: '2020-01-01', bValue: '2024-01-01' })).toBeLessThan(0);
    expect(f.sort?.({ aValue: '2024-01-01', bValue: '2020-01-01' })).toBeGreaterThan(0);
  });

  it('exports as ISO date string', () => {
    const f = getBuiltin('date');
    expect(f.export?.({ value: '2024-06-15T12:00:00Z', row: {} })).toBe('2024-06-15');
    expect(f.export?.({ value: null, row: {} })).toBe('');
  });
});

// ─── relativeDate ─────────────────────────────────────────────────────────────

describe('relativeDate formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('relativeDate');
    expect(f.meta.label).toBe('Relative date');
    expect(f.meta.group).toBe('dates');
  });

  it('renders "just now" for very recent timestamps', () => {
    const f = getBuiltin('relativeDate');
    const now = new Date().toISOString();
    const html = renderNode(f.render({ value: now, row: {} }));
    expect(html).toContain('just now');
  });

  it('renders "ago" for past dates', () => {
    const f = getBuiltin('relativeDate');
    const pastDate = new Date(Date.now() - 3 * 86_400_000).toISOString(); // 3 days ago
    const html = renderNode(f.render({ value: pastDate, row: {} }));
    expect(html).toContain('ago');
  });

  it('renders "in" for future dates', () => {
    const f = getBuiltin('relativeDate');
    const futureDate = new Date(Date.now() + 5 * 86_400_000).toISOString(); // 5 days from now
    const html = renderNode(f.render({ value: futureDate, row: {} }));
    expect(html).toContain('in');
  });

  it('renders empty for null value', () => {
    const f = getBuiltin('relativeDate');
    const html = renderNode(f.render({ value: null, row: {} }));
    expect(html).not.toContain('null');
  });

  it('exports as ISO date', () => {
    const f = getBuiltin('relativeDate');
    expect(f.export?.({ value: '2024-03-22T00:00:00Z', row: {} })).toBe('2024-03-22');
  });
});

// ─── badge ────────────────────────────────────────────────────────────────────

describe('badge formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('badge');
    expect(f.meta.label).toBe('Badge');
    expect(f.meta.group).toBe('visual');
  });

  it('renders a span with the value text', () => {
    const f = getBuiltin('badge');
    const html = renderNode(f.render({ value: 'Active', row: {} }));
    expect(html).toContain('Active');
    expect(html).toContain('vastu-cell-badge');
  });

  it('returns null for empty value', () => {
    const f = getBuiltin('badge');
    expect(f.render({ value: '', row: {} })).toBeNull();
    expect(f.render({ value: null, row: {} })).toBeNull();
  });

  it('exports as plain string', () => {
    const f = getBuiltin('badge');
    expect(f.export?.({ value: 'Active', row: {} })).toBe('Active');
  });
});

// ─── avatar ───────────────────────────────────────────────────────────────────

describe('avatar formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('avatar');
    expect(f.meta.label).toBe('Avatar');
    expect(f.meta.group).toBe('visual');
  });

  it('renders initials from a full name', () => {
    const f = getBuiltin('avatar');
    const html = renderNode(f.render({ value: 'John Doe', row: {} }));
    expect(html).toContain('JD');
    expect(html).toContain('John Doe');
  });

  it('renders two-char initials for a single word', () => {
    const f = getBuiltin('avatar');
    const html = renderNode(f.render({ value: 'Alice', row: {} }));
    expect(html).toContain('AL');
  });

  it('renders an img when avatarUrl is present in row', () => {
    const f = getBuiltin('avatar');
    const html = renderNode(
      f.render({ value: 'Jane Smith', row: { avatarUrl: 'https://example.com/avatar.png' } }),
    );
    expect(html).toContain('<img');
    expect(html).toContain('https://example.com/avatar.png');
  });

  it('exports as plain string', () => {
    const f = getBuiltin('avatar');
    expect(f.export?.({ value: 'Jane Smith', row: {} })).toBe('Jane Smith');
  });
});

// ─── boolean ──────────────────────────────────────────────────────────────────

describe('boolean formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('boolean');
    expect(f.meta.label).toBe('Boolean');
    expect(f.meta.group).toBe('text');
  });

  it('renders checkmark for truthy values', () => {
    const f = getBuiltin('boolean');
    for (const truthy of [true, 'true', 1, '1']) {
      const html = renderNode(f.render({ value: truthy, row: {} }));
      expect(html).toContain('vastu-cell-bool-true');
    }
  });

  it('renders cross for falsy values', () => {
    const f = getBuiltin('boolean');
    for (const falsy of [false, 'false', 0, '0']) {
      const html = renderNode(f.render({ value: falsy, row: {} }));
      expect(html).toContain('vastu-cell-bool-false');
    }
  });

  it('returns null for null/undefined', () => {
    const f = getBuiltin('boolean');
    expect(f.render({ value: null, row: {} })).toBeNull();
    expect(f.render({ value: undefined, row: {} })).toBeNull();
  });

  it('sorts true before false', () => {
    const f = getBuiltin('boolean');
    expect(f.sort?.({ aValue: true, bValue: false })).toBeGreaterThan(0);
    expect(f.sort?.({ aValue: false, bValue: true })).toBeLessThan(0);
    expect(f.sort?.({ aValue: true, bValue: true })).toBe(0);
  });

  it('exports as "true" or "false"', () => {
    const f = getBuiltin('boolean');
    expect(f.export?.({ value: true, row: {} })).toBe('true');
    expect(f.export?.({ value: false, row: {} })).toBe('false');
    expect(f.export?.({ value: null, row: {} })).toBe('');
  });

  it('filters to boolean value', () => {
    const f = getBuiltin('boolean');
    expect(f.filter?.({ value: 'true' })).toBe(true);
    expect(f.filter?.({ value: 0 })).toBe(false);
    expect(f.filter?.({ value: null })).toBeNull();
  });
});

// ─── link ─────────────────────────────────────────────────────────────────────

describe('link formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('link');
    expect(f.meta.label).toBe('Link');
    expect(f.meta.group).toBe('text');
  });

  it('renders an anchor tag with the href', () => {
    const f = getBuiltin('link');
    const html = renderNode(
      f.render({ value: 'https://example.com', row: {} }),
    );
    expect(html).toContain('<a');
    expect(html).toContain('href="https://example.com"');
  });

  it('uses label from row.name when available', () => {
    const f = getBuiltin('link');
    const html = renderNode(
      f.render({ value: 'https://example.com', row: { name: 'Visit Site' } }),
    );
    expect(html).toContain('Visit Site');
  });

  it('returns null for empty href', () => {
    const f = getBuiltin('link');
    expect(f.render({ value: '', row: {} })).toBeNull();
    expect(f.render({ value: null, row: {} })).toBeNull();
  });

  it('exports the URL as plain string', () => {
    const f = getBuiltin('link');
    expect(f.export?.({ value: 'https://example.com', row: {} })).toBe('https://example.com');
  });
});

// ─── monospace ────────────────────────────────────────────────────────────────

describe('monospace formatter', () => {
  it('has correct meta', () => {
    const f = getBuiltin('monospace');
    expect(f.meta.label).toBe('Monospace');
    expect(f.meta.group).toBe('text');
  });

  it('renders a <code> element', () => {
    const f = getBuiltin('monospace');
    const html = renderNode(f.render({ value: 'abc-123', row: {} }));
    expect(html).toContain('<code');
    expect(html).toContain('abc-123');
    expect(html).toContain('vastu-cell-monospace');
  });

  it('renders empty for null', () => {
    const f = getBuiltin('monospace');
    const html = renderNode(f.render({ value: null, row: {} }));
    expect(html).not.toContain('null');
  });

  it('exports as plain string', () => {
    const f = getBuiltin('monospace');
    expect(f.export?.({ value: 'abc-123', row: {} })).toBe('abc-123');
  });

  it('sorts alphabetically', () => {
    const f = getBuiltin('monospace');
    expect(f.sort?.({ aValue: 'abc', bValue: 'xyz' })).toBeLessThan(0);
  });
});

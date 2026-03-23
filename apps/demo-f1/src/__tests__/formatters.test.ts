/**
 * formatters.test.ts — unit tests for F1 display formatters.
 *
 * Tests each formatter's render, sort, and export functions.
 * Also tests edge cases: null values, zero, negatives, unknown enums.
 *
 * Implements VASTU-2A-222c.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type React from 'react';
import {
  clearFormatterRegistry,
  hasFormatter,
  getFormatter,
  registerBuiltinFormatters,
} from '@vastu/workspace';

// Import the formatters module — triggers side-effect registration.
// We re-import after clearing in beforeEach via the exported helpers.
import {
  F1_FORMATTERS,
  registerF1Formatters,
  msToLapTime,
  msToPitDuration,
  countryCodeToFlag,
  NATIONALITY_TO_CODE,
} from '../formatters';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset registry state before each test.
  clearFormatterRegistry();
  // Re-register built-ins (so formatters that might call built-in logic still work)
  registerBuiltinFormatters();
  // Re-register F1 formatters
  registerF1Formatters();
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const EMPTY_ROW: Record<string, unknown> = {};

/** Render a formatter and return the rendered React element. */
function renderFormatter(id: string, value: unknown, row = EMPTY_ROW): React.ReactNode {
  const formatter = getFormatter(id);
  expect(formatter, `Formatter "${id}" should be registered`).toBeDefined();
  return formatter!.render({ value, row });
}

/** Sort two values with the named formatter. */
function sortFormatter(id: string, aValue: unknown, bValue: unknown): number {
  const formatter = getFormatter(id);
  expect(formatter?.sort, `Formatter "${id}" should have a sort function`).toBeDefined();
  return formatter!.sort!({ aValue, bValue });
}

/** Export a value with the named formatter. */
function exportFormatter(id: string, value: unknown, row = EMPTY_ROW): string {
  const formatter = getFormatter(id);
  expect(formatter?.export, `Formatter "${id}" should have an export function`).toBeDefined();
  return formatter!.export!({ value, row });
}

// ─── Registration tests ───────────────────────────────────────────────────────

describe('F1 formatter registration', () => {
  it('registers all 8 F1 formatters', () => {
    const expectedIds = [
      'lap-time',
      'pit-duration',
      'tire-compound',
      'position-change',
      'race-status',
      'nationality-flag',
      'circuit-type',
      'weather',
    ];
    for (const id of expectedIds) {
      expect(hasFormatter(id), `Formatter "${id}" should be registered`).toBe(true);
    }
  });

  it('F1_FORMATTERS has exactly 8 entries', () => {
    expect(F1_FORMATTERS).toHaveLength(8);
  });

  it('registerF1Formatters is idempotent — does not throw on second call', () => {
    expect(() => registerF1Formatters()).not.toThrow();
  });
});

// ─── msToLapTime helper ───────────────────────────────────────────────────────

describe('msToLapTime helper', () => {
  it('converts standard lap time', () => {
    // 1 min 23 seconds 456 ms = 83456 ms
    expect(msToLapTime(83_456)).toBe('1:23.456');
  });

  it('pads seconds and milliseconds with leading zeros', () => {
    // 1 min 3 sec 5 ms
    expect(msToLapTime(63_005)).toBe('1:03.005');
  });

  it('handles sub-minute times', () => {
    // 59 sec 999 ms
    expect(msToLapTime(59_999)).toBe('0:59.999');
  });

  it('returns "---" for null', () => {
    expect(msToLapTime(null)).toBe('---');
  });

  it('returns "---" for undefined', () => {
    expect(msToLapTime(undefined)).toBe('---');
  });

  it('returns "---" for zero', () => {
    expect(msToLapTime(0)).toBe('---');
  });

  it('returns "---" for negative values', () => {
    expect(msToLapTime(-1000)).toBe('---');
  });

  it('returns "---" for empty string', () => {
    expect(msToLapTime('')).toBe('---');
  });
});

// ─── msToPitDuration helper ───────────────────────────────────────────────────

describe('msToPitDuration helper', () => {
  it('converts to seconds with 1 decimal', () => {
    expect(msToPitDuration(2400)).toBe('2.4s');
  });

  it('rounds to 1 decimal', () => {
    expect(msToPitDuration(2450)).toBe('2.5s');
  });

  it('handles 10+ second stops', () => {
    expect(msToPitDuration(12_300)).toBe('12.3s');
  });

  it('returns "---" for null', () => {
    expect(msToPitDuration(null)).toBe('---');
  });

  it('returns "---" for zero', () => {
    expect(msToPitDuration(0)).toBe('---');
  });

  it('returns "---" for negative', () => {
    expect(msToPitDuration(-500)).toBe('---');
  });
});

// ─── countryCodeToFlag helper ─────────────────────────────────────────────────

describe('countryCodeToFlag helper', () => {
  it('converts NL to Dutch flag', () => {
    expect(countryCodeToFlag('NL')).toBe('🇳🇱');
  });

  it('converts GB to UK flag', () => {
    expect(countryCodeToFlag('GB')).toBe('🇬🇧');
  });

  it('converts lowercase codes', () => {
    expect(countryCodeToFlag('nl')).toBe('🇳🇱');
  });

  it('returns empty string for empty input', () => {
    expect(countryCodeToFlag('')).toBe('');
  });

  it('returns empty string for non-2-char code', () => {
    expect(countryCodeToFlag('GBR')).toBe('');
    expect(countryCodeToFlag('G')).toBe('');
  });

  it('generates a flag emoji for any 2-letter A-Z code', () => {
    // ZZ is technically valid as regional indicators — the function
    // generates an emoji even for codes without a real country.
    const result = countryCodeToFlag('ZZ');
    // Each regional indicator code point requires 2 UTF-16 code units (surrogate pair),
    // so two indicator code points = string length of 4.
    expect(result.codePointAt(0)).toBe(0x1f1ff); // 🇿 = U+1F1FF (Z regional indicator)
    expect(result).not.toBe(''); // Confirms a non-empty result
  });
});

// ─── lap-time formatter ───────────────────────────────────────────────────────

describe('lap-time formatter', () => {
  describe('render', () => {
    it('renders a valid lap time', () => {
      const result = renderFormatter('lap-time', 83_456);
      expect(result).toBeTruthy();
      const el = result as React.ReactElement;
      expect(el.props.children).toBe('1:23.456');
    });

    it('renders "---" for null value in tertiary color', () => {
      const result = renderFormatter('lap-time', null) as React.ReactElement;
      expect(result.props.children).toBe('---');
      expect(result.props.style.color).toBe('var(--v-text-tertiary)');
    });

    it('renders "---" for undefined', () => {
      const result = renderFormatter('lap-time', undefined) as React.ReactElement;
      expect(result.props.children).toBe('---');
    });

    it('renders "---" for zero', () => {
      const result = renderFormatter('lap-time', 0) as React.ReactElement;
      expect(result.props.children).toBe('---');
    });
  });

  describe('sort', () => {
    it('sorts numerically (ascending)', () => {
      expect(sortFormatter('lap-time', 80_000, 83_000)).toBeLessThan(0);
      expect(sortFormatter('lap-time', 83_000, 80_000)).toBeGreaterThan(0);
      expect(sortFormatter('lap-time', 80_000, 80_000)).toBe(0);
    });

    it('places null values last', () => {
      expect(sortFormatter('lap-time', null, 80_000)).toBeGreaterThan(0);
      expect(sortFormatter('lap-time', 80_000, null)).toBeLessThan(0);
    });
  });

  describe('export', () => {
    it('exports as lap time string', () => {
      expect(exportFormatter('lap-time', 83_456)).toBe('1:23.456');
    });

    it('exports "---" for null', () => {
      expect(exportFormatter('lap-time', null)).toBe('---');
    });
  });
});

// ─── pit-duration formatter ───────────────────────────────────────────────────

describe('pit-duration formatter', () => {
  describe('render', () => {
    it('renders pit duration', () => {
      const result = renderFormatter('pit-duration', 2400) as React.ReactElement;
      expect(result.props.children).toBe('2.4s');
    });

    it('renders "---" for null', () => {
      const result = renderFormatter('pit-duration', null) as React.ReactElement;
      expect(result.props.children).toBe('---');
    });
  });

  describe('sort', () => {
    it('sorts numerically', () => {
      expect(sortFormatter('pit-duration', 2000, 3000)).toBeLessThan(0);
      expect(sortFormatter('pit-duration', 3000, 2000)).toBeGreaterThan(0);
    });

    it('places null last', () => {
      expect(sortFormatter('pit-duration', null, 2000)).toBeGreaterThan(0);
    });
  });

  describe('export', () => {
    it('exports as duration string', () => {
      expect(exportFormatter('pit-duration', 2400)).toBe('2.4s');
    });
  });
});

// ─── tire-compound formatter ──────────────────────────────────────────────────

describe('tire-compound formatter', () => {
  describe('render', () => {
    it('renders Soft with error (red) background', () => {
      const result = renderFormatter('tire-compound', 'Soft') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-status-error)');
      expect(result.props.children).toBe('Soft');
    });

    it('renders Medium with accent-tertiary background', () => {
      const result = renderFormatter('tire-compound', 'Medium') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-accent-tertiary)');
    });

    it('renders Hard with bg-tertiary background', () => {
      const result = renderFormatter('tire-compound', 'Hard') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-bg-tertiary)');
    });

    it('renders Intermediate with success (green) background', () => {
      const result = renderFormatter('tire-compound', 'Intermediate') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-status-success)');
    });

    it('renders Wet with accent-primary (blue) background', () => {
      const result = renderFormatter('tire-compound', 'Wet') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-accent-primary)');
    });

    it('renders unknown compound with neutral gray', () => {
      const result = renderFormatter('tire-compound', 'SuperSoft') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-bg-subtle)');
    });

    it('returns null for empty value', () => {
      expect(renderFormatter('tire-compound', null)).toBeNull();
      expect(renderFormatter('tire-compound', '')).toBeNull();
    });
  });

  describe('sort', () => {
    it('sorts alphabetically', () => {
      expect(sortFormatter('tire-compound', 'Hard', 'Soft')).toBeLessThan(0);
      expect(sortFormatter('tire-compound', 'Soft', 'Hard')).toBeGreaterThan(0);
    });
  });

  describe('export', () => {
    it('exports plain text', () => {
      expect(exportFormatter('tire-compound', 'Soft')).toBe('Soft');
    });

    it('exports empty string for null', () => {
      expect(exportFormatter('tire-compound', null)).toBe('');
    });
  });
});

// ─── position-change formatter ────────────────────────────────────────────────

describe('position-change formatter', () => {
  describe('render', () => {
    it('renders positive delta with green upward arrow', () => {
      const result = renderFormatter('position-change', 3) as React.ReactElement;
      expect(result.props.style.color).toBe('var(--v-status-success)');
      expect(result.props.children).toBe('▲3');
    });

    it('renders negative delta with red downward arrow', () => {
      const result = renderFormatter('position-change', -2) as React.ReactElement;
      expect(result.props.style.color).toBe('var(--v-status-error)');
      expect(result.props.children).toBe('▼2');
    });

    it('renders zero delta as gray dash', () => {
      const result = renderFormatter('position-change', 0) as React.ReactElement;
      expect(result.props.style.color).toBe('var(--v-text-tertiary)');
      expect(result.props.children).toBe('—');
    });

    it('renders null as gray dash', () => {
      const result = renderFormatter('position-change', null) as React.ReactElement;
      expect(result.props.children).toBe('—');
    });

    it('renders undefined as gray dash', () => {
      const result = renderFormatter('position-change', undefined) as React.ReactElement;
      expect(result.props.children).toBe('—');
    });
  });

  describe('sort', () => {
    it('sorts numerically', () => {
      expect(sortFormatter('position-change', -3, 3)).toBeLessThan(0);
      expect(sortFormatter('position-change', 3, -3)).toBeGreaterThan(0);
      expect(sortFormatter('position-change', 0, 0)).toBe(0);
    });
  });

  describe('export', () => {
    it('exports positive delta as "+N"', () => {
      expect(exportFormatter('position-change', 3)).toBe('+3');
    });

    it('exports negative delta as "-N"', () => {
      expect(exportFormatter('position-change', -2)).toBe('-2');
    });

    it('exports zero as "—"', () => {
      expect(exportFormatter('position-change', 0)).toBe('—');
    });

    it('exports null as "—"', () => {
      expect(exportFormatter('position-change', null)).toBe('—');
    });
  });
});

// ─── race-status formatter ────────────────────────────────────────────────────

describe('race-status formatter', () => {
  describe('render', () => {
    it('renders Finished with success (green) background', () => {
      const result = renderFormatter('race-status', 'Finished') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-status-success)');
      expect(result.props.children).toBe('Finished');
    });

    it('renders DNF with error (red) background', () => {
      const result = renderFormatter('race-status', 'DNF') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-status-error)');
    });

    it('renders DSQ with accent-tertiary (amber) background', () => {
      const result = renderFormatter('race-status', 'DSQ') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-accent-tertiary)');
    });

    it('renders DNS with transparent background and tertiary text', () => {
      const result = renderFormatter('race-status', 'DNS') as React.ReactElement;
      expect(result.props.style.color).toBe('var(--v-text-tertiary)');
    });

    it('is case-insensitive', () => {
      const result = renderFormatter('race-status', 'finished') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-status-success)');
    });

    it('renders null as null', () => {
      expect(renderFormatter('race-status', null)).toBeNull();
    });
  });

  describe('sort', () => {
    it('sorts alphabetically', () => {
      expect(sortFormatter('race-status', 'DNF', 'Finished')).toBeLessThan(0);
    });
  });

  describe('export', () => {
    it('exports plain text', () => {
      expect(exportFormatter('race-status', 'Finished')).toBe('Finished');
      expect(exportFormatter('race-status', 'DNF')).toBe('DNF');
    });

    it('exports empty string for null', () => {
      expect(exportFormatter('race-status', null)).toBe('');
    });
  });
});

// ─── nationality-flag formatter ───────────────────────────────────────────────

describe('nationality-flag formatter', () => {
  describe('render', () => {
    it('renders Dutch nationality with flag emoji and NL code', () => {
      const result = renderFormatter('nationality-flag', 'Dutch') as React.ReactElement;
      // The element has 2 children: flag span + text span
      const children = result.props.children as React.ReactElement[];
      const flagSpan = children[0];
      const textSpan = children[1];
      expect(flagSpan.props.children).toBe('🇳🇱');
      expect(textSpan.props.children).toBe('NL');
    });

    it('renders British nationality', () => {
      const result = renderFormatter('nationality-flag', 'British') as React.ReactElement;
      const children = result.props.children as React.ReactElement[];
      const textSpan = children[1];
      expect(textSpan.props.children).toBe('GB');
    });

    it('renders unknown nationality as plain text without flag', () => {
      const result = renderFormatter('nationality-flag', 'Martian') as React.ReactElement;
      const children = result.props.children as Array<React.ReactElement | null>;
      // Flag span should be null (no mapping)
      expect(children[0]).toBeNull();
      const textSpan = children[1]!;
      expect(textSpan.props.children).toBe('Martian');
    });

    it('returns null for empty nationality', () => {
      expect(renderFormatter('nationality-flag', null)).toBeNull();
      expect(renderFormatter('nationality-flag', '')).toBeNull();
    });
  });

  describe('sort', () => {
    it('sorts alphabetically by nationality name', () => {
      expect(sortFormatter('nationality-flag', 'British', 'Dutch')).toBeLessThan(0);
      expect(sortFormatter('nationality-flag', 'Dutch', 'British')).toBeGreaterThan(0);
    });
  });

  describe('export', () => {
    it('exports flag emoji + code for known nationality', () => {
      const exported = exportFormatter('nationality-flag', 'Dutch');
      expect(exported).toContain('🇳🇱');
      expect(exported).toContain('NL');
    });

    it('exports plain text for unknown nationality', () => {
      expect(exportFormatter('nationality-flag', 'Martian')).toBe('Martian');
    });

    it('exports empty string for null', () => {
      expect(exportFormatter('nationality-flag', null)).toBe('');
    });
  });

  describe('NATIONALITY_TO_CODE map', () => {
    it('contains expected entries', () => {
      expect(NATIONALITY_TO_CODE['Dutch']).toBe('NL');
      expect(NATIONALITY_TO_CODE['British']).toBe('GB');
      expect(NATIONALITY_TO_CODE['German']).toBe('DE');
      expect(NATIONALITY_TO_CODE['Brazilian']).toBe('BR');
      expect(NATIONALITY_TO_CODE['Japanese']).toBe('JP');
    });
  });
});

// ─── circuit-type formatter ───────────────────────────────────────────────────

describe('circuit-type formatter', () => {
  describe('render', () => {
    it('renders Street with accent-quaternary (purple) background', () => {
      const result = renderFormatter('circuit-type', 'Street') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-accent-quaternary)');
      expect(result.props.children).toBe('Street');
    });

    it('renders Permanent with accent-primary (blue) background', () => {
      const result = renderFormatter('circuit-type', 'Permanent') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-accent-primary)');
    });

    it('renders SemiPermanent with status-success (teal) background', () => {
      const result = renderFormatter('circuit-type', 'SemiPermanent') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-status-success)');
    });

    it('renders Semi-permanent with underscores normalised', () => {
      const result = renderFormatter('circuit-type', 'Semi_Permanent') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-status-success)');
    });

    it('renders unknown circuit type with neutral gray', () => {
      const result = renderFormatter('circuit-type', 'Oval') as React.ReactElement;
      expect(result.props.style.backgroundColor).toBe('var(--v-bg-subtle)');
    });

    it('returns null for empty value', () => {
      expect(renderFormatter('circuit-type', null)).toBeNull();
    });
  });

  describe('sort', () => {
    it('sorts alphabetically', () => {
      expect(sortFormatter('circuit-type', 'Permanent', 'Street')).toBeLessThan(0);
    });
  });

  describe('export', () => {
    it('exports plain text', () => {
      expect(exportFormatter('circuit-type', 'Street')).toBe('Street');
    });

    it('exports empty string for null', () => {
      expect(exportFormatter('circuit-type', null)).toBe('');
    });
  });
});

// ─── weather formatter ────────────────────────────────────────────────────────

describe('weather formatter', () => {
  describe('render', () => {
    it('renders Dry with sun emoji', () => {
      const result = renderFormatter('weather', 'Dry') as React.ReactElement;
      const children = result.props.children as React.ReactElement[];
      const iconSpan = children[0];
      expect(iconSpan.props.children).toBe('☀️');
    });

    it('renders Wet with rain emoji', () => {
      const result = renderFormatter('weather', 'Wet') as React.ReactElement;
      const children = result.props.children as React.ReactElement[];
      const iconSpan = children[0];
      expect(iconSpan.props.children).toBe('🌧️');
    });

    it('renders Mixed with partly-cloudy emoji', () => {
      const result = renderFormatter('weather', 'Mixed') as React.ReactElement;
      const children = result.props.children as React.ReactElement[];
      const iconSpan = children[0];
      expect(iconSpan.props.children).toBe('⛅');
    });

    it('renders unknown weather with no icon', () => {
      const result = renderFormatter('weather', 'Thunderstorm') as React.ReactElement;
      const children = result.props.children as Array<React.ReactElement | null>;
      // icon span should be null when no known icon
      expect(children[0]).toBeNull();
      const textSpan = children[1]!;
      expect(textSpan.props.children).toBe('Thunderstorm');
    });

    it('returns null for empty value', () => {
      expect(renderFormatter('weather', null)).toBeNull();
    });
  });

  describe('sort', () => {
    it('sorts alphabetically', () => {
      expect(sortFormatter('weather', 'Dry', 'Wet')).toBeLessThan(0);
    });
  });

  describe('export', () => {
    it('exports plain text', () => {
      expect(exportFormatter('weather', 'Dry')).toBe('Dry');
      expect(exportFormatter('weather', 'Wet')).toBe('Wet');
    });

    it('exports empty string for null', () => {
      expect(exportFormatter('weather', null)).toBe('');
    });
  });
});

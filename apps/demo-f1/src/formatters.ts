/**
 * demo-f1 custom formatter registrations
 *
 * Registers 8 F1-domain cell formatters via the workspace FormatterRegistry.
 * Formatters control how data values are displayed in VastuTable cells
 * and VastuChart tooltips.
 *
 * This file is loaded at app startup before the workspace renders.
 * Import it in your root layout or workspace page:
 *
 *   import '@demo-f1/src/formatters';
 *
 * Each formatter demonstrates a different extension pattern:
 *   - Numeric transformation  (lap-time, pit-duration)
 *   - Enum-to-visual mapping  (tire-compound, race-status, circuit-type, weather)
 *   - Delta display           (position-change)
 *   - Geo data + emoji        (nationality-flag)
 *
 * All colors use CSS custom properties from the Vastu design token system.
 * Never use hardcoded hex values — use --v-* tokens only.
 *
 * Implements VASTU-2A-222.
 */

import React from 'react';
import { registerFormatter, hasFormatter } from '@vastu/workspace';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a millisecond value to a lap time string: "1:23.456".
 * Returns "---" when the value is null/undefined/0.
 */
function msToLapTime(ms: unknown): string {
  if (ms === null || ms === undefined || ms === 0 || ms === '') return '---';
  const totalMs = Number(ms);
  if (isNaN(totalMs) || totalMs <= 0) return '---';
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);
  const millis = totalMs % 1_000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/**
 * Convert a millisecond value to a pit duration string: "2.4s".
 * Returns "---" when the value is null/undefined.
 */
function msToPitDuration(ms: unknown): string {
  if (ms === null || ms === undefined || ms === '') return '---';
  const totalMs = Number(ms);
  if (isNaN(totalMs) || totalMs <= 0) return '---';
  const seconds = (totalMs / 1_000).toFixed(1);
  return `${seconds}s`;
}

/**
 * Flag emoji map: ISO 3166-1 alpha-2 code → flag emoji.
 * Uses regional indicator symbols to build flag emojis.
 */
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  // Validate both characters are uppercase A-Z
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  // Regional indicator symbols start at U+1F1E6 for 'A'
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + upper.charCodeAt(0) - 65,
    A + upper.charCodeAt(1) - 65,
  );
}

/**
 * Well-known nationality → ISO 3166-1 alpha-2 code map.
 * Covers the nationalities used in the F1 demo seed.
 */
const NATIONALITY_TO_CODE: Record<string, string> = {
  // Europe
  British: 'GB',
  German: 'DE',
  Dutch: 'NL',
  French: 'FR',
  Spanish: 'ES',
  Italian: 'IT',
  Swiss: 'CH',
  Belgian: 'BE',
  Austrian: 'AT',
  Finnish: 'FI',
  Swedish: 'SE',
  Danish: 'DK',
  Norwegian: 'NO',
  Polish: 'PL',
  Czech: 'CZ',
  Hungarian: 'HU',
  Portuguese: 'PT',
  Greek: 'GR',
  Romanian: 'RO',
  Russian: 'RU',
  // Americas
  American: 'US',
  Canadian: 'CA',
  Mexican: 'MX',
  Brazilian: 'BR',
  Argentine: 'AR',
  Colombian: 'CO',
  Venezuelan: 'VE',
  Chilean: 'CL',
  Peruvian: 'PE',
  // Asia / Oceania
  Japanese: 'JP',
  Chinese: 'CN',
  Thai: 'TH',
  Indian: 'IN',
  Australian: 'AU',
  'New Zealander': 'NZ',
  Emirati: 'AE',
  Bahraini: 'BH',
  Saudi: 'SA',
  // Africa
  South_African: 'ZA',
  'South African': 'ZA',
  Moroccan: 'MA',
};

/** Badge style helper — returns an inline style object for colored pill badges. */
function badgeStyle(bg: string, color?: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 'var(--v-radius-full)',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: bg,
    color: color ?? 'var(--v-text-on-accent)',
    whiteSpace: 'nowrap' as const,
    lineHeight: '16px',
  };
}

// ─── Formatter definitions ────────────────────────────────────────────────────

/**
 * lap-time formatter
 *
 * Renders milliseconds as "1:23.456" (minutes:seconds.milliseconds).
 * Used for: lap_times.time_ms, qualifying Q1/Q2/Q3 times, fastest lap time.
 * Sorts numerically on the raw millisecond value.
 */
const lapTimeFormatter = {
  id: 'lap-time',
  meta: {
    label: 'Lap time',
    group: 'f1',
    description: 'Milliseconds formatted as m:ss.mmm (e.g. 1:23.456)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    const formatted = msToLapTime(value);
    const isNull = formatted === '---';
    return React.createElement(
      'span',
      {
        style: {
          fontVariantNumeric: 'tabular-nums',
          color: isNull ? 'var(--v-text-tertiary)' : undefined,
          fontFamily: 'var(--v-font-mono, monospace)',
        },
      },
      formatted,
    );
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue !== null && aValue !== undefined ? Number(aValue) : Infinity;
    const b = bValue !== null && bValue !== undefined ? Number(bValue) : Infinity;
    const aN = isNaN(a) ? Infinity : a;
    const bN = isNaN(b) ? Infinity : b;
    return aN - bN;
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    return msToLapTime(value);
  },
};

/**
 * pit-duration formatter
 *
 * Renders milliseconds as "2.4s" (seconds with 1 decimal place).
 * Used for: pit_stops.duration_ms.
 * Sorts numerically on the raw millisecond value.
 */
const pitDurationFormatter = {
  id: 'pit-duration',
  meta: {
    label: 'Pit duration',
    group: 'f1',
    description: 'Milliseconds formatted as seconds (e.g. 2.4s)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    const formatted = msToPitDuration(value);
    const isNull = formatted === '---';
    return React.createElement(
      'span',
      {
        style: {
          fontVariantNumeric: 'tabular-nums',
          color: isNull ? 'var(--v-text-tertiary)' : undefined,
        },
      },
      formatted,
    );
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue !== null && aValue !== undefined ? Number(aValue) : Infinity;
    const b = bValue !== null && bValue !== undefined ? Number(bValue) : Infinity;
    const aN = isNaN(a) ? Infinity : a;
    const bN = isNaN(b) ? Infinity : b;
    return aN - bN;
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    return msToPitDuration(value);
  },
};

/**
 * tire-compound formatter
 *
 * Renders a tire compound enum as a colored pill badge.
 * Colors follow F1 convention: Soft=red, Medium=yellow, Hard=white, Inter=green, Wet=blue.
 * Used for: pit_stops.tire_compound.
 */
const tireCompoundFormatter = {
  id: 'tire-compound',
  meta: {
    label: 'Tire compound',
    group: 'f1',
    description: 'F1 tire compound colored badge (Soft/Medium/Hard/Intermediate/Wet)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    const compound = value !== null && value !== undefined ? String(value) : '';
    if (!compound) return null;

    let style: React.CSSProperties;
    switch (compound.toLowerCase()) {
      case 'soft':
        style = badgeStyle('var(--v-status-error)');
        break;
      case 'medium':
        // Amber/yellow — using accent-tertiary per the plan spec
        style = badgeStyle('var(--v-accent-tertiary)', 'var(--v-text-primary)');
        break;
      case 'hard':
        // White with dark text
        style = badgeStyle('var(--v-bg-tertiary)', 'var(--v-text-primary)');
        break;
      case 'intermediate':
        style = badgeStyle('var(--v-status-success)');
        break;
      case 'wet':
        style = badgeStyle('var(--v-accent-primary)');
        break;
      default:
        // Unknown compound — neutral gray pill
        style = badgeStyle('var(--v-bg-subtle)', 'var(--v-text-secondary)');
    }

    return React.createElement('span', { style, title: compound }, compound);
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue != null ? String(aValue) : '';
    const b = bValue != null ? String(bValue) : '';
    return a.localeCompare(b);
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    return value !== null && value !== undefined ? String(value) : '';
  },
};

/**
 * position-change formatter
 *
 * Renders the delta between grid and finish position.
 * Positive delta (gained places): green with upward arrow ▲.
 * Negative delta (lost places): red with downward arrow ▼.
 * Zero delta (held position): gray dash —.
 * Used for: race_results grid_position vs finish_position difference.
 */
const positionChangeFormatter = {
  id: 'position-change',
  meta: {
    label: 'Position change',
    group: 'f1',
    description: 'Grid vs finish delta with direction indicator (▲3 / ▼2 / —)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    if (value === null || value === undefined || value === '') {
      return React.createElement(
        'span',
        { style: { color: 'var(--v-text-tertiary)' } },
        '—',
      );
    }
    const delta = Number(value);
    if (isNaN(delta)) {
      return React.createElement(
        'span',
        { style: { color: 'var(--v-text-tertiary)' } },
        '—',
      );
    }
    if (delta === 0) {
      return React.createElement(
        'span',
        {
          style: {
            color: 'var(--v-text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          },
        },
        '—',
      );
    }
    if (delta > 0) {
      return React.createElement(
        'span',
        {
          style: {
            color: 'var(--v-status-success)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          },
        },
        `▲${delta}`,
      );
    }
    return React.createElement(
      'span',
      {
        style: {
          color: 'var(--v-status-error)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
        },
      },
      `▼${Math.abs(delta)}`,
    );
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue !== null && aValue !== undefined ? Number(aValue) : 0;
    const b = bValue !== null && bValue !== undefined ? Number(bValue) : 0;
    const aN = isNaN(a) ? 0 : a;
    const bN = isNaN(b) ? 0 : b;
    return aN - bN;
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    if (value === null || value === undefined || value === '') return '—';
    const delta = Number(value);
    if (isNaN(delta)) return '—';
    if (delta === 0) return '—';
    return delta > 0 ? `+${delta}` : String(delta);
  },
};

/**
 * race-status formatter
 *
 * Renders a race result status enum as a color-coded badge.
 * Finished=green, DNF=red, DSQ=amber, DNS=gray.
 * Used for: race_results.status.
 */
const raceStatusFormatter = {
  id: 'race-status',
  meta: {
    label: 'Race status',
    group: 'f1',
    description: 'Race result status badge (Finished / DNF / DSQ / DNS)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    const status = value !== null && value !== undefined ? String(value) : '';
    if (!status) return null;

    let style: React.CSSProperties;
    switch (status.toUpperCase()) {
      case 'FINISHED':
        style = badgeStyle('var(--v-status-success)');
        break;
      case 'DNF':
        style = badgeStyle('var(--v-status-error)');
        break;
      case 'DSQ':
        // Amber — using accent-tertiary per plan spec
        style = badgeStyle('var(--v-accent-tertiary)', 'var(--v-text-primary)');
        break;
      case 'DNS':
        style = {
          ...badgeStyle('transparent', 'var(--v-text-tertiary)'),
          border: '1px solid var(--v-border-default)',
        };
        break;
      default:
        style = badgeStyle('var(--v-bg-subtle)', 'var(--v-text-secondary)');
    }

    return React.createElement('span', { style, title: status }, status);
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue != null ? String(aValue) : '';
    const b = bValue != null ? String(bValue) : '';
    return a.localeCompare(b);
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    return value !== null && value !== undefined ? String(value) : '';
  },
};

/**
 * nationality-flag formatter
 *
 * Renders a nationality string as a flag emoji + two-letter country code.
 * Falls back to plain text when the nationality is not in the known map.
 * Used for: drivers.nationality, constructors.nationality.
 */
const nationalityFlagFormatter = {
  id: 'nationality-flag',
  meta: {
    label: 'Nationality',
    group: 'f1',
    description: 'Nationality with flag emoji (e.g. 🇳🇱 NL)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    const nationality = value !== null && value !== undefined ? String(value) : '';
    if (!nationality) return null;

    const code = NATIONALITY_TO_CODE[nationality];
    const flag = code ? countryCodeToFlag(code) : '';

    return React.createElement(
      'span',
      {
        title: nationality,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        },
      },
      flag
        ? React.createElement(
            'span',
            { 'aria-hidden': 'true', style: { fontSize: '14px' } },
            flag,
          )
        : null,
      React.createElement(
        'span',
        {
          style: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        },
        code ? code : nationality,
      ),
    );
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue != null ? String(aValue) : '';
    const b = bValue != null ? String(bValue) : '';
    return a.localeCompare(b);
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    const nationality = value !== null && value !== undefined ? String(value) : '';
    const code = NATIONALITY_TO_CODE[nationality];
    const flag = code ? countryCodeToFlag(code) : '';
    return flag ? `${flag} ${code ?? nationality}` : nationality;
  },
};

/**
 * circuit-type formatter
 *
 * Renders a circuit type enum as a colored badge.
 * Street=purple, Permanent=blue, SemiPermanent=teal.
 * Used for: circuits.circuit_type.
 */
const circuitTypeFormatter = {
  id: 'circuit-type',
  meta: {
    label: 'Circuit type',
    group: 'f1',
    description: 'Circuit type badge (Street / Permanent / SemiPermanent)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    const circuitType = value !== null && value !== undefined ? String(value) : '';
    if (!circuitType) return null;

    let style: React.CSSProperties;
    const normalised = circuitType.replace(/[_\s]/g, '').toLowerCase();
    switch (normalised) {
      case 'street':
        style = badgeStyle('var(--v-accent-quaternary)');
        break;
      case 'permanent':
        style = badgeStyle('var(--v-accent-primary)');
        break;
      case 'semipermanent':
        style = badgeStyle('var(--v-status-success)');
        break;
      default:
        style = badgeStyle('var(--v-bg-subtle)', 'var(--v-text-secondary)');
    }

    return React.createElement('span', { style, title: circuitType }, circuitType);
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue != null ? String(aValue) : '';
    const b = bValue != null ? String(bValue) : '';
    return a.localeCompare(b);
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    return value !== null && value !== undefined ? String(value) : '';
  },
};

/**
 * weather formatter
 *
 * Renders a weather enum as an icon + label.
 * Dry=☀️, Wet=🌧️, Mixed=⛅.
 * Used for: races.weather.
 */
const weatherFormatter = {
  id: 'weather',
  meta: {
    label: 'Weather',
    group: 'f1',
    description: 'Weather condition with icon (Dry ☀️ / Wet 🌧️ / Mixed ⛅)',
  },
  render({ value }: { value: unknown; row: Record<string, unknown> }): React.ReactNode {
    const weather = value !== null && value !== undefined ? String(value) : '';
    if (!weather) return null;

    let icon: string;
    switch (weather.toLowerCase()) {
      case 'dry':
        icon = '☀️';
        break;
      case 'wet':
        icon = '🌧️';
        break;
      case 'mixed':
        icon = '⛅';
        break;
      default:
        icon = '';
    }

    return React.createElement(
      'span',
      {
        title: weather,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        },
      },
      icon
        ? React.createElement(
            'span',
            { 'aria-hidden': 'true', style: { fontSize: '14px' } },
            icon,
          )
        : null,
      React.createElement('span', null, weather),
    );
  },
  sort({ aValue, bValue }: { aValue: unknown; bValue: unknown }): number {
    const a = aValue != null ? String(aValue) : '';
    const b = bValue != null ? String(bValue) : '';
    return a.localeCompare(b);
  },
  export({ value }: { value: unknown; row: Record<string, unknown> }): string {
    return value !== null && value !== undefined ? String(value) : '';
  },
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * All F1 custom formatters in registration order.
 * Exported for testing — do not mutate.
 */
export const F1_FORMATTERS = [
  lapTimeFormatter,
  pitDurationFormatter,
  tireCompoundFormatter,
  positionChangeFormatter,
  raceStatusFormatter,
  nationalityFlagFormatter,
  circuitTypeFormatter,
  weatherFormatter,
] as const;

/**
 * Register all F1 formatters with the workspace FormatterRegistry.
 *
 * Safe to call multiple times — already-registered formatters are skipped.
 * This is called automatically as a module side-effect when formatters.ts is imported.
 */
export function registerF1Formatters(): void {
  for (const formatter of F1_FORMATTERS) {
    if (!hasFormatter(formatter.id)) {
      // Type assertion needed because each formatter object is typed as a const
      // with literal `id`. The FormatterDefinition interface accepts string IDs.
      registerFormatter(formatter);
    }
  }
}

// Side-effect registration: runs once when this module is first imported.
registerF1Formatters();

// ─── Exports for nationality utilities (used in tests) ────────────────────────
export { msToLapTime, msToPitDuration, countryCodeToFlag, NATIONALITY_TO_CODE };

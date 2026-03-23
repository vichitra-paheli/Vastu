'use client';

/**
 * formatters/builtins.ts — built-in formatter definitions.
 *
 * Pre-registers the following display types:
 *   text, number, currency, date, relativeDate, badge, avatar, boolean, link, monospace
 *
 * These are the framework defaults. Apps may add custom formatters alongside
 * these, but must never attempt to replace a built-in (registerFormatter throws
 * on duplicate IDs).
 *
 * This module registers formatters as a side effect when imported.
 * Import it once at application startup (e.g. in WorkspaceProviders).
 *
 * Implements VASTU-2A-205b.
 */

import React from 'react';
import { registerFormatter, hasFormatter } from './registry';
import type { FormatterDefinition } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function defaultSort(aValue: unknown, bValue: unknown): number {
  const a = aValue != null ? String(aValue) : '';
  const b = bValue != null ? String(bValue) : '';
  return a.localeCompare(b);
}

function numericSort(aValue: unknown, bValue: unknown): number {
  const a = toNum(aValue) ?? -Infinity;
  const b = toNum(bValue) ?? -Infinity;
  return a - b;
}

// ─── Built-in definitions ─────────────────────────────────────────────────────

const TEXT_FORMATTER: FormatterDefinition = {
  id: 'text',
  meta: {
    label: 'Text',
    group: 'text',
    description: 'Plain text with truncation',
  },
  render({ value }) {
    const str = toStr(value);
    return React.createElement(
      'span',
      {
        className: 'vastu-cell-text',
        title: str,
        style: {
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
      str,
    );
  },
  sort({ aValue, bValue }) {
    return defaultSort(aValue, bValue);
  },
  export({ value }) {
    return toStr(value);
  },
};

const NUMBER_FORMATTER: FormatterDefinition = {
  id: 'number',
  meta: {
    label: 'Number',
    group: 'numbers',
    description: 'Locale-formatted number',
  },
  render({ value }) {
    const n = toNum(value);
    const display = n !== null ? n.toLocaleString() : '';
    return React.createElement(
      'span',
      {
        className: 'vastu-cell-number',
        style: {
          display: 'block',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
      display,
    );
  },
  sort({ aValue, bValue }) {
    return numericSort(aValue, bValue);
  },
  export({ value }) {
    const n = toNum(value);
    return n !== null ? String(n) : '';
  },
  filter({ value }) {
    return toNum(value);
  },
};

const CURRENCY_FORMATTER: FormatterDefinition = {
  id: 'currency',
  meta: {
    label: 'Currency',
    group: 'numbers',
    description: 'Formatted as a monetary value (USD)',
  },
  render({ value }) {
    const n = toNum(value);
    const display =
      n !== null
        ? n.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : '';
    return React.createElement(
      'span',
      {
        className: 'vastu-cell-currency',
        style: {
          display: 'block',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
      display,
    );
  },
  sort({ aValue, bValue }) {
    return numericSort(aValue, bValue);
  },
  export({ value }) {
    const n = toNum(value);
    return n !== null ? n.toFixed(2) : '';
  },
  filter({ value }) {
    return toNum(value);
  },
};

const DATE_FORMATTER: FormatterDefinition = {
  id: 'date',
  meta: {
    label: 'Date',
    group: 'dates',
    description: 'Locale-formatted date (e.g. Jan 1, 2024)',
  },
  render({ value }) {
    const str = toStr(value);
    if (!str) return React.createElement('span', null, '');
    const d = new Date(str);
    const display = isNaN(d.getTime())
      ? str
      : d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
    return React.createElement(
      'span',
      {
        className: 'vastu-cell-date',
        title: str,
        style: {
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
      display,
    );
  },
  sort({ aValue, bValue }) {
    const aTime = aValue ? new Date(String(aValue)).getTime() : -Infinity;
    const bTime = bValue ? new Date(String(bValue)).getTime() : -Infinity;
    const aValid = isNaN(aTime) ? -Infinity : aTime;
    const bValid = isNaN(bTime) ? -Infinity : bTime;
    return aValid - bValid;
  },
  export({ value }) {
    const str = toStr(value);
    if (!str) return '';
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toISOString().slice(0, 10);
  },
};

const RELATIVE_DATE_FORMATTER: FormatterDefinition = {
  id: 'relativeDate',
  meta: {
    label: 'Relative date',
    group: 'dates',
    description: 'Relative time (e.g. "3 days ago")',
  },
  render({ value }) {
    const str = toStr(value);
    if (!str) return React.createElement('span', null, '');
    const d = new Date(str);
    if (isNaN(d.getTime())) {
      return React.createElement('span', { className: 'vastu-cell-relative-date' }, str);
    }
    const display = formatRelative(d);
    return React.createElement(
      'span',
      {
        className: 'vastu-cell-relative-date',
        title: d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        style: {
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--v-text-secondary)',
        },
      },
      display,
    );
  },
  sort({ aValue, bValue }) {
    const aTime = aValue ? new Date(String(aValue)).getTime() : -Infinity;
    const bTime = bValue ? new Date(String(bValue)).getTime() : -Infinity;
    const aValid = isNaN(aTime) ? -Infinity : aTime;
    const bValid = isNaN(bTime) ? -Infinity : bTime;
    return aValid - bValid;
  },
  export({ value }) {
    const str = toStr(value);
    if (!str) return '';
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toISOString().slice(0, 10);
  },
};

/** Format a Date as a relative string. E.g. "3 days ago", "in 2 hours". */
function formatRelative(date: Date): string {
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiff = Math.abs(diffMs);
  const past = diffMs < 0;

  const units: Array<[number, string]> = [
    [60_000, 'minute'],
    [3_600_000, 'hour'],
    [86_400_000, 'day'],
    [604_800_000, 'week'],
    [2_592_000_000, 'month'],
    [31_536_000_000, 'year'],
  ];

  if (absDiff < 60_000) return 'just now';

  for (let i = units.length - 1; i >= 0; i--) {
    const [threshold, unit] = units[i];
    const prevThreshold = i > 0 ? units[i - 1][0] : 0;
    if (absDiff >= prevThreshold) {
      const count = Math.round(absDiff / threshold);
      const label = count === 1 ? unit : `${unit}s`;
      return past ? `${count} ${label} ago` : `in ${count} ${label}`;
    }
  }

  return date.toLocaleDateString();
}

const BADGE_FORMATTER: FormatterDefinition = {
  id: 'badge',
  meta: {
    label: 'Badge',
    group: 'visual',
    description: 'Coloured pill badge',
  },
  render({ value }) {
    const str = toStr(value);
    if (!str) return null;
    return React.createElement(
      'span',
      {
        className: 'vastu-cell-badge',
        title: str,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 'var(--v-radius-full)',
          fontSize: '11px',
          fontWeight: 500,
          backgroundColor: 'var(--v-bg-subtle)',
          color: 'var(--v-text-secondary)',
          border: '1px solid var(--v-border-default)',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
      str,
    );
  },
  sort({ aValue, bValue }) {
    return defaultSort(aValue, bValue);
  },
  export({ value }) {
    return toStr(value);
  },
};

const AVATAR_FORMATTER: FormatterDefinition = {
  id: 'avatar',
  meta: {
    label: 'Avatar',
    group: 'visual',
    description: 'Circular avatar with initials fallback',
  },
  render({ value, row }) {
    const str = toStr(value);
    const words = str.trim().split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : str.slice(0, 2).toUpperCase();

    const imageUrl =
      toStr(row['avatarUrl'] ?? row['imageUrl'] ?? row['avatar'] ?? '') || undefined;

    return React.createElement(
      'span',
      {
        className: 'vastu-cell-avatar',
        title: str,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          overflow: 'hidden',
        },
      },
      React.createElement(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: 'var(--v-accent-primary)',
            color: 'var(--v-text-on-accent)',
            fontSize: 10,
            fontWeight: 500,
            flexShrink: 0,
            overflow: 'hidden',
          },
        },
        imageUrl
          ? React.createElement('img', {
              src: imageUrl,
              alt: str,
              style: { width: '100%', height: '100%', objectFit: 'cover' },
            })
          : initials,
      ),
      React.createElement(
        'span',
        {
          style: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        },
        str,
      ),
    );
  },
  sort({ aValue, bValue }) {
    return defaultSort(aValue, bValue);
  },
  export({ value }) {
    return toStr(value);
  },
};

const BOOLEAN_FORMATTER: FormatterDefinition = {
  id: 'boolean',
  meta: {
    label: 'Boolean',
    group: 'text',
    description: 'Check / cross icon for true/false values',
  },
  render({ value }) {
    if (value === null || value === undefined) return null;
    const boolVal = value === true || value === 'true' || value === 1 || value === '1';
    return React.createElement(
      'span',
      {
        className: boolVal ? 'vastu-cell-bool-true' : 'vastu-cell-bool-false',
        'aria-label': boolVal ? 'True' : 'False',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: boolVal ? 'var(--v-color-success)' : 'var(--v-color-danger)',
        },
      },
      boolVal ? '✓' : '✗',
    );
  },
  sort({ aValue, bValue }) {
    const toBool = (v: unknown) =>
      v === true || v === 'true' || v === 1 || v === '1' ? 1 : 0;
    return toBool(aValue) - toBool(bValue);
  },
  export({ value }) {
    if (value === null || value === undefined) return '';
    const boolVal = value === true || value === 'true' || value === 1 || value === '1';
    return boolVal ? 'true' : 'false';
  },
  filter({ value }) {
    if (value === null || value === undefined) return null;
    return value === true || value === 'true' || value === 1 || value === '1';
  },
};

const LINK_FORMATTER: FormatterDefinition = {
  id: 'link',
  meta: {
    label: 'Link',
    group: 'text',
    description: 'Clickable hyperlink',
  },
  render({ value, row }) {
    const href = toStr(value);
    if (!href) return null;
    const label = toStr(row['linkLabel'] ?? row['label'] ?? row['name'] ?? '') || href;
    return React.createElement(
      'a',
      {
        href,
        className: 'vastu-cell-link',
        target: '_blank',
        rel: 'noopener noreferrer',
        style: {
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--v-accent-primary)',
          textDecoration: 'none',
        },
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      },
      label,
    );
  },
  sort({ aValue, bValue }) {
    return defaultSort(aValue, bValue);
  },
  export({ value }) {
    return toStr(value);
  },
};

const MONOSPACE_FORMATTER: FormatterDefinition = {
  id: 'monospace',
  meta: {
    label: 'Monospace',
    group: 'text',
    description: 'Monospace font (for IDs, codes, hashes)',
  },
  render({ value }) {
    const str = toStr(value);
    return React.createElement(
      'code',
      {
        className: 'vastu-cell-monospace',
        title: str,
        style: {
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--v-font-mono)',
          fontSize: '12px',
          backgroundColor: 'var(--v-bg-subtle)',
          padding: '1px 4px',
          borderRadius: 'var(--v-radius-sm)',
        },
      },
      str,
    );
  },
  sort({ aValue, bValue }) {
    return defaultSort(aValue, bValue);
  },
  export({ value }) {
    return toStr(value);
  },
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * The ordered list of built-in formatters.
 * Exported for testing purposes — do not mutate.
 */
export const BUILTIN_FORMATTERS: readonly FormatterDefinition[] = [
  TEXT_FORMATTER,
  NUMBER_FORMATTER,
  CURRENCY_FORMATTER,
  DATE_FORMATTER,
  RELATIVE_DATE_FORMATTER,
  BADGE_FORMATTER,
  AVATAR_FORMATTER,
  BOOLEAN_FORMATTER,
  LINK_FORMATTER,
  MONOSPACE_FORMATTER,
] as const;

/**
 * Register all built-in formatters.
 *
 * Registers each built-in formatter that is not already present in the registry.
 * This is safe to call multiple times — already-registered formatters are skipped
 * so that calling it after clearFormatterRegistry() (in tests) re-registers them
 * without throwing duplicate-registration errors.
 */
export function registerBuiltinFormatters(): void {
  for (const def of BUILTIN_FORMATTERS) {
    if (!hasFormatter(def.id)) {
      registerFormatter(def);
    }
  }
}

// Side-effect registration on module load
registerBuiltinFormatters();

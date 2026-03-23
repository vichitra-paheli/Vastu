'use client';

/**
 * ChartTooltip — custom Recharts tooltip component for VastuChart.
 *
 * Per Style Guide §10.5:
 * - Background: --v-bg-elevated
 * - Shadow: --v-shadow-sm
 * - Font: --v-text-sm (12px)
 * - Square color swatch per series (10×10px, --v-radius-sm)
 * - Values sorted by value descending
 *
 * Value display:
 *   1. If a seriesConfig provides a `displayType`, the registered formatter's
 *      render function is used to format the value (VASTU-2A-205c).
 *   2. Otherwise, the raw value is displayed as a string.
 *
 * Implements US-135 AC-5, extended by VASTU-2A-205c.
 *
 * Note: This component is passed as a render function to Recharts <Tooltip content={...}>.
 * Recharts injects active, payload, label at render time.
 */

import React from 'react';
import type { SeriesConfig } from './types';
import { getFormatter } from '../../formatters/registry';

export interface ChartTooltipProps {
  /** Injected by Recharts: whether the tooltip is active. */
  active?: boolean;
  /**
   * Injected by Recharts: array of payload entries.
   * Each entry has dataKey, name, value, color (among other fields).
   * Using unknown[] to stay compatible with different Recharts versions.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: ReadonlyArray<any>;
  /** Injected by Recharts: the label for the current x-axis tick. */
  label?: string | number;
  /** Series config for display name resolution. */
  series: SeriesConfig[];
  /** Resolved colors per series dataKey. */
  resolvedColors: Record<string, string>;
}

/**
 * Format a single tooltip value using the formatter registry when a displayType
 * is configured on the matching SeriesConfig, otherwise falls back to String().
 */
function formatTooltipValue(
  value: string | number | null | undefined,
  seriesConfig: SeriesConfig | undefined,
): React.ReactNode {
  if (value == null) return '\u2014';

  const displayType = (seriesConfig as (SeriesConfig & { displayType?: string }) | undefined)
    ?.displayType;

  if (displayType) {
    const formatter = getFormatter(displayType);
    if (formatter) {
      return formatter.render({ value, row: {} });
    }
  }

  return String(value);
}

export function ChartTooltip({ active, payload, label, series, resolvedColors }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Build display entries: pair each payload item with its series config
  const entries = [...payload]
    .map((entry: Record<string, unknown>) => {
      const dKey = entry.dataKey != null ? String(entry.dataKey) : undefined;
      const seriesConfig = dKey ? series.find((s) => s.dataKey === dKey) : undefined;
      return {
        dataKey: dKey ?? String(entry.name ?? ''),
        name: seriesConfig?.name ?? String(entry.name ?? ''),
        value: entry.value as string | number | null | undefined,
        color: (dKey && resolvedColors[dKey]) ? resolvedColors[dKey] : (String(entry.color ?? 'var(--v-text-tertiary)')),
        seriesConfig,
      };
    })
    // Sort by value descending (nulls last)
    .sort((a, b) => {
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return Number(b.value) - Number(a.value);
    });

  return (
    <div style={tooltipStyles.container}>
      {label !== undefined && label !== null && (
        <div style={tooltipStyles.label}>{String(label)}</div>
      )}
      <div style={tooltipStyles.list}>
        {entries.map((entry) => (
          <div key={entry.dataKey} style={tooltipStyles.row}>
            <span
              style={{
                ...tooltipStyles.swatch,
                backgroundColor: entry.color,
              }}
              aria-hidden="true"
            />
            <span style={tooltipStyles.name}>{entry.name}</span>
            <span style={tooltipStyles.value}>
              {formatTooltipValue(entry.value, entry.seriesConfig)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline styles for the tooltip — using CSS custom properties where possible.
 * Recharts renders tooltips outside the component tree, so module CSS classes
 * may not apply reliably. We use inline styles with var() references.
 */
const tooltipStyles = {
  container: {
    backgroundColor: 'var(--v-bg-elevated)',
    boxShadow: 'var(--v-shadow-sm)',
    borderRadius: 'var(--v-radius-md)',
    border: '1px solid var(--v-border-default)',
    padding: '8px 12px',
    fontFamily: 'var(--v-font-sans)',
    fontSize: '12px', // --v-text-sm
    color: 'var(--v-text-primary)',
    minWidth: '140px',
    maxWidth: '240px',
    pointerEvents: 'none' as const,
  },
  label: {
    fontWeight: 500, // --v-font-medium
    color: 'var(--v-text-secondary)',
    marginBottom: '6px',
    fontSize: '11px', // --v-text-xs
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  swatch: {
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '2px', // --v-radius-sm
    flexShrink: 0,
  },
  name: {
    flex: 1,
    color: 'var(--v-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  value: {
    fontWeight: 500, // --v-font-medium
    color: 'var(--v-text-primary)',
    textAlign: 'right' as const,
    flexShrink: 0,
    marginLeft: '8px',
  },
} as const;

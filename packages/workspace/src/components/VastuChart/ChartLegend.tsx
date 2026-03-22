'use client';

/**
 * ChartLegend — custom HTML legend for VastuChart.
 *
 * Per Style Guide §10.5 and US-135 AC-4:
 * - Square swatches (10×10px, --v-radius-sm) — never circles
 * - Click: toggle series visibility
 * - Double-click: solo this series (hide all others), double-click again to restore all
 * - Series color is preserved when hidden (next series does NOT shift)
 * - Font: --v-text-sm (12px), weight 400 (--v-font-regular)
 *
 * Implements US-135 AC-4.
 */

import React, { useCallback } from 'react';
import type { SeriesConfig } from './types';
import type { LegendPosition } from './types';
import classes from './ChartLegend.module.css';
import { t } from '../../lib/i18n';

interface ChartLegendProps {
  series: SeriesConfig[];
  resolvedColors: Record<string, string>;
  hiddenSeries: Set<string>;
  position?: LegendPosition;
  onToggle: (dataKey: string) => void;
  onSolo: (dataKey: string) => void;
}

export function ChartLegend({
  series,
  resolvedColors,
  hiddenSeries,
  position = 'bottom',
  onToggle,
  onSolo,
}: ChartLegendProps) {
  // Track the last click time per series key to detect double-click
  const lastClickRef = React.useRef<Record<string, number>>({});

  const handleClick = useCallback(
    (dataKey: string) => {
      const now = Date.now();
      const last = lastClickRef.current[dataKey] ?? 0;
      const isDoubleClick = now - last < 400; // 400ms double-click window

      lastClickRef.current[dataKey] = now;

      if (isDoubleClick) {
        // Double-click: solo this series
        onSolo(dataKey);
      } else {
        // Single click: toggle visibility
        onToggle(dataKey);
      }
    },
    [onToggle, onSolo],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, dataKey: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(dataKey);
      }
    },
    [handleClick],
  );

  if (series.length === 0) {
    return null;
  }

  // Only top/bottom positions render as flex rows; left/right as columns
  const isVertical = position === 'left' || position === 'right';

  return (
    <ul
      className={classes.legend}
      data-position={position}
      style={{ flexDirection: isVertical ? 'column' : 'row' }}
      aria-label={t('chart.legend.ariaLabel')}
      role="list"
    >
      {series.map((s) => {
        const isHidden = hiddenSeries.has(s.dataKey);
        const color = resolvedColors[s.dataKey] ?? 'var(--v-text-tertiary)';

        return (
          <li key={s.dataKey} role="listitem">
            <button
              type="button"
              className={classes.item}
              data-hidden={isHidden ? 'true' : 'false'}
              onClick={() => handleClick(s.dataKey)}
              onKeyDown={(e) => handleKeyDown(e, s.dataKey)}
              aria-pressed={!isHidden}
              aria-label={t('chart.legend.seriesAriaLabel', { name: s.name })}
              title={isHidden ? t('chart.legend.showSeries') : t('chart.legend.hideSeries')}
            >
              <span
                className={classes.swatch}
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className={classes.label}>{s.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

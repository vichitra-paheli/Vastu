'use client';

/**
 * ChartKeyboardNav — keyboard navigation wrapper for VastuChart.
 *
 * Provides:
 * - Tab-focusable chart container (AC-1)
 * - Left/Right arrow: move between data points, announces active point (AC-2)
 * - Up/Down arrow: cycle between series at same x-position (AC-3)
 * - Enter: triggers drill-down action (AC-4)
 * - aria-live region for screen reader announcements (AC-5)
 *
 * Sparklines are exempt — pass `enabled={false}`.
 *
 * Implements US-210 (VASTU-2A-210a, VASTU-2A-210d).
 */

import React, { useId } from 'react';
import { useChartKeyboardNav } from './useChartKeyboardNav';
import type { ChartDataPoint, SeriesConfig, ChartType } from './types';
import classes from './ChartKeyboardNav.module.css';
import { t } from '../../lib/i18n';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ChartKeyboardNavProps {
  children: React.ReactNode;
  data: ChartDataPoint[];
  visibleSeries: SeriesConfig[];
  xAxisKey: string;
  chartType: ChartType;
  /** Human-readable aria-label for the chart container. */
  ariaLabel: string;
  /** Called when Enter is pressed on an active data point. */
  onEnter?: (dataIndex: number, seriesIndex: number, dataPoint: ChartDataPoint, series: SeriesConfig) => void;
  /** Whether keyboard nav is active. Pass false for sparklines. */
  enabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a screen reader announcement string for the currently active data point.
 * Format: "{type} chart. {series name}: {x-value}, {y-value}. Point {n} of {total}."
 */
function buildAnnouncement(
  dataPoint: ChartDataPoint,
  series: SeriesConfig,
  xAxisKey: string,
  dataIndex: number,
  dataLength: number,
  chartType: ChartType,
): string {
  const xValue = String(dataPoint[xAxisKey] ?? '');
  const yValue = dataPoint[series.dataKey];
  const valueStr = yValue != null ? String(yValue) : t('chart.a11y.noValue');
  const typeLabel = t(`chart.type.${chartType}`) || chartType;

  return t('chart.a11y.announcement', {
    type: typeLabel,
    series: series.name,
    x: xValue,
    value: valueStr,
    index: String(dataIndex + 1),
    total: String(dataLength),
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChartKeyboardNav({
  children,
  data,
  visibleSeries,
  xAxisKey,
  chartType,
  ariaLabel,
  onEnter,
  enabled = true,
}: ChartKeyboardNavProps) {
  const liveRegionId = useId();
  const descriptionId = useId();

  const { state, handlers, activeDataPoint, activeSeries } = useChartKeyboardNav({
    data,
    visibleSeries,
    onEnter,
    enabled,
  });

  const { containerRef, handleFocus, handleBlur, handleKeyDown } = handlers;
  const { activePointIndex, isFocused } = state;

  // Build the live region announcement string
  const announcement =
    enabled && isFocused && activeDataPoint && activeSeries
      ? buildAnnouncement(
          activeDataPoint,
          activeSeries,
          xAxisKey,
          activePointIndex,
          data.length,
          chartType,
        )
      : '';

  // Chart container a11y description
  const navHint = enabled ? t('chart.a11y.navHint') : '';
  const descriptionText = navHint ? `${ariaLabel}. ${navHint}` : ariaLabel;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={classes.container}
      tabIndex={enabled ? 0 : -1}
      role="group"
      aria-label={ariaLabel}
      aria-describedby={enabled ? descriptionId : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden description for screen readers */}
      {enabled && (
        <span id={descriptionId} className={classes.srLiveRegion}>
          {descriptionText}
        </span>
      )}

      {/* Chart content */}
      {children}

      {/* aria-live region for active point announcements */}
      {enabled && (
        <div
          id={liveRegionId}
          className={classes.srLiveRegion}
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          {announcement}
        </div>
      )}
    </div>
  );
}

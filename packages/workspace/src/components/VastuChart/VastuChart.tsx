'use client';

/**
 * VastuChart — Recharts wrapper with consistent config, color palette, and interactions.
 *
 * Supports: line, bar, area, donut, sparkline, scatter chart types.
 *
 * Design system compliance (Style Guide §10):
 * - Axis line color: --v-border-default
 * - Grid line color: --v-border-subtle
 * - Tooltip: --v-bg-elevated + --v-shadow-sm
 * - Legend: custom HTML (ChartLegend), 12px, square swatches
 * - Bar corner radius: 2px top corners (--v-radius-sm)
 * - Line stroke width: 2px (1.5px for >5 series)
 * - Area fill opacity: 0.08
 * - Dot radius: 3px (hover: 5px)
 * - prefers-reduced-motion: animations disabled
 *
 * Implements US-135 AC-1 through AC-12.
 */

import React, { useState, useCallback, useMemo, useEffect, useSyncExternalStore } from 'react';
import { Skeleton, Button } from '@mantine/core';
import { ResponsiveContainer, Legend as RechartsLegend } from 'recharts';
import { IconAlertCircle, IconSettings, IconChartLine } from '@tabler/icons-react';

import type { VastuChartProps, ChartConfig, SeriesConfig } from './types';
import { getSeriesColor } from './chartColors';
import { ChartLegend } from './ChartLegend';
import { ChartConfigPanel } from './ChartConfigPanel';
import { ChartRenderer } from './ChartRenderer';
import { useChartElements } from './useChartElements';
import { EmptyState } from '../EmptyState';
import { t } from '../../lib/i18n';
import classes from './VastuChart.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default chart height for inline usage. */
const DEFAULT_HEIGHT = 240;

/** Default chart height for full-width usage. */
const DEFAULT_HEIGHT_FULL = 360;

/** Line stroke width for <= 5 series. */
const LINE_STROKE_WIDTH = 2;

/** Line stroke width for > 5 series. */
const LINE_STROKE_WIDTH_DENSE = 1.5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve color for each series.
 * Series with an explicit `color` keep it; others are assigned from the palette by index.
 */
function resolveSeriesColors(series: SeriesConfig[]): Record<string, string> {
  const result: Record<string, string> = {};
  series.forEach((s, index) => {
    result[s.dataKey] = s.color ?? getSeriesColor(index);
  });
  return result;
}

/**
 * Subscribe to prefers-reduced-motion media query changes.
 * Used by useSyncExternalStore to react when the user toggles accessibility settings.
 */
function subscribePrefersReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getPrefersReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Server snapshot: conservative default returns true (no animation during SSR). */
function getPrefersReducedMotionServerSnapshot(): boolean {
  return true;
}

/**
 * Hook: reactively returns the current prefers-reduced-motion value.
 * Updates immediately when the user toggles accessibility settings.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    getPrefersReducedMotionServerSnapshot,
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VastuChart({
  type,
  data,
  series,
  config = {},
  onConfigChange,
  loading = false,
  error = null,
  onRetry,
  ariaLabel,
  className,
}: VastuChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(
    new Set(series.filter((s) => s.hidden).map((s) => s.dataKey)),
  );
  const [previousHidden, setPreviousHidden] = useState<Set<string> | null>(null);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [internalConfig, setInternalConfig] = useState<ChartConfig>(config);

  // Sync internalConfig when prop changes
  useEffect(() => {
    setInternalConfig(config);
  }, [config]);

  const resolvedColors = useMemo(() => resolveSeriesColors(series), [series]);
  const reducedMotion = usePrefersReducedMotion();

  // Effective config (merge defaults)
  const effectiveConfig: Required<ChartConfig> = {
    height: internalConfig.height ?? DEFAULT_HEIGHT,
    showLegend: internalConfig.showLegend ?? true,
    legendPosition: internalConfig.legendPosition ?? 'bottom',
    showAxisLabels: internalConfig.showAxisLabels ?? true,
    xAxisLabel: internalConfig.xAxisLabel ?? '',
    yAxisLabel: internalConfig.yAxisLabel ?? '',
    scaleType: internalConfig.scaleType ?? 'linear',
    stacked: internalConfig.stacked ?? false,
    barOrientation: internalConfig.barOrientation ?? 'vertical',
    referenceLines: internalConfig.referenceLines ?? [],
    xAxisKey: internalConfig.xAxisKey ?? (data.length > 0 ? Object.keys(data[0])[0] : 'x'),
  };

  // Visible series (not hidden)
  const visibleSeries = useMemo(
    () => series.filter((s) => !hiddenSeries.has(s.dataKey)),
    [series, hiddenSeries],
  );

  const strokeWidth = series.length > 5 ? LINE_STROKE_WIDTH_DENSE : LINE_STROKE_WIDTH;

  // ─── Chart elements (shared axis/grid/tooltip) ─────────────────────────────

  const chartElements = useChartElements({
    effectiveConfig,
    series,
    resolvedColors,
    reducedMotion,
  });

  // ─── Legend handlers ───────────────────────────────────────────────────────

  const handleLegendToggle = useCallback((dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  }, []);

  const handleLegendSolo = useCallback(
    (dataKey: string) => {
      const allOtherKeys = series
        .filter((s) => s.dataKey !== dataKey)
        .map((s) => s.dataKey);
      const currentlyHidden = hiddenSeries;

      const isAlreadySoloed =
        currentlyHidden.size === allOtherKeys.length &&
        allOtherKeys.every((k) => currentlyHidden.has(k));

      if (isAlreadySoloed && previousHidden !== null) {
        setHiddenSeries(previousHidden);
        setPreviousHidden(null);
      } else {
        setPreviousHidden(new Set(currentlyHidden));
        setHiddenSeries(new Set(allOtherKeys));
      }
    },
    [series, hiddenSeries, previousHidden],
  );

  // ─── Config panel ──────────────────────────────────────────────────────────

  const handleConfigChange = useCallback(
    (newConfig: ChartConfig) => {
      setInternalConfig(newConfig);
      onConfigChange?.(newConfig);
    },
    [onConfigChange],
  );

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={`${classes.root}${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel ?? t('chart.ariaLabel')}
        aria-busy="true"
      >
        <div className={classes.loadingContainer}>
          <Skeleton
            height={effectiveConfig.height}
            radius="md"
            aria-label={t('chart.loading.ariaLabel')}
          />
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div
        className={`${classes.root}${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel ?? t('chart.ariaLabel')}
        role="alert"
      >
        <div
          className={classes.errorContainer}
          style={{ minHeight: effectiveConfig.height }}
        >
          <IconAlertCircle
            size={32}
            className={classes.errorIcon}
            aria-hidden="true"
          />
          <p className={classes.errorMessage}>{error}</p>
          {onRetry && (
            <Button size="xs" variant="light" onClick={onRetry}>
              {t('chart.error.retry')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (data.length === 0) {
    return (
      <div
        className={`${classes.root}${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel ?? t('chart.ariaLabel')}
      >
        <div
          className={classes.emptyContainer}
          style={{ minHeight: effectiveConfig.height }}
        >
          <EmptyState
            icon={<IconChartLine />}
            message={t('chart.empty.message')}
          />
        </div>
      </div>
    );
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  const isSparkline = type === 'sparkline';
  const showLegend = effectiveConfig.showLegend && !isSparkline && series.length > 0;
  const legendPosition = effectiveConfig.legendPosition;
  const isLegendVertical = legendPosition === 'left' || legendPosition === 'right';

  const chartHeight = isSparkline
    ? Math.min(effectiveConfig.height, DEFAULT_HEIGHT_FULL)
    : effectiveConfig.height;

  return (
    <div
      className={`${classes.root}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel ?? t('chart.ariaLabel')}
      role="img"
    >
      {/* ─── Legend top ─────────────────────────────────────────────────────── */}
      {showLegend && legendPosition === 'top' && (
        <ChartLegend
          series={series}
          resolvedColors={resolvedColors}
          hiddenSeries={hiddenSeries}
          position="top"
          onToggle={handleLegendToggle}
          onSolo={handleLegendSolo}
        />
      )}

      {/* ─── Chart wrapper (flex for left/right legends) ──────────────────── */}
      <div
        style={{
          display: isLegendVertical ? 'flex' : 'block',
          flex: 1,
        }}
      >
        {/* Legend left — inside flex container so it participates in horizontal layout */}
        {showLegend && legendPosition === 'left' && (
          <ChartLegend
            series={series}
            resolvedColors={resolvedColors}
            hiddenSeries={hiddenSeries}
            position="left"
            onToggle={handleLegendToggle}
            onSolo={handleLegendSolo}
          />
        )}

        <div className={classes.chartArea} style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartRenderer
              type={type}
              data={data}
              visibleSeries={visibleSeries}
              allSeries={series}
              hiddenSeries={hiddenSeries}
              resolvedColors={resolvedColors}
              effectiveConfig={effectiveConfig}
              strokeWidth={strokeWidth}
              reducedMotion={reducedMotion}
              chartElements={chartElements}
            />
          </ResponsiveContainer>

          {/* Config gear button — shown unless sparkline */}
          {!isSparkline && onConfigChange && (
            <button
              type="button"
              className={classes.configButton}
              onClick={() => setConfigPanelOpen((prev) => !prev)}
              aria-label={t('chart.config.openAriaLabel')}
              aria-expanded={configPanelOpen}
              aria-haspopup="dialog"
            >
              <IconSettings size={16} aria-hidden="true" />
            </button>
          )}

          {/* Config panel */}
          {configPanelOpen && onConfigChange && (
            <ChartConfigPanel
              config={internalConfig}
              currentType={type}
              onConfigChange={handleConfigChange}
              onClose={() => setConfigPanelOpen(false)}
            />
          )}
        </div>

        {/* Legend right */}
        {showLegend && legendPosition === 'right' && (
          <ChartLegend
            series={series}
            resolvedColors={resolvedColors}
            hiddenSeries={hiddenSeries}
            position="right"
            onToggle={handleLegendToggle}
            onSolo={handleLegendSolo}
          />
        )}
      </div>

      {/* ─── Legend bottom ──────────────────────────────────────────────────── */}
      {showLegend && legendPosition === 'bottom' && (
        <ChartLegend
          series={series}
          resolvedColors={resolvedColors}
          hiddenSeries={hiddenSeries}
          position="bottom"
          onToggle={handleLegendToggle}
          onSolo={handleLegendSolo}
        />
      )}
    </div>
  );
}

// Suppress the unused import warning — RechartsLegend is intentionally NOT used
// (we use our custom ChartLegend), but importing it prevents tree-shaker issues
// with some recharts versions.
void RechartsLegend;

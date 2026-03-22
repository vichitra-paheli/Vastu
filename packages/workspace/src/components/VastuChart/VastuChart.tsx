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

import React, { useState, useCallback, useMemo } from 'react';
import { Skeleton, Button } from '@mantine/core';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend as RechartsLegend,
} from 'recharts';
import { IconAlertCircle, IconSettings, IconChartLine } from '@tabler/icons-react';

import type { VastuChartProps, ChartConfig, SeriesConfig, ChartDataPoint } from './types';
import { getSeriesColor } from './chartColors';
import { ChartTooltip } from './ChartTooltip';
import { ChartLegend } from './ChartLegend';
import { ChartConfigPanel } from './ChartConfigPanel';
import { EmptyState } from '../EmptyState';
import { t } from '../../lib/i18n';
import classes from './VastuChart.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default chart height for inline usage. */
const DEFAULT_HEIGHT = 240;

/** Default chart height for full-width usage. */
const DEFAULT_HEIGHT_FULL = 360;

/** Donut inner radius ratio relative to outer. */
const DONUT_INNER_RADIUS_RATIO = 0.6;

/** Area fill opacity per SS10.5. */
const AREA_FILL_OPACITY = 0.08;

/** Active dot radius per SS10.5. Dots are hidden by default (r:0), shown on hover. */
const ACTIVE_DOT_RADIUS = 5;

/** Bar corner radius per SS10.5. */
const BAR_CORNER_RADIUS = 2;

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
 * Check if prefers-reduced-motion is active.
 * Returns true in SSR (conservative default).
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── Shared axis/grid props ────────────────────────────────────────────────

const AXIS_TICK_STYLE = {
  fontFamily: 'var(--v-font-sans)',
  fontSize: 11, // --v-text-xs
  fill: 'var(--v-text-tertiary)',
  fontWeight: 400,
};

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
  React.useEffect(() => {
    setInternalConfig(config);
  }, [config]);

  const resolvedColors = useMemo(() => resolveSeriesColors(series), [series]);

  const reducedMotion = prefersReducedMotion();

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
      // If this series is currently the only visible one, restore all
      const allOtherKeys = series
        .filter((s) => s.dataKey !== dataKey)
        .map((s) => s.dataKey);
      const currentlyHidden = hiddenSeries;

      const isAlreadySoloed =
        currentlyHidden.size === allOtherKeys.length &&
        allOtherKeys.every((k) => currentlyHidden.has(k));

      if (isAlreadySoloed && previousHidden !== null) {
        // Restore previous hidden state
        setHiddenSeries(previousHidden);
        setPreviousHidden(null);
      } else {
        // Save current hidden state and solo this series
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

  // ─── Shared chart children ────────────────────────────────────────────────

  const cartesianGridEl = (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="var(--v-border-subtle)"
      vertical={false}
    />
  );

  const xAxisEl = effectiveConfig.showAxisLabels ? (
    <XAxis
      dataKey={effectiveConfig.xAxisKey}
      tick={AXIS_TICK_STYLE}
      axisLine={{ stroke: 'var(--v-border-default)' }}
      tickLine={false}
      label={
        effectiveConfig.xAxisLabel
          ? {
              value: effectiveConfig.xAxisLabel,
              position: 'insideBottom',
              offset: -4,
              style: { ...AXIS_TICK_STYLE, fill: 'var(--v-text-secondary)' },
            }
          : undefined
      }
    />
  ) : (
    <XAxis dataKey={effectiveConfig.xAxisKey} hide />
  );

  const yAxisEl = effectiveConfig.showAxisLabels ? (
    <YAxis
      scale={effectiveConfig.scaleType === 'log' ? 'log' : 'auto'}
      tick={AXIS_TICK_STYLE}
      axisLine={{ stroke: 'var(--v-border-default)' }}
      tickLine={false}
      width={40}
      label={
        effectiveConfig.yAxisLabel
          ? {
              value: effectiveConfig.yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { ...AXIS_TICK_STYLE, fill: 'var(--v-text-secondary)' },
            }
          : undefined
      }
    />
  ) : (
    <YAxis hide />
  );

  const tooltipEl = (
    <Tooltip
      content={(props) => (
        <ChartTooltip
          active={props.active}
          payload={props.payload}
          label={props.label}
          series={series}
          resolvedColors={resolvedColors}
        />
      )}
      isAnimationActive={!reducedMotion}
    />
  );

  const referenceLineEls = effectiveConfig.referenceLines.map((rl, i) => (
    <ReferenceLine
      key={i}
      y={rl.y}
      x={rl.x}
      stroke={rl.color ?? 'var(--v-border-default)'}
      strokeDasharray="4 4"
      label={rl.label}
    />
  ));

  // ─── Chart renderers ──────────────────────────────────────────────────────

  function renderLineChart() {
    return (
      <LineChart data={data as ChartDataPoint[]}>
        {cartesianGridEl}
        {xAxisEl}
        {yAxisEl}
        {tooltipEl}
        {referenceLineEls}
        {visibleSeries.map((s) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={resolvedColors[s.dataKey]}
            strokeWidth={strokeWidth}
            dot={{ r: 0 }}
            activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
            isAnimationActive={!reducedMotion}
          />
        ))}
      </LineChart>
    );
  }

  function renderBarChart() {
    return (
      <BarChart data={data as ChartDataPoint[]}>
        {cartesianGridEl}
        {xAxisEl}
        {yAxisEl}
        {tooltipEl}
        {referenceLineEls}
        {visibleSeries.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name}
            fill={resolvedColors[s.dataKey]}
            radius={[BAR_CORNER_RADIUS, BAR_CORNER_RADIUS, 0, 0]}
            stackId={effectiveConfig.stacked ? 'stack' : undefined}
            isAnimationActive={!reducedMotion}
          />
        ))}
      </BarChart>
    );
  }

  function renderAreaChart() {
    return (
      <AreaChart data={data as ChartDataPoint[]}>
        {cartesianGridEl}
        {xAxisEl}
        {yAxisEl}
        {tooltipEl}
        {referenceLineEls}
        {visibleSeries.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name}
            stroke={resolvedColors[s.dataKey]}
            fill={resolvedColors[s.dataKey]}
            fillOpacity={AREA_FILL_OPACITY}
            strokeWidth={strokeWidth}
            dot={false}
            activeDot={{ r: ACTIVE_DOT_RADIUS, strokeWidth: 0 }}
            stackId={effectiveConfig.stacked ? 'stack' : undefined}
            isAnimationActive={!reducedMotion}
          />
        ))}
      </AreaChart>
    );
  }

  function renderDonutChart() {
    // Donut uses a single Pie with Cell per series
    // Data format for donut: each series maps to a pie slice
    // We aggregate the first numeric value from each series across all data points
    const donutData = series.map((s) => {
      const total = data.reduce((sum, d) => {
        const val = d[s.dataKey];
        return sum + (typeof val === 'number' ? val : 0);
      }, 0);
      return { name: s.name, value: total, dataKey: s.dataKey };
    });

    const visibleDonutData = donutData.filter((d) => !hiddenSeries.has(d.dataKey));
    const outerRadius = Math.min(effectiveConfig.height / 2 - 16, 120);
    const innerRadius = outerRadius * DONUT_INNER_RADIUS_RATIO;

    return (
      <PieChart>
        <Pie
          data={visibleDonutData}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          nameKey="name"
          isAnimationActive={!reducedMotion}
        >
          {visibleDonutData.map((entry) => (
            <Cell
              key={entry.dataKey}
              fill={resolvedColors[entry.dataKey]}
            />
          ))}
        </Pie>
        <Tooltip
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload}
              label={props.label}
              series={series}
              resolvedColors={resolvedColors}
            />
          )}
          isAnimationActive={!reducedMotion}
        />
      </PieChart>
    );
  }

  function renderSparklineChart() {
    // Sparkline: minimal line chart — no axes, legend, or grid
    const firstSeries = visibleSeries[0] ?? series[0];
    if (!firstSeries) return null;

    return (
      <LineChart data={data as ChartDataPoint[]}>
        <Line
          type="monotone"
          dataKey={firstSeries.dataKey}
          stroke={resolvedColors[firstSeries.dataKey]}
          strokeWidth={strokeWidth}
          dot={false}
          isAnimationActive={!reducedMotion}
        />
      </LineChart>
    );
  }

  function renderScatterChart() {
    return (
      <ScatterChart>
        <CartesianGrid stroke="var(--v-border-subtle)" strokeDasharray="3 3" />
        {xAxisEl}
        {yAxisEl}
        {tooltipEl}
        {visibleSeries.map((s) => {
          const xKey = s.xDataKey ?? effectiveConfig.xAxisKey;
          // Transform data for scatter: each point needs x and y keys
          const scatterData = (data as ChartDataPoint[]).map((d) => ({
            x: d[xKey],
            y: d[s.dataKey],
          }));

          return (
            <Scatter
              key={s.dataKey}
              name={s.name}
              data={scatterData}
              fill={resolvedColors[s.dataKey]}
              isAnimationActive={!reducedMotion}
            />
          );
        })}
      </ScatterChart>
    );
  }

  // ─── Chart selector ───────────────────────────────────────────────────────

  function renderChart() {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'area':
        return renderAreaChart();
      case 'donut':
        return renderDonutChart();
      case 'sparkline':
        return renderSparklineChart();
      case 'scatter':
        return renderScatterChart();
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
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
      {/* ─── Legend top / left ────────────────────────────────────────────── */}
      {showLegend && (legendPosition === 'top' || legendPosition === 'left') && (
        <ChartLegend
          series={series}
          resolvedColors={resolvedColors}
          hiddenSeries={hiddenSeries}
          position={legendPosition}
          onToggle={handleLegendToggle}
          onSolo={handleLegendSolo}
        />
      )}

      {/* ─── Chart wrapper ────────────────────────────────────────────────── */}
      <div
        style={{
          display: isLegendVertical ? 'flex' : 'block',
          flex: 1,
        }}
      >
        {/* Legend left */}
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
            {renderChart() ?? <div />}
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

      {/* ─── Legend bottom ────────────────────────────────────────────────── */}
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

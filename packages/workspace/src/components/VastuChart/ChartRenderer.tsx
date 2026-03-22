'use client';

/**
 * ChartRenderer — renders the correct Recharts chart based on `type`.
 *
 * Extracted from VastuChart to keep each file focused.
 * Handles: line, bar, area, donut, sparkline, scatter.
 *
 * Implements US-135 AC-2.
 */

import React from 'react';
import {
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
  Tooltip,
} from 'recharts';

import type {
  ChartType,
  SeriesConfig,
  ChartDataPoint,
  ChartConfig,
} from './types';
import type { ChartElements } from './useChartElements';
import { ChartTooltip } from './ChartTooltip';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Area fill opacity per SS10.5. */
const AREA_FILL_OPACITY = 0.08;

/** Active dot radius per SS10.5. */
const ACTIVE_DOT_RADIUS = 5;

/** Bar corner radius per SS10.5. */
const BAR_CORNER_RADIUS = 2;

/** Donut inner radius ratio relative to outer. */
const DONUT_INNER_RADIUS_RATIO = 0.6;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ChartRendererProps {
  type: ChartType;
  data: ChartDataPoint[];
  visibleSeries: SeriesConfig[];
  allSeries: SeriesConfig[];
  hiddenSeries: Set<string>;
  resolvedColors: Record<string, string>;
  effectiveConfig: Required<ChartConfig>;
  strokeWidth: number;
  reducedMotion: boolean;
  chartElements: ChartElements;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChartRenderer({
  type,
  data,
  visibleSeries,
  allSeries,
  hiddenSeries,
  resolvedColors,
  effectiveConfig,
  strokeWidth,
  reducedMotion,
  chartElements,
}: ChartRendererProps) {
  const { cartesianGridEl, xAxisEl, yAxisEl, tooltipEl, referenceLineEls } = chartElements;

  switch (type) {
    case 'line':
      return (
        <LineChart data={data}>
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

    case 'bar':
      return (
        <BarChart data={data}>
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

    case 'area':
      return (
        <AreaChart data={data}>
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

    case 'donut': {
      // Aggregate values across data points per series for pie slices
      const donutData = allSeries.map((s) => {
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
                series={allSeries}
                resolvedColors={resolvedColors}
              />
            )}
            isAnimationActive={!reducedMotion}
          />
        </PieChart>
      );
    }

    case 'sparkline': {
      // Minimal line: first visible series, no axes/grid/legend
      const firstSeries = visibleSeries[0] ?? allSeries[0];
      if (!firstSeries) return <div />;
      return (
        <LineChart data={data}>
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

    case 'scatter': {
      return (
        <ScatterChart>
          {cartesianGridEl}
          {xAxisEl}
          {yAxisEl}
          {tooltipEl}
          {visibleSeries.map((s) => {
            const xKey = s.xDataKey ?? effectiveConfig.xAxisKey;
            const scatterData = data.map((d) => ({
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

    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

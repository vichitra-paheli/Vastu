'use client';

/**
 * useChartElements — builds shared Recharts axis/grid/tooltip elements.
 *
 * Extracted from VastuChart to keep the main component under 200 lines.
 * Returns ready-to-render JSX for CartesianGrid, XAxis, YAxis, Tooltip,
 * and ReferenceLine elements that are shared across chart types.
 *
 * Implements US-135.
 */

import React from 'react';
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

import type { SeriesConfig, ChartConfig, ReferenceLineConfig } from './types';
import { ChartTooltip } from './ChartTooltip';

const AXIS_TICK_STYLE = {
  fontFamily: 'var(--v-font-sans)',
  fontSize: 11,
  fill: 'var(--v-text-tertiary)',
  fontWeight: 400,
};

interface UseChartElementsOptions {
  effectiveConfig: Required<ChartConfig>;
  series: SeriesConfig[];
  resolvedColors: Record<string, string>;
  reducedMotion: boolean;
}

export interface ChartElements {
  cartesianGridEl: React.ReactElement;
  xAxisEl: React.ReactElement;
  yAxisEl: React.ReactElement;
  tooltipEl: React.ReactElement;
  referenceLineEls: React.ReactElement[];
}

export function useChartElements({
  effectiveConfig,
  series,
  resolvedColors,
  reducedMotion,
}: UseChartElementsOptions): ChartElements {
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

  const referenceLineEls = (effectiveConfig.referenceLines as ReferenceLineConfig[]).map(
    (rl) => {
      const key = `rl-${rl.x ?? ''}-${rl.y ?? ''}-${rl.label ?? ''}`;
      return (
        <ReferenceLine
          key={key}
          y={rl.y}
          x={rl.x}
          stroke={rl.color ?? 'var(--v-border-default)'}
          strokeDasharray="4 4"
          label={rl.label}
        />
      );
    },
  );

  return { cartesianGridEl, xAxisEl, yAxisEl, tooltipEl, referenceLineEls };
}

'use client';

/**
 * ChartRow — 1 or 2 VastuCharts displayed side by side.
 *
 * Chart type comes from config (line/area/bar/donut).
 * When two charts are configured, renders a dual-column grid.
 *
 * Implements US-130.
 */

import React from 'react';
import { Skeleton } from '@mantine/core';
import { VastuChart } from '../../components/VastuChart';
import { TruncatedText } from '../../components/TruncatedText';
import { t } from '../../lib/i18n';
import type { ChartType, ChartDataPoint, SeriesConfig, ChartConfig } from '../../components/VastuChart';
import classes from './SummaryDashboardTemplate.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChartDefinition {
  /** Unique chart identifier. */
  id: string;
  /** Human-readable chart title. */
  title: string;
  /** Chart render type. */
  type: ChartType;
  /** Data points for the chart. */
  data: ChartDataPoint[];
  /** Series definitions. */
  series: SeriesConfig[];
  /** Chart configuration overrides. */
  config?: ChartConfig;
}

export interface ChartRowProps {
  charts: ChartDefinition[];
  loading?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default number of skeleton chart cards to render while loading. */
const DEFAULT_SKELETON_COUNT = 1;

// ── Chart Card ────────────────────────────────────────────────────────────────

interface ChartCardProps {
  chart: ChartDefinition;
}

function ChartCard({ chart }: ChartCardProps) {
  return (
    <div className={classes.chartCard}>
      <div className={classes.chartTitle}>
        <TruncatedText>{chart.title}</TruncatedText>
      </div>
      <VastuChart
        type={chart.type}
        data={chart.data}
        series={chart.series}
        config={chart.config}
        ariaLabel={t('dashboard.chart.ariaLabel', { title: chart.title })}
      />
    </div>
  );
}

// ── ChartRow ──────────────────────────────────────────────────────────────────

export function ChartRow({ charts, loading }: ChartRowProps) {
  if (loading) {
    // Use the known chart count when available, otherwise fall back to the
    // default skeleton count. This prevents a mismatch where charts=[] would
    // produce 0 skeletons (nothing visible) via Math.max(0, 0).
    const skeletonCount = charts.length > 0 ? Math.min(charts.length, 2) : DEFAULT_SKELETON_COUNT;
    const skeletonRowClass = skeletonCount >= 2 ? classes.chartRowDual : classes.chartRow;
    return (
      <div className={skeletonRowClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className={classes.chartCard} aria-busy="true" role="status">
            <Skeleton height={14} width="40%" radius="sm" mb="sm" />
            <Skeleton height={240} radius="md" />
          </div>
        ))}
      </div>
    );
  }

  if (charts.length === 0) return null;

  const rowClass = charts.length >= 2 ? classes.chartRowDual : classes.chartRow;

  return (
    <div className={rowClass} role="region" aria-label={t('dashboard.chart.rowAriaLabel')}>
      {charts.slice(0, 2).map((chart) => (
        <ChartCard key={chart.id} chart={chart} />
      ))}
    </div>
  );
}

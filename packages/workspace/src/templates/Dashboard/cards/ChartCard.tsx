'use client';

/**
 * ChartCard — dashboard mini chart card.
 *
 * Renders a VastuChart with configurable type (line/bar/area/donut).
 * Uses VastuChart wrapper — never raw Recharts.
 *
 * Implements US-137 AC-4.
 */

import React from 'react';
import { VastuChart } from '../../../components/VastuChart';
import { t } from '../../../lib/i18n';
import type { ChartCardDef, DashboardChartDataPoint } from '../../../stores/dashboardStore';

export interface DashboardChartCardProps {
  card: ChartCardDef;
}

const PLACEHOLDER_DATA: DashboardChartDataPoint[] = [
  { value: 10 },
  { value: 20 },
  { value: 15 },
  { value: 30 },
  { value: 25 },
];

const PLACEHOLDER_SERIES = [{ dataKey: 'value', name: 'Value' }];

export function DashboardChartCard({ card }: DashboardChartCardProps) {
  const chartType = card.chartType ?? 'line';
  const data = (card.data && card.data.length > 0) ? card.data : PLACEHOLDER_DATA;
  const series = (card.series && card.series.length > 0) ? card.series : PLACEHOLDER_SERIES;

  return (
    <VastuChart
      type={chartType}
      data={data}
      series={series}
      config={{ height: 160, showLegend: false, showAxisLabels: false }}
      ariaLabel={t('dashboard.chart.ariaLabel', { title: card.title })}
    />
  );
}

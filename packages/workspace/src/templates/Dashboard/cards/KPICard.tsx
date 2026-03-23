'use client';

/**
 * KPICard — dashboard KPI card with value, delta, and sparkline.
 *
 * Shows:
 * - Metric label (small caps, secondary)
 * - Large numeric value
 * - Delta badge (positive/negative/neutral)
 * - Optional sparkline via VastuChart type="sparkline"
 *
 * Implements US-137 AC-4.
 */

import React from 'react';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { VastuChart } from '../../../components/VastuChart';
import { t } from '../../../lib/i18n';
import type { KPICardDef } from '../../../stores/dashboardStore';
import classes from '../DashboardTemplate.module.css';

export interface DashboardKPICardProps {
  card: KPICardDef;
}

function getDeltaDirection(delta: string): 'positive' | 'negative' | 'neutral' {
  if (delta.startsWith('+')) return 'positive';
  if (delta.startsWith('-')) return 'negative';
  return 'neutral';
}

export function DashboardKPICard({ card }: DashboardKPICardProps) {
  const value = card.value ?? '—';
  const hasSparkline = Array.isArray(card.sparklineData) && card.sparklineData.length > 0;
  const hasDelta = typeof card.delta === 'string' && card.delta.length > 0;
  const deltaDirection = hasDelta ? getDeltaDirection(card.delta!) : 'neutral';

  const deltaClass =
    deltaDirection === 'positive'
      ? classes.kpiDeltaPositive
      : deltaDirection === 'negative'
        ? classes.kpiDeltaNegative
        : classes.kpiDeltaNeutral;

  const DeltaIcon =
    deltaDirection === 'positive'
      ? IconTrendingUp
      : deltaDirection === 'negative'
        ? IconTrendingDown
        : IconMinus;

  return (
    <>
      <div
        className={classes.kpiValue}
        aria-label={t('dashboard.kpi.valueAriaLabel', { value })}
      >
        {value}
      </div>

      {hasDelta && (
        <div
          className={`${classes.kpiDelta} ${deltaClass}`}
          aria-label={t('dashboard.kpi.deltaAriaLabel', { delta: card.delta! })}
        >
          <DeltaIcon size={12} aria-hidden="true" />
          <span>{card.delta}</span>
        </div>
      )}

      {hasSparkline && (
        <div className={classes.kpiSparkline}>
          <VastuChart
            type="sparkline"
            data={card.sparklineData!}
            series={[{ dataKey: 'value', name: card.title }]}
            config={{ height: 40, showLegend: false, showAxisLabels: false }}
            ariaLabel={t('dashboard.kpi.sparklineAriaLabel', { label: card.title })}
          />
        </div>
      )}
    </>
  );
}

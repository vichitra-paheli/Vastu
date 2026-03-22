'use client';

/**
 * KPICard — shared metric card with label, value, optional delta, and optional sparkline.
 *
 * Design system compliance:
 * - Label: --v-text-secondary, font-weight 400
 * - Value: --v-text-2xl, font-weight 500
 * - Delta positive: --v-status-success
 * - Delta negative: --v-status-error
 * - Background: --v-bg-surface
 * - Border: --v-border-default
 * - Loading: Skeleton pattern (skeleton → content)
 * - All colors via --v-* tokens, never hardcoded hex
 *
 * Implements US-129b.
 */

import React from 'react';
import { Skeleton, Stack } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { VastuChart } from '../VastuChart/VastuChart';
import type { ChartDataPoint, SeriesConfig } from '../VastuChart/types';
import { t } from '../../lib/i18n';
import classes from './KPICard.module.css';

export interface KPICardSparklineData {
  /** Data points for the sparkline. Each point has at minimum an x value and a value field. */
  data: ChartDataPoint[];
  /** The data key to use for the sparkline value axis. */
  dataKey: string;
}

export interface KPICardProps {
  /** Short label above the value (e.g. "Total Revenue"). */
  label: string;
  /** Formatted value to display prominently (e.g. "$12,340"). */
  value: string;
  /**
   * Optional delta value as a formatted string (e.g. "+5.2%").
   * Positive values (starting with "+") are green; negative (starting with "-") are red;
   * zero/neutral get a neutral indicator.
   */
  delta?: string;
  /** Optional sparkline data shown below the value. */
  sparkline?: KPICardSparklineData;
  /** True while data is loading — shows skeleton. */
  loading?: boolean;
  /** Additional CSS class for the card container. */
  className?: string;
}

/** Determine the delta direction from the delta string. */
function getDeltaDirection(delta: string): 'positive' | 'negative' | 'neutral' {
  if (delta.startsWith('+')) return 'positive';
  if (delta.startsWith('-')) return 'negative';
  return 'neutral';
}

/**
 * KPICard renders a single metric tile with an optional trend indicator and sparkline.
 *
 * Loading: shows Skeleton placeholders until loading is false.
 * Delta arrows: up arrow for positive, down arrow for negative, dash for neutral.
 */
export function KPICard({ label, value, delta, sparkline, loading = false, className }: KPICardProps) {
  if (loading) {
    return (
      <div
        className={`${classes.root}${className ? ` ${className}` : ''}`}
        role="status"
        aria-label={t('kpiCard.loading')}
        aria-busy="true"
      >
        <Skeleton height={14} width="60%" radius="sm" mb={8} />
        <Skeleton height={32} width="80%" radius="sm" mb={8} />
        <Skeleton height={12} width="40%" radius="sm" />
      </div>
    );
  }

  const deltaDirection = delta ? getDeltaDirection(delta) : 'neutral';
  const deltaClass =
    deltaDirection === 'positive'
      ? classes.deltaPositive
      : deltaDirection === 'negative'
        ? classes.deltaNegative
        : classes.deltaNeutral;

  const sparklineSeries: SeriesConfig[] = sparkline
    ? [{ dataKey: sparkline.dataKey, name: '' }]
    : [{ dataKey: 'value', name: '' }];

  return (
    <div
      className={`${classes.root}${className ? ` ${className}` : ''}`}
      role="region"
      aria-label={`${label}: ${value}${delta ? `, ${delta}` : ''}`}
    >
      <Stack gap={4}>
        <span className={classes.label}>{label}</span>
        <span className={classes.value}>{value}</span>

        {delta && (
          <span className={`${classes.delta} ${deltaClass}`} aria-label={t('kpiCard.delta.ariaLabel').replace('{delta}', delta)}>
            {deltaDirection === 'positive' && (
              <IconTrendingUp size={14} aria-hidden="true" className={classes.deltaIcon} />
            )}
            {deltaDirection === 'negative' && (
              <IconTrendingDown size={14} aria-hidden="true" className={classes.deltaIcon} />
            )}
            {deltaDirection === 'neutral' && (
              <IconMinus size={14} aria-hidden="true" className={classes.deltaIcon} />
            )}
            {delta}
          </span>
        )}

        {sparkline && sparkline.data.length > 0 && (
          <div className={classes.sparkline} aria-hidden="true">
            <VastuChart
              type="sparkline"
              data={sparkline.data}
              series={sparklineSeries}
              config={{ height: 40 }}
            />
          </div>
        )}
      </Stack>
    </div>
  );
}

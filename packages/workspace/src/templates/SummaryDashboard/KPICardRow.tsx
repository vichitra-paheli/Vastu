'use client';

/**
 * KPICardRow — row of KPI metric cards with optional sparklines.
 *
 * Each card shows:
 * - Label (small caps, secondary color)
 * - Value (2xl font, primary color)
 * - Delta badge (positive/negative/neutral with vs-period comparison)
 * - Optional sparkline via VastuChart type="sparkline"
 *
 * Skeleton state per card while loading.
 * Implements US-130.
 */

import React from 'react';
import { Skeleton } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { VastuChart } from '../../components/VastuChart';
import { TruncatedText } from '../../components/TruncatedText';
import { t } from '../../lib/i18n';
import type { ChartDataPoint, SeriesConfig } from '../../components/VastuChart';
import classes from './SummaryDashboardTemplate.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KPICardConfig {
  /** Unique identifier for the card. */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Formatted value string (e.g. "$12,340"). */
  value: string;
  /**
   * Numeric delta percentage vs previous period (e.g. 5.2 = +5.2%).
   * Undefined when comparison is disabled.
   */
  delta?: number;
  /** Optional sparkline data. */
  sparklineData?: ChartDataPoint[];
  /** Data key used in sparkline series (defaults to 'value'). */
  sparklineKey?: string;
}

export interface KPICardRowProps {
  cards: KPICardConfig[];
  loading?: boolean;
  /** Show delta badges (comparison period active). */
  showDelta?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDelta(delta: number): string {
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta.toFixed(1)}%`;
}

// ── KPICard ───────────────────────────────────────────────────────────────────

interface KPICardProps {
  card: KPICardConfig;
  loading?: boolean;
  showDelta?: boolean;
}

const SPARKLINE_FALLBACK_SERIES: SeriesConfig[] = [{ dataKey: 'value', name: 'Value' }];

function KPICard({ card, loading, showDelta }: KPICardProps) {
  if (loading) {
    return (
      <div
        className={classes.kpiCardSkeleton}
        aria-busy="true"
        role="status"
        aria-label={t('dashboard.kpi.rowLoadingAriaLabel')}
      >
        <Skeleton height={12} width="50%" radius="sm" mb="xs" />
        <Skeleton height={28} width="70%" radius="sm" mb="xs" />
        <Skeleton height={10} width="40%" radius="sm" />
      </div>
    );
  }

  const hasDelta = showDelta && card.delta !== undefined;
  const deltaValue = card.delta ?? 0;
  const isPositive = deltaValue > 0;
  const isNegative = deltaValue < 0;

  const deltaClass = isPositive
    ? classes.kpiDeltaPositive
    : isNegative
      ? classes.kpiDeltaNegative
      : classes.kpiDeltaNeutral;

  const DeltaIcon = isPositive ? IconTrendingUp : isNegative ? IconTrendingDown : IconMinus;

  const sparklineSeries: SeriesConfig[] =
    card.sparklineKey
      ? [{ dataKey: card.sparklineKey, name: card.label }]
      : SPARKLINE_FALLBACK_SERIES;

  return (
    <div
      className={classes.kpiCard}
      role="region"
      aria-label={`${card.label}: ${card.value}`}
    >
      <div className={classes.kpiLabel}>
        <TruncatedText>{card.label}</TruncatedText>
      </div>

      <div className={classes.kpiValue}>
        {card.value}
      </div>

      {hasDelta && (
        <div
          className={`${classes.kpiDelta} ${deltaClass}`}
          aria-label={t('dashboard.kpi.deltaAriaLabel', { delta: formatDelta(deltaValue) })}
        >
          <DeltaIcon size={12} aria-hidden="true" />
          <span>
            {formatDelta(deltaValue)}{' '}
            {t('dashboard.kpi.vsLabel')}
          </span>
        </div>
      )}

      {card.sparklineData && card.sparklineData.length > 0 && (
        <div className={classes.kpiSparkline}>
          <VastuChart
            type="sparkline"
            data={card.sparklineData}
            series={sparklineSeries}
            config={{ height: 40, showLegend: false, showAxisLabels: false }}
            ariaLabel={t('dashboard.kpi.sparklineAriaLabel', { label: card.label })}
          />
        </div>
      )}
    </div>
  );
}

// ── KPICardRow ────────────────────────────────────────────────────────────────

const DEFAULT_LOADING_CARDS = 4;

export function KPICardRow({ cards, loading, showDelta }: KPICardRowProps) {
  if (loading) {
    return (
      <div className={classes.kpiRow} role="status" aria-label={t('dashboard.kpi.rowLoadingAriaLabel')}>
        {Array.from({ length: DEFAULT_LOADING_CARDS }).map((_, i) => (
          <KPICard
            key={`skeleton-${i}`}
            card={{ id: `skeleton-${i}`, label: '', value: '' }}
            loading
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={classes.kpiRow}
      role="list"
      aria-label={t('dashboard.kpi.rowAriaLabel')}
    >
      {cards.map((card) => (
        <div key={card.id} role="listitem">
          <KPICard card={card} showDelta={showDelta} />
        </div>
      ))}
    </div>
  );
}

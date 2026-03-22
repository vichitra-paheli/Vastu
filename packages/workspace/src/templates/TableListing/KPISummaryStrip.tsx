'use client';

/**
 * KPISummaryStrip — row of KPI metric cards above the table.
 *
 * Toggleable via config.summaryStrip.enabled.
 * Each card: label, value, optional delta (green/red), optional sparkline.
 * Loading: delegates to KPICard's built-in skeleton state.
 *
 * Design system:
 * - Cards separated by --v-space-3 gap
 * - Background: --v-bg-surface per card
 * - Strip padding: --v-space-3 horizontal, --v-space-2 vertical
 * - Border bottom: --v-border-subtle separates strip from table
 *
 * Implements US-129b.
 */

import React from 'react';
import { Group } from '@mantine/core';
import { KPICard } from '../../components/KPICard/KPICard';
import type { KPICardProps } from '../../components/KPICard/KPICard';
import { t } from '../../lib/i18n';
import classes from './TableListingTemplate.module.css';

export interface KPIMetric {
  /** Unique identifier for this metric. */
  id: string;
  /** Short label shown above the value. */
  label: string;
  /** Formatted metric value (e.g. "1,234" or "$45,678"). */
  value: string;
  /**
   * Optional delta string with sign prefix (e.g. "+5.2%" or "-3.1%").
   * Positive: green. Negative: red. No prefix: neutral grey.
   */
  delta?: string;
  /** Optional sparkline data. */
  sparkline?: KPICardProps['sparkline'];
}

export interface KPISummaryStripProps {
  /** Ordered list of metric cards to display. */
  metrics: KPIMetric[];
  /** True while metric data is loading — shows skeleton cards. */
  loading?: boolean;
}

/** Number of skeleton cards to show during loading. */
const SKELETON_CARD_COUNT = 4;

/**
 * KPISummaryStrip renders a horizontal row of KPI metric cards.
 *
 * Rendered above the table when config.summaryStrip.enabled is true.
 * Each card loads independently — the loading prop shows skeleton placeholders
 * via KPICard's own loading state (no inline skeleton duplication).
 */
export function KPISummaryStrip({ metrics, loading = false }: KPISummaryStripProps) {
  return (
    <div
      className={classes.kpiStrip}
      role="region"
      aria-label={t('tableListing.kpiStrip.ariaLabel')}
    >
      <Group
        gap="sm"
        wrap="nowrap"
        style={{ overflowX: 'auto' }}
        aria-label={t('tableListing.kpiStrip.cardsAriaLabel')}
      >
        {loading
          ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
              <KPICard
                key={i}
                label=""
                value=""
                loading
                className={classes.kpiCard}
              />
            ))
          : metrics.map((metric) => (
              <KPICard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                delta={metric.delta}
                sparkline={metric.sparkline}
                className={classes.kpiCard}
              />
            ))}
      </Group>
    </div>
  );
}

'use client';

/**
 * OverviewTab — two-column field-value grid for entity detail pages.
 *
 * Left column: field-value pairs (similar to DetailsTab in the drawer but full-width).
 * Right/bottom area: sub-tables for related records and activity feed timeline.
 *
 * Follows Patterns Library §6 for per-tab skeleton loading.
 * All colors via --v-* CSS custom properties.
 * All strings via t('key').
 *
 * Implements US-131b.
 */

import React from 'react';
import { Skeleton, Stack } from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';
import { TruncatedText } from '../../../components/TruncatedText';
import { VastuTable } from '../../../components/VastuTable/VastuTable';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import type { VastuColumn } from '../../../components/VastuTable/types';
import { t } from '../../../lib/i18n';
import classes from './OverviewTab.module.css';

// ── Field-value types ────────────────────────────────────────────────────────

export interface OverviewField {
  /** Unique field identifier. */
  key: string;
  /** Display label. */
  label: string;
  /** Raw value (formatted for display). */
  value: unknown;
}

// ── Sub-table types ──────────────────────────────────────────────────────────

export interface SubTableConfig {
  /** Unique identifier for the sub-table. */
  id: string;
  /** Title shown above the sub-table. */
  title: string;
  /** Columns for VastuTable. */
  columns: VastuColumn<Record<string, unknown>>[];
  /** Data rows for VastuTable. */
  rows: Record<string, unknown>[];
  /** Whether this sub-table is loading. */
  loading?: boolean;
}

// ── Activity types ───────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface OverviewTabProps {
  /** Field-value pairs to display in the fields grid. */
  fields?: OverviewField[];
  /** Sub-table configurations to render below the fields. */
  subTables?: SubTableConfig[];
  /** Recent activity entries for the activity feed. */
  activity?: ActivityEntry[];
  /** Whether the tab content is loading. */
  loading?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format a value for display. Returns a dash for empty/null/undefined. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean')
    return value ? t('overviewTab.field.boolean.true') : t('overviewTab.field.boolean.false');
  return String(value);
}

/**
 * Format an ISO timestamp to a short relative or absolute string.
 *
 * TODO(VASTU-1B-131): Timestamps go stale once rendered. Add a periodic
 * refresh mechanism (e.g. setInterval every 60s or a shared useRelativeTime
 * hook) so relative labels like "5m ago" stay accurate without a full
 * page reload.
 */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return t('overviewTab.activity.justNow');
    if (diffMin < 60)
      return t('overviewTab.activity.minutesAgo', { count: String(diffMin) });
    if (diffHr < 24)
      return t('overviewTab.activity.hoursAgo', { count: String(diffHr) });
    if (diffDay < 7)
      return t('overviewTab.activity.daysAgo', { count: String(diffDay) });

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton for the fields grid while loading. */
function FieldsSkeleton() {
  return (
    <div
      className={classes.fieldsSkeleton}
      aria-label={t('overviewTab.fields.loading')}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={classes.fieldSkeletonRow}>
          <Skeleton height={12} width="35%" radius="sm" />
          <Skeleton height={14} width="55%" radius="sm" />
        </div>
      ))}
    </div>
  );
}

/** Field-value grid section. */
function FieldsGrid({ fields }: { fields: OverviewField[] }) {
  if (fields.length === 0) {
    return (
      <p className={classes.fieldsEmpty}>{t('overviewTab.fields.empty')}</p>
    );
  }

  return (
    <dl className={classes.fieldsGrid} aria-label={t('overviewTab.fields.ariaLabel')}>
      {fields.map((field) => (
        <div key={field.key} className={classes.fieldRow}>
          <dt className={classes.fieldLabel}>
            <TruncatedText>{field.label}</TruncatedText>
          </dt>
          <dd className={classes.fieldValue}>
            <TruncatedText>{formatValue(field.value)}</TruncatedText>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Single sub-table with title and compact VastuTable. */
function SubTableSection({ config }: { config: SubTableConfig }) {
  return (
    <section
      className={classes.subTableSection}
      aria-labelledby={`sub-table-${config.id}-title`}
    >
      <h3
        id={`sub-table-${config.id}-title`}
        className={classes.subTableTitle}
      >
        {config.title}
      </h3>
      <VastuTable
        columns={config.columns}
        data={config.rows}
        loading={config.loading}
        aria-label={config.title}
      />
    </section>
  );
}

/** Activity feed timeline. */
function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<IconActivity />}
        message={t('overviewTab.activity.empty')}
      />
    );
  }

  return (
    <ol className={classes.activityList} aria-label={t('overviewTab.activity.ariaLabel')}>
      {entries.map((entry) => (
        <li key={entry.id} className={classes.activityItem}>
          <span className={classes.activityDot} aria-hidden="true" />
          <div className={classes.activityBody}>
            <div className={classes.activityHeader}>
              <span className={classes.activityActor}>{entry.actor}</span>
              <time
                className={classes.activityTime}
                dateTime={entry.timestamp}
                title={new Date(entry.timestamp).toLocaleString()}
              >
                {formatTimestamp(entry.timestamp)}
              </time>
            </div>
            <p className={classes.activityAction}>{entry.action}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function OverviewTab({
  fields = [],
  subTables = [],
  activity = [],
  loading = false,
}: OverviewTabProps) {
  if (loading) {
    return (
      <div className={classes.root}>
        <FieldsSkeleton />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      {/* Fields section */}
      <section
        className={classes.fieldsSection}
        aria-labelledby="overview-fields-title"
      >
        <h2 id="overview-fields-title" className={classes.sectionTitle}>
          {t('overviewTab.fields.title')}
        </h2>
        <FieldsGrid fields={fields} />
      </section>

      {/* Sub-tables */}
      {subTables.length > 0 && (
        <section
          className={classes.subTablesSection}
          aria-label={t('overviewTab.subTables.ariaLabel')}
        >
          <Stack gap="lg">
            {subTables.map((config) => (
              <SubTableSection key={config.id} config={config} />
            ))}
          </Stack>
        </section>
      )}

      {/* Activity feed */}
      <section
        className={classes.activitySection}
        aria-labelledby="overview-activity-title"
      >
        <h2 id="overview-activity-title" className={classes.sectionTitle}>
          {t('overviewTab.activity.title')}
        </h2>
        <ActivityFeed entries={activity} />
      </section>

    </div>
  );
}

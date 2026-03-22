'use client';

/**
 * SummaryDashboardTemplate — dashboard with KPI cards, charts, and summary tables.
 *
 * Registered as 'summary-dashboard' panel type.
 *
 * Features:
 * - TimeRangeControl: preset dropdown + comparison toggle
 * - KPICardRow: metric cards with sparklines via VastuChart
 * - ChartRow: 1–2 full charts (line/area/bar/donut) from config
 * - MiniSummaryTable: top-N records with "View all" link
 * - Auto-refresh toggle (initial state read from metadata.autoRefreshEnabled)
 * - ViewToolbar active
 * - Loading: TemplateSkeleton variant='summary-dashboard'
 *
 * Zero-config graceful degradation: placeholder cards with "Configure in builder" message.
 *
 * Design system:
 * - SS3 (dashboard patterns), SS10 (charts)
 * - --v-text-2xl for KPI numbers
 * - All colors via --v-* tokens
 *
 * Implements US-130.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Switch, Tooltip, ActionIcon } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { TemplateSkeleton } from '../TemplateSkeleton';
import { ViewToolbar } from '../../components/ViewToolbar';
import { EmptyState } from '../../components/EmptyState';
import { TimeRangeControl } from './TimeRangeControl';
import { KPICardRow } from './KPICardRow';
import { ChartRow } from './ChartRow';
import { MiniSummaryTable } from './MiniSummaryTable';
import { useTemplateConfig } from '../useTemplateConfig';
import { registerTemplate } from '../registry';
import { t } from '../../lib/i18n';
import type { TemplateProps, TemplateConfig } from '../types';
import type { TimeRange } from './TimeRangeControl';
import type { KPICardConfig } from './KPICardRow';
import type { ChartDefinition } from './ChartRow';
import type { MiniTableColumn } from './MiniSummaryTable';
import type { ChartDataPoint } from '../../components/VastuChart';
import classes from './SummaryDashboardTemplate.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

export const SUMMARY_DASHBOARD_PANEL_TYPE = 'summary-dashboard';

/** Default auto-refresh interval in milliseconds (5 minutes). */
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Default time range selection. */
const DEFAULT_TIME_RANGE: TimeRange = {
  preset: '30d',
  compareEnabled: false,
};

// ── Default placeholder data ──────────────────────────────────────────────────

function buildPlaceholderKPICards(): KPICardConfig[] {
  return [
    { id: 'placeholder-1', label: t('dashboard.placeholder.metric1'), value: '—' },
    { id: 'placeholder-2', label: t('dashboard.placeholder.metric2'), value: '—' },
    { id: 'placeholder-3', label: t('dashboard.placeholder.metric3'), value: '—' },
    { id: 'placeholder-4', label: t('dashboard.placeholder.metric4'), value: '—' },
  ];
}

const PLACEHOLDER_SPARKLINE_DATA: ChartDataPoint[] = [
  { value: 0 },
  { value: 0 },
  { value: 0 },
  { value: 0 },
  { value: 0 },
];

// ── Types ─────────────────────────────────────────────────────────────────────

/** Dashboard-specific metadata stored in TemplateConfig.metadata. */
interface DashboardMetadata {
  kpiCards?: KPICardConfig[];
  charts?: ChartDefinition[];
  miniTables?: Array<{
    id: string;
    title: string;
    columns: MiniTableColumn[];
    rows: Array<Record<string, string>>;
    viewAllPageId?: string;
  }>;
  autoRefreshEnabled?: boolean;
  autoRefreshIntervalMs?: number;
}

/**
 * Parse and validate dashboard metadata from the raw config object.
 * Each field is checked individually to avoid an unsafe blanket `as` cast.
 * Unknown or mistyped fields fall back to `undefined` and callers apply defaults.
 */
function parseDashboardMetadata(metadata: Record<string, unknown> | undefined): DashboardMetadata {
  if (!metadata) return {};
  return {
    kpiCards: Array.isArray(metadata['kpiCards']) ? (metadata['kpiCards'] as KPICardConfig[]) : undefined,
    charts: Array.isArray(metadata['charts']) ? (metadata['charts'] as ChartDefinition[]) : undefined,
    miniTables: Array.isArray(metadata['miniTables'])
      ? (metadata['miniTables'] as DashboardMetadata['miniTables'])
      : undefined,
    autoRefreshEnabled:
      typeof metadata['autoRefreshEnabled'] === 'boolean' ? metadata['autoRefreshEnabled'] : undefined,
    autoRefreshIntervalMs:
      typeof metadata['autoRefreshIntervalMs'] === 'number' ? metadata['autoRefreshIntervalMs'] : undefined,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummaryDashboardTemplate({ pageId, config: propConfig, loading: propLoading, error: propError }: TemplateProps) {
  // Fetch config if not provided
  const { config: fetchedConfig, loading: fetchLoading, error: fetchError } = useTemplateConfig(pageId);

  const config: TemplateConfig | null = propConfig ?? fetchedConfig;
  const loading = propLoading ?? fetchLoading;
  const error = propError ?? fetchError;

  // Parse dashboard-specific config. Done before state init so we can read
  // autoRefreshEnabled as the initial value for the toggle.
  const meta = parseDashboardMetadata(config?.metadata);

  const kpiCards = meta.kpiCards ?? buildPlaceholderKPICards();
  const charts: ChartDefinition[] = meta.charts ?? [];
  const miniTables = meta.miniTables ?? [];
  const refreshIntervalMs = meta.autoRefreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;

  // Local state — autoRefresh is initialised from metadata so a persisted
  // auto-refresh setting is honoured on mount instead of being silently ignored.
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(meta.autoRefreshEnabled ?? false);

  // Monotonic counter incremented on every refresh trigger (auto or manual).
  // Using a counter avoids the object-identity trick `{ ...prev }` which
  // produces a new object without any meaningful state change.
  // In a real app this value would be passed to query hooks as a dependency.
  const [refreshTick, setRefreshTick] = useState(0);

  function triggerRefresh() {
    setRefreshTick((n) => n + 1);
  }

  // Auto-refresh logic
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(triggerRefresh, refreshIntervalMs);
    } else {
      if (refreshRef.current !== null) {
        clearInterval(refreshRef.current);
        refreshRef.current = null;
      }
    }
    return () => {
      if (refreshRef.current !== null) {
        clearInterval(refreshRef.current);
      }
    };
  }, [autoRefresh, refreshIntervalMs]);

  // Loading skeleton
  if (loading) {
    return <TemplateSkeleton variant="summary-dashboard" />;
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={<IconRefresh />}
        message={error}
      />
    );
  }

  const isUnconfigured = !meta.kpiCards;

  return (
    // refreshTick is attached to the root element so data-fetching hooks wired
    // in the future can consume it; prevents the value becoming dead code.
    <div
      className={classes.root}
      data-testid="summary-dashboard-template"
      data-refresh-tick={refreshTick}
    >
      {/* Toolbar */}
      <div className={classes.toolbar}>
        <div className={classes.toolbarLeft}>
          <TimeRangeControl value={timeRange} onChange={setTimeRange} />
        </div>
        <div className={classes.toolbarRight}>
          {/* Auto-refresh toggle */}
          <div
            className={`${classes.refreshBadge} ${autoRefresh ? classes.refreshBadgeActive : ''}`}
          >
            <Switch
              size="xs"
              label={t('dashboard.autoRefresh.label')}
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
              aria-label={t('dashboard.autoRefresh.ariaLabel')}
              data-testid="auto-refresh-toggle"
            />
          </div>
          <Tooltip label={t('dashboard.toolbar.refreshNow')}>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={triggerRefresh}
              aria-label={t('dashboard.toolbar.refreshNow')}
              data-testid="refresh-now-button"
            >
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>

      {/* ViewToolbar */}
      <ViewToolbar pageId={pageId} />

      {/* Content */}
      <div className={classes.content}>
        {/* Zero-config hint */}
        {isUnconfigured && (
          <div className={classes.emptyConfig}>
            <p className={classes.emptyConfigText}>
              {t('dashboard.unconfigured.message')}
            </p>
          </div>
        )}

        {/* KPI Card Row */}
        <KPICardRow
          cards={kpiCards}
          loading={false}
          showDelta={timeRange.compareEnabled}
        />

        {/* Chart Row */}
        {charts.length > 0 && (
          <ChartRow charts={charts} loading={false} />
        )}

        {/* Mini Summary Tables */}
        {miniTables.map((table) => (
          <MiniSummaryTable
            key={table.id}
            title={table.title}
            columns={table.columns}
            rows={table.rows}
            viewAllPageId={table.viewAllPageId}
            loading={false}
          />
        ))}

        {/* Placeholder chart when unconfigured */}
        {isUnconfigured && (
          <ChartRow
            charts={[
              {
                id: 'placeholder-chart',
                title: t('dashboard.placeholder.chartTitle'),
                type: 'line',
                data: PLACEHOLDER_SPARKLINE_DATA,
                series: [{ dataKey: 'value', name: t('dashboard.placeholder.metric1') }],
              },
            ]}
            loading={false}
          />
        )}
      </div>
    </div>
  );
}

// ── Register template ─────────────────────────────────────────────────────────

registerTemplate(SUMMARY_DASHBOARD_PANEL_TYPE, SummaryDashboardTemplate, {
  label: t('dashboard.template.label'),
  icon: 'IconLayoutDashboard',
  description: t('dashboard.template.description'),
  defaultConfig: {
    templateType: 'summary-dashboard',
    metadata: {},
  },
});

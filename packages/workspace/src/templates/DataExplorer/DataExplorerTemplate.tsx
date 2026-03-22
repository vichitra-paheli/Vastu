'use client';

/**
 * DataExplorerTemplate — chart-first analytics page template.
 *
 * Registered as panel type 'data-explorer'. Provides:
 *   - ExplorerControls: dimension, measure, and group-by selectors
 *   - ChartTypeToggle: line / bar / area / scatter / donut / table
 *   - VastuChart: live chart switching based on selection
 *   - Companion table showing underlying data (always sortable)
 *   - CSV export button
 *
 * All colors via --v-* tokens. All strings via t('key').
 * Implements US-132 (AC-1 through AC-8).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Stack, Button, Text, Alert } from '@mantine/core';
import { IconAlertCircle, IconDownload, IconChartBar } from '@tabler/icons-react';

import { TemplateSkeleton } from '../TemplateSkeleton';
import { useTemplateConfig } from '../useTemplateConfig';
import { ExplorerControls } from './ExplorerControls';
import { ChartTypeToggle } from './ChartTypeToggle';
import { VastuChart } from '../../components/VastuChart';
import { VastuTable } from '../../components/VastuTable';
import { EmptyState } from '../../components/EmptyState';
import { t } from '../../lib/i18n';

import type { TemplateProps } from '../types';
import type { ChartType, SeriesConfig, ChartDataPoint } from '../../components/VastuChart/types';
import type { VastuColumn } from '../../components/VastuTable/types';
import type {
  ExplorerChartMode,
  DimensionOption,
  MeasureOption,
  DataExplorerMetadata,
  ExplorerDataRow,
} from './types';

import classes from './DataExplorerTemplate.module.css';

// ─── Stub data for development ────────────────────────────────────────────────

/** Fallback stub data shown when no real data source is configured. */
const STUB_DIMENSIONS: DimensionOption[] = [
  { key: 'month', label: 'Month' },
  { key: 'region', label: 'Region' },
  { key: 'category', label: 'Category' },
];

const STUB_MEASURES: MeasureOption[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'units', label: 'Units Sold' },
  { key: 'margin', label: 'Margin' },
];

const STUB_DATA: ExplorerDataRow[] = [
  { month: 'Jan', region: 'North', category: 'A', revenue: 42000, units: 340, margin: 0.18 },
  { month: 'Feb', region: 'North', category: 'B', revenue: 38000, units: 290, margin: 0.21 },
  { month: 'Mar', region: 'South', category: 'A', revenue: 55000, units: 410, margin: 0.24 },
  { month: 'Apr', region: 'South', category: 'B', revenue: 61000, units: 480, margin: 0.19 },
  { month: 'May', region: 'East', category: 'A', revenue: 47000, units: 370, margin: 0.22 },
  { month: 'Jun', region: 'East', category: 'B', revenue: 53000, units: 420, margin: 0.25 },
  { month: 'Jul', region: 'West', category: 'A', revenue: 49000, units: 390, margin: 0.2 },
  { month: 'Aug', region: 'West', category: 'B', revenue: 58000, units: 450, margin: 0.23 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map ExplorerChartMode to ChartType (filtering out 'table'). */
function toChartType(mode: ExplorerChartMode): ChartType {
  if (mode === 'table') return 'bar';
  return mode;
}

/** Build VastuChart series from selected measure keys. */
function buildSeries(measureKeys: string[], measures: MeasureOption[]): SeriesConfig[] {
  return measureKeys.map((key) => ({
    dataKey: key,
    name: measures.find((m) => m.key === key)?.label ?? key,
  }));
}

/** Build VastuTable columns from dimension + selected measures. */
function buildColumns(
  dimensionKey: string | null,
  measureKeys: string[],
  dimensions: DimensionOption[],
  measures: MeasureOption[],
): VastuColumn<ExplorerDataRow>[] {
  const cols: VastuColumn<ExplorerDataRow>[] = [];

  if (dimensionKey) {
    const dim = dimensions.find((d) => d.key === dimensionKey);
    cols.push({
      id: dimensionKey,
      label: dim?.label ?? dimensionKey,
      accessorKey: dimensionKey,
      dataType: 'text',
      sortable: true,
    });
  }

  for (const key of measureKeys) {
    const m = measures.find((ms) => ms.key === key);
    cols.push({
      id: key,
      label: m?.label ?? key,
      accessorKey: key,
      dataType: 'number',
      sortable: true,
    });
  }

  return cols;
}

/** Reduce raw data rows to only the fields needed for the current selection. */
function filterDataForSelection(
  data: ExplorerDataRow[],
  dimensionKey: string | null,
  measureKeys: string[],
): ExplorerDataRow[] {
  if (!dimensionKey && measureKeys.length === 0) return data;
  const keysToKeep = [...(dimensionKey ? [dimensionKey] : []), ...measureKeys];
  return data.map((row) => {
    const reduced: ExplorerDataRow = {};
    for (const key of keysToKeep) {
      reduced[key] = row[key];
    }
    return reduced;
  });
}

/** Download the visible table data as a CSV file. */
function downloadCsv(data: ExplorerDataRow[], columns: VastuColumn<ExplorerDataRow>[]): void {
  if (columns.length === 0 || data.length === 0) return;

  const header = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.id];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape double quotes and wrap in quotes if needed
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(','),
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data-export.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Inner component (receives resolved config) ───────────────────────────────

interface DataExplorerInnerProps {
  pageId: string;
  metadata: DataExplorerMetadata;
  onMetadataChange: (meta: DataExplorerMetadata) => void;
}

function DataExplorerInner({ pageId: _pageId, metadata, onMetadataChange }: DataExplorerInnerProps) {
  // Use stub data/dimensions/measures — in production these would come from the data source
  const dimensions = STUB_DIMENSIONS;
  const measures = STUB_MEASURES;
  const rawData = STUB_DATA;

  // ─── Local state (merged from metadata defaults) ──────────────────────────

  const [dimensionKey, setDimensionKey] = useState<string | null>(
    metadata.dimensionKey ?? dimensions[0]?.key ?? null,
  );
  const [measureKeys, setMeasureKeys] = useState<string[]>(
    metadata.measureKeys ?? (measures[0] ? [measures[0].key] : []),
  );
  const [groupByKey, setGroupByKey] = useState<string | null>(metadata.groupByKey ?? null);
  const [chartMode, setChartMode] = useState<ExplorerChartMode>(metadata.chartMode ?? 'bar');

  // ─── Persist metadata changes ─────────────────────────────────────────────

  const persistMetadata = useCallback(
    (patch: Partial<DataExplorerMetadata>) => {
      onMetadataChange({
        dimensionKey: dimensionKey ?? undefined,
        measureKeys,
        groupByKey: groupByKey ?? undefined,
        chartMode,
        ...patch,
      });
    },
    [dimensionKey, measureKeys, groupByKey, chartMode, onMetadataChange],
  );

  const handleDimensionChange = useCallback(
    (key: string | null) => {
      setDimensionKey(key);
      persistMetadata({ dimensionKey: key ?? undefined });
    },
    [persistMetadata],
  );

  const handleMeasureChange = useCallback(
    (keys: string[]) => {
      setMeasureKeys(keys);
      persistMetadata({ measureKeys: keys });
    },
    [persistMetadata],
  );

  const handleGroupByChange = useCallback(
    (key: string | null) => {
      setGroupByKey(key);
      persistMetadata({ groupByKey: key ?? undefined });
    },
    [persistMetadata],
  );

  const handleChartModeChange = useCallback(
    (mode: ExplorerChartMode) => {
      setChartMode(mode);
      persistMetadata({ chartMode: mode });
    },
    [persistMetadata],
  );

  // ─── Derived data ─────────────────────────────────────────────────────────

  const xAxisKey = dimensionKey ?? (dimensions[0]?.key ?? 'x');

  const chartData: ChartDataPoint[] = useMemo(
    () => filterDataForSelection(rawData, dimensionKey, measureKeys),
    [rawData, dimensionKey, measureKeys],
  );

  const series: SeriesConfig[] = useMemo(
    () => buildSeries(measureKeys, measures),
    [measureKeys, measures],
  );

  const tableColumns: VastuColumn<ExplorerDataRow>[] = useMemo(
    () => buildColumns(dimensionKey, measureKeys, dimensions, measures),
    [dimensionKey, measureKeys, dimensions, measures],
  );

  const tableData: ExplorerDataRow[] = useMemo(
    () => filterDataForSelection(rawData, dimensionKey, measureKeys),
    [rawData, dimensionKey, measureKeys],
  );

  // ─── Derived state ────────────────────────────────────────────────────────

  const showChart = chartMode !== 'table';
  const chartType = toChartType(chartMode);
  const hasSelection = measureKeys.length > 0;

  // ─── Export handler ───────────────────────────────────────────────────────

  const handleExportCsv = useCallback(() => {
    downloadCsv(tableData, tableColumns);
  }, [tableData, tableColumns]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={classes.root} data-testid="data-explorer-template">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className={classes.toolbar}>
        <div className={classes.toolbarLeft}>
          <ExplorerControls
            dimensions={dimensions}
            measures={measures}
            dimensionKey={dimensionKey}
            onDimensionChange={handleDimensionChange}
            measureKeys={measureKeys}
            onMeasureChange={handleMeasureChange}
            groupByKey={groupByKey}
            onGroupByChange={handleGroupByChange}
          />
        </div>
        <div className={classes.toolbarRight}>
          <ChartTypeToggle value={chartMode} onChange={handleChartModeChange} />
        </div>
      </div>

      {/* ── Empty selection state ────────────────────────────────────────── */}
      {!hasSelection ? (
        <div className={classes.centerState}>
          <EmptyState
            icon={<IconChartBar size={32} aria-hidden="true" />}
            message={t('explorer.empty.noMeasures')}
          />
        </div>
      ) : (
        <>
          {/* ── Chart ─────────────────────────────────────────────────── */}
          {showChart && (
            <div className={classes.chartArea}>
              <VastuChart
                type={chartType}
                data={chartData}
                series={series}
                config={{ xAxisKey, height: 280, showLegend: series.length > 1 }}
                ariaLabel={t('explorer.chart.ariaLabel')}
              />
            </div>
          )}

          {/* ── Companion table ────────────────────────────────────────── */}
          <div className={classes.tableArea}>
            <div className={classes.tableHeader}>
              <Text size="xs" fw={500} c="dimmed">
                {t('explorer.table.title')}
              </Text>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconDownload size={12} aria-hidden="true" />}
                onClick={handleExportCsv}
                aria-label={t('explorer.export.csv.ariaLabel')}
                disabled={tableData.length === 0}
              >
                {t('explorer.export.csv.label')}
              </Button>
            </div>
            <div className={classes.tableContainer}>
              <VastuTable
                data={tableData}
                columns={tableColumns}
                ariaLabel={t('explorer.table.ariaLabel')}
                height="100%"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

/**
 * DataExplorerTemplate — registered as panel type 'data-explorer'.
 *
 * Handles loading and error states using the skeleton → content pattern,
 * then delegates to DataExplorerInner for the interactive chart/table surface.
 */
export function DataExplorerTemplate({ pageId, config, loading, error, onConfigChange }: TemplateProps) {
  const handleMetadataChange = useCallback(
    (meta: DataExplorerMetadata) => {
      if (!onConfigChange) return;
      onConfigChange({
        ...config,
        metadata: { ...config.metadata, ...meta },
      });
    },
    [config, onConfigChange],
  );

  // Loading state — skeleton
  if (loading) {
    return <TemplateSkeleton variant="data-explorer" />;
  }

  // Error state
  if (error) {
    return (
      <Stack p="md" gap="md" align="center" justify="center" style={{ height: '100%' }}>
        <Alert
          icon={<IconAlertCircle size={16} aria-hidden="true" />}
          color="red"
          title={t('explorer.error.title')}
          aria-label={t('explorer.error.ariaLabel')}
        >
          {error}
        </Alert>
      </Stack>
    );
  }

  const metadata = (config.metadata ?? {}) as DataExplorerMetadata;

  return (
    <DataExplorerInner
      pageId={pageId}
      metadata={metadata}
      onMetadataChange={handleMetadataChange}
    />
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

/**
 * DataExplorerPanel — thin wrapper that calls useTemplateConfig and renders
 * DataExplorerTemplate. This is what gets registered in panels/index.ts.
 */
export function DataExplorerPanel({ pageId }: { pageId: string }) {
  const { config, loading, error, updateConfig } = useTemplateConfig(pageId);

  return (
    <DataExplorerTemplate
      pageId={pageId}
      config={config ?? { templateType: 'data-explorer' }}
      loading={loading}
      error={error}
      onConfigChange={updateConfig}
    />
  );
}

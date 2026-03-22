'use client';

/**
 * TableListingTemplate — full data table page with KPI summary strip,
 * filter bar, view toolbar, and record drawer integration.
 *
 * Registered as the 'table-listing' panel type via the template registry.
 *
 * Component hierarchy:
 *   TableListingTemplate
 *     -> ViewToolbar (view selector + save/reset)
 *     -> KPISummaryStrip (if config.summaryStrip.enabled)
 *     -> FilterBar (active filters + add/advanced controls)
 *     -> VastuTable (with virtual scrolling, sorting, filtering)
 *          onRowClick -> drawerStore.openDrawer(recordId)
 *
 * Edge cases:
 * - No data source: EmptyState "No data source configured."
 * - Loading: TemplateSkeleton variant='table-listing'
 * - Zero rows after filters: VastuTable's built-in empty state
 * - Zero-config: renders with default columns derived from data shape
 *
 * Design system:
 * - All colors via --v-* CSS custom properties
 * - All strings via t('key')
 * - Font weights 400/500 only
 * - Loading: skeleton → content → error pattern
 *
 * Implements US-129a.
 */

import React from 'react';
import { IconDatabase } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { registerTemplate } from '../registry';
import { TemplateSkeleton } from '../TemplateSkeleton';
import type { TemplateProps, FieldConfig } from '../types';
import { VastuTable } from '../../components/VastuTable/VastuTable';
import type { VastuColumn } from '../../components/VastuTable/types';
import { FilterBar } from '../../components/FilterSystem/FilterBar';
import type { FilterState, FilterDimension } from '../../components/FilterSystem/types';
import { createRootGroup } from '../../components/FilterSystem/types';
import { ViewToolbar } from '../../components/ViewToolbar/ViewToolbar';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useDrawerStore } from '../../stores/drawerStore';
import { KPISummaryStrip } from './KPISummaryStrip';
import type { KPIMetric } from './KPISummaryStrip';
import classes from './TableListingTemplate.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

/** KPI strip configuration within the table listing template metadata. */
export interface SummaryStripConfig {
  /** Whether the KPI strip is visible above the table. */
  enabled: boolean;
  /** Ordered list of metrics to display. */
  metrics?: KPIMetric[];
}

/** Extended metadata shape for the table listing template. */
export interface TableListingMetadata {
  /** Optional KPI summary strip configuration. */
  summaryStrip?: SummaryStripConfig;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive column definitions from a FieldConfig array.
 * Used when the user has configured explicit fields in the page config.
 */
function fieldsToColumns(fields: FieldConfig[]): VastuColumn<Record<string, unknown>>[] {
  return fields
    .filter((f) => f.visible !== false)
    .map((field) => ({
      id: field.key,
      label: field.label,
      accessorKey: field.key,
      dataType: field.type === 'relation' ? ('text' as const) : field.type,
      sortable: field.sortable ?? false,
      width: field.width,
    }));
}

/** Maps FieldConfig type strings to FilterDimension dataType values. */
const FIELD_TYPE_TO_DIMENSION_DATA_TYPE: Record<string, FilterDimension['dataType']> = {
  relation: 'enum',
  enum: 'enum',
  boolean: 'boolean',
  number: 'number',
  date: 'date',
};

/**
 * Derive filter dimensions from a FieldConfig array.
 * Only filterable fields become filter dimensions.
 */
function fieldsToDimensions(fields: FieldConfig[]): FilterDimension[] {
  return fields
    .filter((f) => f.filterable !== false && f.visible !== false)
    .map((field) => ({
      column: field.key,
      label: field.label,
      dataType: FIELD_TYPE_TO_DIMENSION_DATA_TYPE[field.type] ?? 'text',
    }));
}

/**
 * Derive columns from the shape of an arbitrary data row.
 * Used in "zero-config" mode when no field definitions are provided.
 */
function deriveColumnsFromData(data: Record<string, unknown>[]): VastuColumn<Record<string, unknown>>[] {
  if (data.length === 0) return [];
  const firstRow = data[0];
  if (!firstRow) return [];

  return Object.keys(firstRow).map((key) => ({
    id: key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
    accessorKey: key,
    sortable: true,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

/** Sample data used when no real data source is connected. */
const SAMPLE_DATA: Record<string, unknown>[] = [
  { id: '1', name: 'Example record', status: 'Active', created_at: '2024-01-01' },
  { id: '2', name: 'Another record', status: 'Inactive', created_at: '2024-01-02' },
  { id: '3', name: 'Third record', status: 'Active', created_at: '2024-01-03' },
];

interface TableListingTemplateProps extends TemplateProps {
  /**
   * The actual data rows to display.
   * When undefined, falls back to SAMPLE_DATA for zero-config mode.
   */
  data?: Record<string, unknown>[];
  /** True while data rows are loading (separate from config loading). */
  dataLoading?: boolean;
  /** Error from data fetching (separate from config error). */
  dataError?: string | null;
}

/**
 * TableListingTemplate renders a full table listing page.
 *
 * Integrates:
 * - ViewToolbar for view management
 * - KPISummaryStrip (optional, controlled by config.metadata.summaryStrip.enabled)
 * - FilterBar for column-level filtering
 * - VastuTable with virtual scrolling, sorting, and row selection
 * - Plain row click (no modifier key) opens RecordDrawer via drawerStore.openDrawer
 * - onRowSelectionChange is reserved for multi-select tracking only
 */
function TableListingTemplateInner({
  pageId,
  config,
  loading = false,
  error = null,
  data,
  dataLoading = false,
  dataError = null,
}: TableListingTemplateProps) {
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // ─── Filter state ─────────────────────────────────────────────────
  const [filterState, setFilterState] = React.useState<FilterState>({
    root: createRootGroup(),
    advanced: false,
  });

  // ─── Loading state ────────────────────────────────────────────────
  if (loading) {
    return <TemplateSkeleton variant="table-listing" />;
  }

  // ─── Error state ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className={classes.root} role="alert">
        <EmptyState
          icon={<IconDatabase />}
          message={error}
          className={classes.centeredState}
        />
      </div>
    );
  }

  // ─── No data source ───────────────────────────────────────────────
  const hasDataSource = Boolean(config.dataSource);
  if (!hasDataSource) {
    return (
      <div className={classes.root} data-testid="table-listing-no-datasource">
        <ViewToolbar pageId={pageId} />
        <EmptyState
          icon={<IconDatabase />}
          message={t('tableListing.noDataSource.message')}
          actionLabel={t('tableListing.noDataSource.action')}
          className={classes.centeredState}
        />
      </div>
    );
  }

  // ─── Resolve columns ──────────────────────────────────────────────
  const resolvedData = data ?? SAMPLE_DATA;
  const columns: VastuColumn<Record<string, unknown>>[] =
    config.fields && config.fields.length > 0
      ? fieldsToColumns(config.fields)
      : deriveColumnsFromData(resolvedData);

  // ─── Resolve filter dimensions ────────────────────────────────────
  const dimensions: FilterDimension[] =
    config.fields && config.fields.length > 0
      ? fieldsToDimensions(config.fields)
      : columns.map((col) => ({
          column: col.id,
          label: col.label,
          dataType: 'text' as const,
        }));

  // ─── KPI strip config ─────────────────────────────────────────────
  const metadata = config.metadata as TableListingMetadata | undefined;
  const summaryStrip = metadata?.summaryStrip;
  const showSummaryStrip = summaryStrip?.enabled === true;
  const kpiMetrics: KPIMetric[] = summaryStrip?.metrics ?? [];

  // ─── Row click handler → open drawer ─────────────────────────────
  // Plain single click (no shift/ctrl) on a row opens the RecordDrawer.
  // onRowSelectionChange is used separately for multi-select tracking only.
  function handleRowClick(recordId: string) {
    openDrawer(recordId);
  }

  return (
    <div
      className={classes.root}
      data-testid="table-listing-template"
      aria-label={t('tableListing.ariaLabel')}
    >
      {/* View toolbar — always present at top */}
      <ViewToolbar pageId={pageId} />

      {/* KPI summary strip — shown when enabled in config */}
      {showSummaryStrip && (
        <KPISummaryStrip
          metrics={kpiMetrics}
          loading={dataLoading}
        />
      )}

      {/* Filter bar */}
      <div className={classes.filterBar}>
        <FilterBar
          filterState={filterState}
          dimensions={dimensions}
          onChange={setFilterState}
          viewId={pageId}
        />
      </div>

      {/* Data table */}
      <div className={classes.tableWrapper}>
        <VastuTable
          data={resolvedData}
          columns={columns}
          viewId={pageId}
          filterRoot={filterState.root}
          loading={dataLoading}
          error={dataError ? new Error(dataError) : null}
          getRowId={(row) => String(row['id'] ?? '')}
          onRowClick={handleRowClick}
          ariaLabel={t('tableListing.table.ariaLabel')}
        />
      </div>
    </div>
  );
}

export const TableListingTemplate = React.memo(TableListingTemplateInner);

// ─── Template registration ────────────────────────────────────────────────────

/**
 * Register the table-listing template in the global template registry.
 * This runs as a module-level side effect when this file is imported.
 */
registerTemplate(
  'table-listing',
  TableListingTemplate as React.ComponentType<TemplateProps>,
  {
    label: t('tableListing.meta.label'),
    icon: 'IconTable',
    description: t('tableListing.meta.description'),
    defaultConfig: {
      templateType: 'table-listing',
      fields: [],
      sections: [],
      metadata: {
        summaryStrip: { enabled: false, metrics: [] },
      },
    },
  },
);

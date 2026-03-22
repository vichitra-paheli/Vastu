/**
 * DataExplorer template — local types.
 *
 * Implements US-132.
 */

import type { ChartType } from '../../components/VastuChart/types';

/**
 * Chart mode for the explorer.
 * Extends ChartType with 'table' (hide chart, show only companion table).
 */
export type ExplorerChartMode = Exclude<ChartType, 'sparkline'> | 'table';

/**
 * A dimension option available in the explorer.
 * Dimensions are categorical fields used for the X axis or grouping.
 */
export interface DimensionOption {
  /** Data key (column name). */
  key: string;
  /** Human-readable label. */
  label: string;
}

/**
 * A measure option available in the explorer.
 * Measures are numeric fields used for the Y axis.
 */
export interface MeasureOption {
  /** Data key (column name). */
  key: string;
  /** Human-readable label. */
  label: string;
}

/**
 * Configuration stored in TemplateConfig.metadata for the data explorer.
 */
export interface DataExplorerMetadata {
  /** Currently selected dimension key. */
  dimensionKey?: string;
  /** Currently selected measure keys. */
  measureKeys?: string[];
  /** Currently selected group-by key. */
  groupByKey?: string;
  /** Currently selected chart mode. */
  chartMode?: ExplorerChartMode;
}

/**
 * A single row of explorer data. Keys correspond to dimension/measure keys.
 */
export type ExplorerDataRow = Record<string, string | number | null | undefined>;

/**
 * VastuChart types — chart configuration, series, and component props.
 *
 * Implements US-135 (AC-1 through AC-12).
 */

/**
 * Supported chart render types.
 * - line: Multi-series line chart with optional dots
 * - bar: Vertical bar chart (stacking configured via ChartConfig)
 * - area: Area chart with fill opacity per SS10.5
 * - donut: Pie chart with inner radius for donut shape
 * - sparkline: Minimal single-series line — no axes, legend, or grid
 * - scatter: XY scatter chart with one or more series
 */
export type ChartType = 'line' | 'bar' | 'area' | 'donut' | 'sparkline' | 'scatter';

/**
 * Scale type for numeric axes.
 */
export type ScaleType = 'linear' | 'log';

/**
 * Bar orientation — vertical (default) or horizontal.
 */
export type BarOrientation = 'vertical' | 'horizontal';

/**
 * Legend position relative to the chart.
 */
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Per-series configuration.
 *
 * The `dataKey` maps to a field in the chart data objects.
 * When `color` is omitted, it is assigned automatically from CHART_SERIES_COLORS.
 */
export interface SeriesConfig {
  /** Unique identifier for this series. Also the data field key. */
  dataKey: string;
  /** Human-readable display name for legend and tooltip. */
  name: string;
  /**
   * Override color for this series.
   * When omitted, color is assigned by index from CHART_SERIES_COLORS.
   * Should be a CSS custom property reference (e.g. `var(--v-accent-primary)`).
   */
  color?: string;
  /** When true, this series is hidden in the chart but retains its palette slot. */
  hidden?: boolean;
  /**
   * For scatter charts: the data key that maps to the X axis value.
   * The main `dataKey` is used as the Y axis.
   */
  xDataKey?: string;
  /**
   * Formatter registry display type for this series' values in the tooltip.
   * When set, the registered formatter's render function is used to display
   * the series value (VASTU-2A-205c). When omitted, values are displayed as strings.
   */
  displayType?: string;
}

/**
 * A reference line overlaid on the chart axes.
 */
export interface ReferenceLineConfig {
  /** Value on the Y axis (for horizontal reference lines). */
  y?: number;
  /** Value on the X axis (for vertical reference lines). */
  x?: string | number;
  /** Label displayed on the reference line. */
  label?: string;
  /** CSS color value. Defaults to `--v-border-default`. */
  color?: string;
}

/**
 * Chart configuration — controls axes, legends, grid, stacking, and advanced options.
 */
export interface ChartConfig {
  /** Override the chart height in pixels. Default: 240 for inline, 360 for full-width. */
  height?: number;
  /** Show the chart legend. Default: true. */
  showLegend?: boolean;
  /** Position of the legend. Default: 'bottom'. */
  legendPosition?: LegendPosition;
  /** Show axis labels (X and Y axis tick labels). Default: true. */
  showAxisLabels?: boolean;
  /** Custom label for the X axis. */
  xAxisLabel?: string;
  /** Custom label for the Y axis. */
  yAxisLabel?: string;
  /** Scale type for the Y axis. Default: 'linear'. */
  scaleType?: ScaleType;
  /** Stack bars or areas. Only applies to bar and area chart types. */
  stacked?: boolean;
  /** Orientation for bar charts. Default: 'vertical'. */
  barOrientation?: BarOrientation;
  /** Reference lines overlaid on the chart. */
  referenceLines?: ReferenceLineConfig[];
  /** The data key used as the X axis category (for line, bar, area charts). */
  xAxisKey?: string;
}

/**
 * A single data point in the chart data array.
 * Each key matches a series `dataKey` or the `xAxisKey` from ChartConfig.
 */
export type ChartDataPoint = Record<string, string | number | null | undefined>;

/**
 * Props for the VastuChart component.
 */
export interface VastuChartProps {
  /** The chart type to render. */
  type: ChartType;
  /**
   * Array of data points. Each object should have keys matching series `dataKey`
   * values and the `xAxisKey` from config.
   */
  data: ChartDataPoint[];
  /** Series definitions controlling display and color assignment. */
  series: SeriesConfig[];
  /** Chart configuration overrides. */
  config?: ChartConfig;
  /**
   * Called when the user changes chart configuration via the config panel.
   * The parent is responsible for persisting and passing the new config back.
   */
  onConfigChange?: (config: ChartConfig) => void;
  /** When true, renders a skeleton loading state. */
  loading?: boolean;
  /** When set, renders the error state with this message. */
  error?: string | null;
  /** Called when the user clicks the retry button in the error state. */
  onRetry?: () => void;
  /**
   * Accessible label describing the chart for screen readers.
   * Example: "Monthly revenue by region, line chart"
   */
  ariaLabel?: string;
  /** Additional CSS class name on the root element. */
  className?: string;
}

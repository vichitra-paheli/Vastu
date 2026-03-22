/**
 * VastuChart component tests.
 *
 * Covers:
 * - Renders each chart type: line, bar, area, donut, sparkline, scatter
 * - Color assignment correct for multiple series
 * - Loading skeleton state
 * - Error state with retry
 * - Empty state
 * - Accessibility: aria-label present
 * - Config panel open/close
 *
 * Implements US-135 AC-1 through AC-12.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { VastuChart } from '../VastuChart';
import { getSeriesColor, CHART_SERIES_COLORS, CHART_OTHER_COLOR } from '../chartColors';
import type { VastuChartProps, SeriesConfig, ChartDataPoint } from '../types';

// ─── Mock Recharts ────────────────────────────────────────────────────────────
// Recharts uses SVG that jsdom doesn't support.
// We use a lightweight string-based mock to avoid worker memory issues.

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  LineChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'recharts-LineChart' }, children),
  Line: ({ dataKey, stroke }: { dataKey: string; stroke: string }) =>
    React.createElement('div', { 'data-testid': 'recharts-Line', 'data-datakey': dataKey, 'data-stroke': stroke }),
  BarChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'recharts-BarChart' }, children),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) =>
    React.createElement('div', { 'data-testid': 'recharts-Bar', 'data-datakey': dataKey, 'data-fill': fill }),
  AreaChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'recharts-AreaChart' }, children),
  Area: ({ dataKey, stroke }: { dataKey: string; stroke: string }) =>
    React.createElement('div', { 'data-testid': 'recharts-Area', 'data-datakey': dataKey, 'data-stroke': stroke }),
  PieChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'recharts-PieChart' }, children),
  Pie: ({ data }: { data: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'recharts-Pie', 'data-count': String(data?.length ?? 0) }),
  Cell: ({ fill }: { fill: string }) =>
    React.createElement('div', { 'data-testid': 'recharts-Cell', 'data-fill': fill }),
  ScatterChart: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'recharts-ScatterChart' }, children),
  Scatter: ({ name, fill }: { name: string; fill: string }) =>
    React.createElement('div', { 'data-testid': 'recharts-Scatter', 'data-name': name, 'data-fill': fill }),
  XAxis: () => React.createElement('div', { 'data-testid': 'recharts-XAxis' }),
  YAxis: () => React.createElement('div', { 'data-testid': 'recharts-YAxis' }),
  CartesianGrid: () => React.createElement('div', { 'data-testid': 'recharts-CartesianGrid' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'recharts-Tooltip' }),
  ReferenceLine: () => React.createElement('div', { 'data-testid': 'recharts-ReferenceLine' }),
  Legend: () => React.createElement('div', { 'data-testid': 'recharts-Legend' }),
}));

// ─── Test data ────────────────────────────────────────────────────────────────

const TEST_DATA: ChartDataPoint[] = [
  { month: 'Jan', revenue: 10000, cost: 7000 },
  { month: 'Feb', revenue: 12000, cost: 8000 },
  { month: 'Mar', revenue: 11000, cost: 7500 },
];

const TEST_SERIES: SeriesConfig[] = [
  { dataKey: 'revenue', name: 'Revenue' },
  { dataKey: 'cost', name: 'Cost' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderChart(props: Partial<VastuChartProps> = {}) {
  return render(
    React.createElement(VastuChart, {
      type: 'line',
      data: TEST_DATA,
      series: TEST_SERIES,
      ariaLabel: 'Test chart',
      ...props,
    }),
    { wrapper: TestProviders },
  );
}

// ─── Chart type rendering ─────────────────────────────────────────────────────

describe('VastuChart — chart type rendering', () => {
  it('renders a LineChart for type=line', () => {
    renderChart({ type: 'line' });
    expect(screen.getByTestId('recharts-LineChart')).toBeTruthy();
  });

  it('renders a BarChart for type=bar', () => {
    renderChart({ type: 'bar' });
    expect(screen.getByTestId('recharts-BarChart')).toBeTruthy();
  });

  it('renders an AreaChart for type=area', () => {
    renderChart({ type: 'area' });
    expect(screen.getByTestId('recharts-AreaChart')).toBeTruthy();
  });

  it('renders a PieChart for type=donut', () => {
    renderChart({ type: 'donut' });
    expect(screen.getByTestId('recharts-PieChart')).toBeTruthy();
  });

  it('renders a LineChart for type=sparkline', () => {
    renderChart({ type: 'sparkline' });
    expect(screen.getByTestId('recharts-LineChart')).toBeTruthy();
  });

  it('renders a ScatterChart for type=scatter', () => {
    renderChart({ type: 'scatter' });
    expect(screen.getByTestId('recharts-ScatterChart')).toBeTruthy();
  });
});

// ─── Color palette ────────────────────────────────────────────────────────────

describe('getSeriesColor — color palette', () => {
  it('returns correct colors for indices 0-9', () => {
    for (let i = 0; i < 10; i++) {
      expect(getSeriesColor(i)).toBe(CHART_SERIES_COLORS[i]);
    }
  });

  it('returns CHART_OTHER_COLOR for index >= 10', () => {
    expect(getSeriesColor(10)).toBe(CHART_OTHER_COLOR);
    expect(getSeriesColor(15)).toBe(CHART_OTHER_COLOR);
  });

  it('CHART_SERIES_COLORS has exactly 10 entries', () => {
    expect(CHART_SERIES_COLORS).toHaveLength(10);
  });

  it('CHART_OTHER_COLOR references --v-text-tertiary CSS variable', () => {
    expect(CHART_OTHER_COLOR).toBe('var(--v-text-tertiary)');
  });
});

// ─── Color assignment ─────────────────────────────────────────────────────────

describe('VastuChart — color assignment', () => {
  it('assigns first palette color to first series in line chart', () => {
    renderChart({ type: 'line' });
    const lines = screen.getAllByTestId('recharts-Line');
    expect(lines[0].dataset.stroke).toBe(CHART_SERIES_COLORS[0]);
  });

  it('assigns second palette color to second series in line chart', () => {
    renderChart({ type: 'line' });
    const lines = screen.getAllByTestId('recharts-Line');
    expect(lines[1].dataset.stroke).toBe(CHART_SERIES_COLORS[1]);
  });

  it('assigns first palette color to first series in bar chart', () => {
    renderChart({ type: 'bar' });
    const bars = screen.getAllByTestId('recharts-Bar');
    expect(bars[0].dataset.fill).toBe(CHART_SERIES_COLORS[0]);
  });

  it('assigns first palette color to first series in area chart', () => {
    renderChart({ type: 'area' });
    const areas = screen.getAllByTestId('recharts-Area');
    expect(areas[0].dataset.stroke).toBe(CHART_SERIES_COLORS[0]);
  });

  it('respects explicit color override on series', () => {
    const series: SeriesConfig[] = [
      { dataKey: 'revenue', name: 'Revenue', color: 'red' },
      { dataKey: 'cost', name: 'Cost' },
    ];
    renderChart({ type: 'line', series });
    const lines = screen.getAllByTestId('recharts-Line');
    expect(lines[0].dataset.stroke).toBe('red');
    expect(lines[1].dataset.stroke).toBe(CHART_SERIES_COLORS[1]);
  });
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('VastuChart — loading state', () => {
  it('renders a skeleton when loading=true and does not render chart', () => {
    const { container } = renderChart({ loading: true });
    expect(screen.queryByTestId('recharts-LineChart')).toBeNull();
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-busy')).toBe('true');
  });

  it('does not show chart content when loading', () => {
    renderChart({ loading: true });
    expect(screen.queryByTestId('responsive-container')).toBeNull();
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('VastuChart — error state', () => {
  it('renders error message when error prop is set', () => {
    renderChart({ error: 'Failed to load chart data' });
    expect(screen.getByText('Failed to load chart data')).toBeTruthy();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    renderChart({ error: 'Error', onRetry });
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeTruthy();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    renderChart({ error: 'Error', onRetry });
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render retry button when onRetry is absent', () => {
    renderChart({ error: 'Error' });
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('has role=alert on error state', () => {
    renderChart({ error: 'Error' });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('VastuChart — empty state', () => {
  it('renders empty state when data is empty', () => {
    renderChart({ data: [] });
    expect(screen.queryByTestId('recharts-LineChart')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows the empty state message', () => {
    renderChart({ data: [] });
    expect(screen.getByText('No data matches current filters')).toBeTruthy();
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('VastuChart — accessibility', () => {
  it('has aria-label on the root element', () => {
    renderChart({ ariaLabel: 'Monthly revenue chart' });
    const chart = screen.getByRole('img', { name: 'Monthly revenue chart' });
    expect(chart).toBeTruthy();
  });

  it('uses a default aria-label when none is provided', () => {
    renderChart({ ariaLabel: undefined });
    const chart = screen.getByRole('img');
    expect(chart).toBeTruthy();
  });
});

// ─── Config panel ─────────────────────────────────────────────────────────────

describe('VastuChart — config panel', () => {
  it('shows gear button when onConfigChange is provided', () => {
    const onConfigChange = vi.fn();
    renderChart({ onConfigChange });
    const gearBtn = screen.getByRole('button', { name: /chart configuration/i });
    expect(gearBtn).toBeTruthy();
  });

  it('does not show gear button without onConfigChange', () => {
    renderChart({ onConfigChange: undefined });
    expect(screen.queryByRole('button', { name: /chart configuration/i })).toBeNull();
  });

  it('opens config panel when gear button is clicked', () => {
    const onConfigChange = vi.fn();
    renderChart({ onConfigChange });
    const gearBtn = screen.getByRole('button', { name: /chart configuration/i });
    fireEvent.click(gearBtn);
    expect(screen.getByRole('dialog', { name: /chart configuration/i })).toBeTruthy();
  });

  it('toggles config panel closed when gear button is clicked again', () => {
    const onConfigChange = vi.fn();
    renderChart({ onConfigChange });
    const gearBtn = screen.getByRole('button', { name: /chart configuration/i });
    fireEvent.click(gearBtn);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(gearBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// ─── Legend visibility ────────────────────────────────────────────────────────

describe('VastuChart — legend', () => {
  it('renders legend items for each series by default', () => {
    renderChart({ type: 'line' });
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('Cost')).toBeTruthy();
  });

  it('hides legend when config.showLegend is false', () => {
    renderChart({ config: { showLegend: false } });
    expect(screen.queryByText('Revenue')).toBeNull();
    expect(screen.queryByText('Cost')).toBeNull();
  });

  it('does not render legend for sparkline type', () => {
    renderChart({ type: 'sparkline' });
    expect(screen.queryByText('Revenue')).toBeNull();
  });
});

/**
 * VastuChart component tests.
 *
 * Covers: chart type rendering, color assignment, loading/error/empty states,
 * accessibility, config panel, and legend visibility.
 *
 * Recharts is aliased to a lightweight stub in vitest.config.ts to avoid
 * OOM from d3/SVG internals in jsdom.
 *
 * Implements US-135 AC-1 through AC-12.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { VastuChart } from '../VastuChart';
import { getSeriesColor, CHART_SERIES_COLORS, CHART_OTHER_COLOR } from '../chartColors';
import type { VastuChartProps, SeriesConfig, ChartDataPoint } from '../types';

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

afterEach(() => {
  cleanup();
});

function renderChart(props: Partial<VastuChartProps> = {}) {
  return render(
    <VastuChart
      type="line"
      data={TEST_DATA}
      series={TEST_SERIES}
      ariaLabel="Test chart"
      {...props}
    />,
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

describe('getSeriesColor', () => {
  it('returns correct colors for indices 0-9', () => {
    for (let i = 0; i < 10; i++) {
      expect(getSeriesColor(i)).toBe(CHART_SERIES_COLORS[i]);
    }
  });

  it('returns CHART_OTHER_COLOR for index >= 10', () => {
    expect(getSeriesColor(10)).toBe(CHART_OTHER_COLOR);
    expect(getSeriesColor(15)).toBe(CHART_OTHER_COLOR);
  });

  it('has exactly 10 palette entries', () => {
    expect(CHART_SERIES_COLORS).toHaveLength(10);
  });

  it('uses --v-text-tertiary for overflow color', () => {
    expect(CHART_OTHER_COLOR).toBe('var(--v-text-tertiary)');
  });
});

// ─── Color assignment ─────────────────────────────────────────────────────────

describe('VastuChart — color assignment', () => {
  it('assigns palette colors to series in order', () => {
    renderChart({ type: 'line' });
    const lines = screen.getAllByTestId('recharts-Line');
    expect(lines[0].dataset.stroke).toBe(CHART_SERIES_COLORS[0]);
    expect(lines[1].dataset.stroke).toBe(CHART_SERIES_COLORS[1]);
  });

  it('assigns palette colors in bar charts', () => {
    renderChart({ type: 'bar' });
    const bars = screen.getAllByTestId('recharts-Bar');
    expect(bars[0].dataset.fill).toBe(CHART_SERIES_COLORS[0]);
  });

  it('assigns palette colors in area charts', () => {
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
  it('renders skeleton and hides chart when loading', () => {
    renderChart({ loading: true });
    expect(screen.queryByTestId('recharts-LineChart')).toBeNull();
    expect(screen.queryByTestId('responsive-container')).toBeNull();
    const busy = document.querySelector('[aria-busy="true"]');
    expect(busy).toBeTruthy();
  });
});

// ─── Error state ──────────────────────────────────────────────────────────────

describe('VastuChart — error state', () => {
  it('renders error message with role=alert', () => {
    renderChart({ error: 'Failed to load chart data' });
    expect(screen.getByText('Failed to load chart data')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('renders retry button when onRetry is provided and calls it on click', () => {
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
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('VastuChart — empty state', () => {
  it('renders empty state when data is empty', () => {
    renderChart({ data: [] });
    expect(screen.queryByTestId('recharts-LineChart')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('No data matches current filters')).toBeTruthy();
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('VastuChart — accessibility', () => {
  it('has aria-label on the root element', () => {
    renderChart({ ariaLabel: 'Monthly revenue chart' });
    expect(screen.getByRole('img', { name: 'Monthly revenue chart' })).toBeTruthy();
  });

  it('uses a default aria-label when none is provided', () => {
    renderChart({ ariaLabel: undefined });
    expect(screen.getByRole('img')).toBeTruthy();
  });
});

// ─── Config panel ─────────────────────────────────────────────────────────────

describe('VastuChart — config panel', () => {
  it('shows gear button only when onConfigChange is provided', () => {
    const onConfigChange = vi.fn();
    renderChart({ onConfigChange });
    expect(screen.getByRole('button', { name: /chart configuration/i })).toBeTruthy();

    cleanup();

    renderChart({ onConfigChange: undefined });
    expect(screen.queryByRole('button', { name: /chart configuration/i })).toBeNull();
  });

  it('toggles config panel open and closed', () => {
    const onConfigChange = vi.fn();
    renderChart({ onConfigChange });
    const gearBtn = screen.getByRole('button', { name: /chart configuration/i });

    fireEvent.click(gearBtn);
    expect(screen.getByRole('dialog', { name: /chart configuration/i })).toBeTruthy();

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

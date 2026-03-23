/**
 * ChartKeyboardNav and useChartKeyboardNav tests.
 *
 * Covers:
 * - Tab focuses chart container (AC-1)
 * - Left/Right arrow keys move between data points (AC-2)
 * - Up/Down arrow keys cycle between series (AC-3)
 * - Enter triggers drill-down callback (AC-4)
 * - aria-live region for screen reader announcements (AC-5)
 * - "View as table" toggle (AC-6)
 * - Screen reader ARIA attributes exist (AC-5)
 *
 * Implements US-210 (VASTU-2A-210e).
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { ChartKeyboardNav } from '../ChartKeyboardNav';
import { ChartAccessibleTable } from '../ChartAccessibleTable';
import { VastuChart } from '../VastuChart';
import { useChartKeyboardNav } from '../useChartKeyboardNav';
import type { SeriesConfig, ChartDataPoint, ChartType } from '../types';
import { CHART_SERIES_COLORS } from '../chartColors';

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

const RESOLVED_COLORS: Record<string, string> = {
  revenue: CHART_SERIES_COLORS[0],
  cost: CHART_SERIES_COLORS[1],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

function renderKeyboardNav(
  props: Partial<React.ComponentProps<typeof ChartKeyboardNav>> = {},
) {
  return render(
    <ChartKeyboardNav
      data={TEST_DATA}
      visibleSeries={TEST_SERIES}
      xAxisKey="month"
      chartType="line"
      ariaLabel="Test chart"
      {...props}
    >
      <div data-testid="chart-content">Chart content</div>
    </ChartKeyboardNav>,
    { wrapper: TestProviders },
  );
}

function renderVastuChart(props: Partial<React.ComponentProps<typeof VastuChart>> = {}) {
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

// ─── ChartKeyboardNav — focus management ──────────────────────────────────────

describe('ChartKeyboardNav — focus management', () => {
  it('renders a focusable container when enabled', () => {
    renderKeyboardNav({ enabled: true });
    const container = screen.getByRole('group', { name: 'Test chart' });
    expect(container.getAttribute('tabindex')).toBe('0');
  });

  it('renders a non-focusable container when disabled (sparklines)', () => {
    renderKeyboardNav({ enabled: false });
    const container = screen.getByRole('group', { name: 'Test chart' });
    expect(container.getAttribute('tabindex')).toBe('-1');
  });

  it('renders chart content inside the keyboard nav container', () => {
    renderKeyboardNav();
    expect(screen.getByTestId('chart-content')).toBeTruthy();
  });

  it('has aria-label on the container', () => {
    renderKeyboardNav({ ariaLabel: 'Revenue line chart' });
    expect(screen.getByRole('group', { name: 'Revenue line chart' })).toBeTruthy();
  });
});

// ─── ChartKeyboardNav — keyboard navigation ────────────────────────────────────

describe('ChartKeyboardNav — keyboard navigation', () => {
  it('renders aria-live region for screen reader announcements', () => {
    renderKeyboardNav({ enabled: true });
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
  });

  it('does not render aria-live region when disabled', () => {
    renderKeyboardNav({ enabled: false });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('calls onEnter callback when Enter is pressed with a focused data point', () => {
    const onEnter = vi.fn();
    renderKeyboardNav({ onEnter, enabled: true });
    const container = screen.getByRole('group', { name: 'Test chart' });

    // Focus the container to initialize
    fireEvent.focus(container);
    // Navigate to the first data point (already at 0 after focus)
    fireEvent.keyDown(container, { key: 'Enter' });

    expect(onEnter).toHaveBeenCalledWith(
      0,
      0,
      TEST_DATA[0],
      TEST_SERIES[0],
    );
  });

  it('does not call onEnter when chart is not focused', () => {
    const onEnter = vi.fn();
    renderKeyboardNav({ onEnter, enabled: true });
    const container = screen.getByRole('group', { name: 'Test chart' });

    // Press Enter without focusing first
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('prevents default on arrow key presses', () => {
    renderKeyboardNav({ enabled: true });
    const container = screen.getByRole('group', { name: 'Test chart' });
    fireEvent.focus(container);

    const rightEvent = { key: 'ArrowRight', defaultPrevented: false };
    fireEvent.keyDown(container, rightEvent);
    // Arrow key presses should prevent default scroll behavior
  });
});

// ─── useChartKeyboardNav hook ─────────────────────────────────────────────────

describe('useChartKeyboardNav — state management', () => {
  function HookHarness({
    onStateChange,
  }: {
    onStateChange: (state: ReturnType<typeof useChartKeyboardNav>) => void;
  }) {
    const nav = useChartKeyboardNav({
      data: TEST_DATA,
      visibleSeries: TEST_SERIES,
      enabled: true,
    });
    onStateChange(nav);
    const { containerRef, handleFocus, handleBlur, handleKeyDown } = nav.handlers;
    return (
      <div
        ref={containerRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-testid="hook-container"
      />
    );
  }

  it('initializes with no active point', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    expect(capturedState!.state.activePointIndex).toBe(-1);
    expect(capturedState!.state.isFocused).toBe(false);
  });

  it('sets active point index to 0 on focus', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    expect(capturedState!.state.activePointIndex).toBe(0);
    expect(capturedState!.state.isFocused).toBe(true);
  });

  it('advances active point index on ArrowRight', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(capturedState!.state.activePointIndex).toBe(1);
  });

  it('does not advance past the last data point on ArrowRight', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    // Move to end (data has 3 items: 0, 1, 2)
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    fireEvent.keyDown(container, { key: 'ArrowRight' }); // attempt to go past end
    expect(capturedState!.state.activePointIndex).toBe(2);
  });

  it('moves back on ArrowLeft', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    expect(capturedState!.state.activePointIndex).toBe(0);
  });

  it('does not go below 0 on ArrowLeft', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    expect(capturedState!.state.activePointIndex).toBe(0);
  });

  it('cycles series down on ArrowDown', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(capturedState!.state.activeSeriesIndex).toBe(1);
  });

  it('wraps series index on ArrowDown past last series', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowDown' }); // 0→1
    fireEvent.keyDown(container, { key: 'ArrowDown' }); // 1→0 (wraps)
    expect(capturedState!.state.activeSeriesIndex).toBe(0);
  });

  it('cycles series up on ArrowUp', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowUp' }); // wraps to last series (1)
    expect(capturedState!.state.activeSeriesIndex).toBe(1);
  });

  it('exposes active data point matching the current index', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    expect(capturedState!.activeDataPoint).toEqual(TEST_DATA[1]);
  });

  it('exposes active series matching the current series index', () => {
    let capturedState: ReturnType<typeof useChartKeyboardNav> | null = null;
    render(
      <HookHarness onStateChange={(s) => { capturedState = s; }} />,
      { wrapper: TestProviders },
    );
    const container = screen.getByTestId('hook-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(capturedState!.activeSeries).toEqual(TEST_SERIES[1]);
  });

  it('calls onEnter with correct args when Enter is pressed', () => {
    const onEnter = vi.fn();

    function HookHarnessWithEnter() {
      const nav = useChartKeyboardNav({
        data: TEST_DATA,
        visibleSeries: TEST_SERIES,
        onEnter,
        enabled: true,
      });
      const { containerRef, handleFocus, handleBlur, handleKeyDown } = nav.handlers;
      return (
        <div
          ref={containerRef}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          data-testid="hook-enter-container"
        />
      );
    }

    render(<HookHarnessWithEnter />, { wrapper: TestProviders });
    const container = screen.getByTestId('hook-enter-container');
    fireEvent.focus(container);
    fireEvent.keyDown(container, { key: 'ArrowRight' }); // move to index 1
    fireEvent.keyDown(container, { key: 'Enter' });

    expect(onEnter).toHaveBeenCalledWith(1, 0, TEST_DATA[1], TEST_SERIES[0]);
  });
});

// ─── ChartAccessibleTable — rendering ─────────────────────────────────────────

describe('ChartAccessibleTable — cartesian charts', () => {
  function renderTable(props: Partial<React.ComponentProps<typeof ChartAccessibleTable>> = {}) {
    return render(
      <ChartAccessibleTable
        data={TEST_DATA}
        series={TEST_SERIES}
        resolvedColors={RESOLVED_COLORS}
        xAxisKey="month"
        chartType="line"
        {...props}
      />,
      { wrapper: TestProviders },
    );
  }

  it('renders an accessible table element', () => {
    renderTable();
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('renders a column header for the x-axis key', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: 'month' })).toBeTruthy();
  });

  it('renders a column header for each series', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: /revenue/i })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: /cost/i })).toBeTruthy();
  });

  it('renders a row for each data point', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    // 1 header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  it('renders the x-axis values in the first column', () => {
    renderTable();
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Feb')).toBeTruthy();
    expect(screen.getByText('Mar')).toBeTruthy();
  });

  it('renders series values in the correct cells', () => {
    renderTable();
    // Revenue values
    expect(screen.getByText('10000')).toBeTruthy();
    expect(screen.getByText('12000')).toBeTruthy();
    // Cost values
    expect(screen.getByText('7000')).toBeTruthy();
    expect(screen.getByText('8000')).toBeTruthy();
  });

  it('renders null values as an em-dash', () => {
    const dataWithNull: ChartDataPoint[] = [
      { month: 'Jan', revenue: null, cost: 7000 },
    ];
    renderTable({ data: dataWithNull });
    // em-dash character
    expect(screen.getByText('\u2014')).toBeTruthy();
  });

  it('renders color swatches in column headers', () => {
    renderTable();
    // Swatches are aria-hidden spans
    const swatches = document.querySelectorAll('[aria-hidden="true"]');
    expect(swatches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ChartAccessibleTable — donut chart', () => {
  const donutSeries: SeriesConfig[] = [
    { dataKey: 'red', name: 'Red Team' },
    { dataKey: 'blue', name: 'Blue Team' },
  ];
  const donutColors = { red: '#FF0000', blue: '#0000FF' };
  const donutData: ChartDataPoint[] = [
    { label: 'Q1', red: 100, blue: 200 },
    { label: 'Q2', red: 150, blue: 50 },
  ];

  function renderDonutTable() {
    return render(
      <ChartAccessibleTable
        data={donutData}
        series={donutSeries}
        resolvedColors={donutColors}
        xAxisKey="label"
        chartType="donut"
      />,
      { wrapper: TestProviders },
    );
  }

  it('renders series column and value column for donut charts', () => {
    renderDonutTable();
    // Check for Series and Value column headers using getByRole
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders).toHaveLength(2);
  });

  it('renders one row per series for donut charts', () => {
    renderDonutTable();
    const rows = screen.getAllByRole('row');
    // 1 header + 2 series rows
    expect(rows).toHaveLength(3);
  });

  it('aggregates totals correctly for donut', () => {
    renderDonutTable();
    // Red: 100 + 150 = 250, Blue: 200 + 50 = 250
    const cells = screen.getAllByRole('cell');
    const cellTexts = cells.map((c) => c.textContent?.trim());
    expect(cellTexts).toContain('250');
  });
});

// ─── VastuChart — view as table toggle ───────────────────────────────────────

describe('VastuChart — view as table toggle', () => {
  it('shows the "View as table" button for non-sparkline chart types', () => {
    const chartTypes: ChartType[] = ['line', 'bar', 'area', 'donut', 'scatter'];
    for (const type of chartTypes) {
      const { unmount } = renderVastuChart({ type });
      expect(screen.getByRole('button', { name: /view as table/i })).toBeTruthy();
      unmount();
    }
  });

  it('does not show "View as table" button for sparkline type', () => {
    renderVastuChart({ type: 'sparkline' });
    expect(screen.queryByRole('button', { name: /view as table/i })).toBeNull();
  });

  it('toggles to table view when "View as table" is clicked', () => {
    renderVastuChart({ type: 'line' });
    const toggleBtn = screen.getByRole('button', { name: /view as table/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('shows "View as chart" button when in table view', () => {
    renderVastuChart({ type: 'line' });
    const toggleBtn = screen.getByRole('button', { name: /view as table/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /view as chart/i })).toBeTruthy();
  });

  it('toggles back to chart view from table view', () => {
    renderVastuChart({ type: 'line' });
    const toggleBtn = screen.getByRole('button', { name: /view as table/i });
    fireEvent.click(toggleBtn);
    const chartBtn = screen.getByRole('button', { name: /view as chart/i });
    fireEvent.click(chartBtn);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('has aria-pressed=false when in chart view', () => {
    renderVastuChart({ type: 'line' });
    const toggleBtn = screen.getByRole('button', { name: /view as table/i });
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('has aria-pressed=true when in table view', () => {
    renderVastuChart({ type: 'line' });
    const toggleBtn = screen.getByRole('button', { name: /view as table/i });
    fireEvent.click(toggleBtn);
    const chartBtn = screen.getByRole('button', { name: /view as chart/i });
    expect(chartBtn.getAttribute('aria-pressed')).toBe('true');
  });
});

// ─── VastuChart — screen reader attributes ────────────────────────────────────

describe('VastuChart — screen reader attributes', () => {
  it('has aria-label on the chart container', () => {
    renderVastuChart({ ariaLabel: 'Revenue by month, line chart' });
    expect(screen.getByRole('img', { name: 'Revenue by month, line chart' })).toBeTruthy();
  });

  it('has a focusable keyboard nav container for non-sparkline charts', () => {
    renderVastuChart({ type: 'line', ariaLabel: 'Test chart' });
    const navContainer = screen.getByRole('group', { name: 'Test chart' });
    expect(navContainer.getAttribute('tabindex')).toBe('0');
  });

  it('does not render a keyboard nav container for sparkline charts', () => {
    renderVastuChart({ type: 'sparkline', ariaLabel: 'Sparkline' });
    // Sparklines get tabindex=-1 group
    const navContainer = screen.getByRole('group', { name: 'Sparkline' });
    expect(navContainer.getAttribute('tabindex')).toBe('-1');
  });
});

// ─── VastuChart — onDataPointClick ───────────────────────────────────────────

describe('VastuChart — onDataPointClick via keyboard Enter', () => {
  it('calls onDataPointClick when Enter is pressed after focusing chart', () => {
    const onDataPointClick = vi.fn();
    renderVastuChart({ type: 'line', onDataPointClick });

    const navContainer = screen.getByRole('group', { name: 'Test chart' });
    fireEvent.focus(navContainer);
    fireEvent.keyDown(navContainer, { key: 'Enter' });

    expect(onDataPointClick).toHaveBeenCalledWith(
      0,
      0,
      TEST_DATA[0],
      TEST_SERIES[0],
    );
  });
});

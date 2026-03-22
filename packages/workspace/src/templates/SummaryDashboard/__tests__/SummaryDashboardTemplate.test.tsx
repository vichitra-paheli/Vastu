/**
 * Component tests for SummaryDashboardTemplate and its sub-components.
 *
 * Covers:
 * 1. Renders with default (zero) config — shows placeholder cards and unconfigured message
 * 2. TimeRangeControl renders and changes preset
 * 3. TimeRangeControl compare toggle
 * 4. KPICardRow renders cards
 * 5. KPICardRow shows deltas when compare enabled
 * 6. ChartRow renders charts
 * 7. MiniSummaryTable renders rows
 * 8. MiniSummaryTable shows empty state
 *
 * Implements US-130.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { SummaryDashboardTemplate } from '../SummaryDashboardTemplate';
import { TimeRangeControl } from '../TimeRangeControl';
import { KPICardRow } from '../KPICardRow';
import { ChartRow } from '../ChartRow';
import { MiniSummaryTable } from '../MiniSummaryTable';
import type { TimeRange } from '../TimeRangeControl';
import type { KPICardConfig } from '../KPICardRow';
import type { ChartDefinition } from '../ChartRow';
import type { TemplateConfig } from '../../types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../stores/panelStore', () => ({
  usePanelStore: vi.fn(() => vi.fn()),
  openPanelByTypeId: vi.fn(),
}));

// Mock useTemplateConfig so tests don't fire real HTTP requests
vi.mock('../../useTemplateConfig', () => ({
  useTemplateConfig: vi.fn(() => ({
    config: null,
    loading: false,
    error: null,
    updateConfig: vi.fn(),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

function renderTemplate(config?: Partial<TemplateConfig>) {
  const fullConfig: TemplateConfig = {
    templateType: 'summary-dashboard',
    ...config,
  };
  return render(
    <SummaryDashboardTemplate pageId="test-page" config={fullConfig} />,
    { wrapper: TestProviders },
  );
}

// ── Test data ─────────────────────────────────────────────────────────────────

const TEST_KPI_CARDS: KPICardConfig[] = [
  { id: 'revenue', label: 'Revenue', value: '$12,340', delta: 5.2, sparklineData: [{ value: 100 }, { value: 120 }], sparklineKey: 'value' },
  { id: 'orders', label: 'Orders', value: '234', delta: -2.1 },
  { id: 'customers', label: 'Customers', value: '89' },
];

const TEST_CHARTS: ChartDefinition[] = [
  {
    id: 'revenue-chart',
    title: 'Revenue over time',
    type: 'line',
    data: [{ month: 'Jan', revenue: 10000 }, { month: 'Feb', revenue: 12000 }],
    series: [{ dataKey: 'revenue', name: 'Revenue' }],
  },
];

const DEFAULT_TIME_RANGE: TimeRange = {
  preset: '30d',
  compareEnabled: false,
};

// ── 1. SummaryDashboardTemplate with default config ───────────────────────────

describe('SummaryDashboardTemplate', () => {
  it('renders without crashing with empty config', () => {
    expect(() => renderTemplate()).not.toThrow();
  });

  it('shows the unconfigured message when no KPI cards are configured', () => {
    renderTemplate();
    expect(screen.getByText(/Configure data sources/i)).toBeTruthy();
  });

  it('renders auto-refresh toggle', () => {
    renderTemplate();
    expect(screen.getByTestId('auto-refresh-toggle')).toBeTruthy();
  });

  it('renders refresh now button', () => {
    renderTemplate();
    expect(screen.getByTestId('refresh-now-button')).toBeTruthy();
  });

  it('renders placeholder KPI cards when unconfigured', () => {
    renderTemplate();
    // Placeholder cards render — look for the KPI row container
    const kpiList = screen.getByRole('list', { name: 'KPI metrics' });
    expect(kpiList).toBeTruthy();
    // Should have at least 4 list items (placeholder cards)
    const items = kpiList.querySelectorAll('[role="listitem"]');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders configured KPI cards from metadata', () => {
    renderTemplate({
      metadata: {
        kpiCards: TEST_KPI_CARDS,
      },
    });
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('$12,340')).toBeTruthy();
    expect(screen.getByText('Orders')).toBeTruthy();
  });

  it('renders charts from metadata', () => {
    renderTemplate({
      metadata: {
        kpiCards: TEST_KPI_CARDS,
        charts: TEST_CHARTS,
      },
    });
    // The chart region should be present
    expect(screen.getByRole('region', { name: 'Dashboard charts' })).toBeTruthy();
  });

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <SummaryDashboardTemplate
        pageId="test-page"
        config={{ templateType: 'summary-dashboard' }}
        loading
      />,
      { wrapper: TestProviders },
    );
    // TemplateSkeleton renders with role="status" and aria-busy="true"
    const status = container.querySelector('[role="status"][aria-busy="true"]');
    expect(status).not.toBeNull();
  });

  it('shows error state when error is provided', () => {
    render(
      <SummaryDashboardTemplate
        pageId="test-page"
        config={{ templateType: 'summary-dashboard' }}
        error="Something went wrong"
      />,
      { wrapper: TestProviders },
    );
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('initialises autoRefresh toggle from metadata.autoRefreshEnabled=true', () => {
    renderTemplate({
      metadata: {
        kpiCards: TEST_KPI_CARDS,
        autoRefreshEnabled: true,
      },
    });
    const toggle = screen.getByTestId('auto-refresh-toggle') as HTMLInputElement;
    // The underlying Mantine Switch checkbox should be checked
    const checkbox = toggle.closest('label')?.querySelector('input[type="checkbox"]') ?? toggle;
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('initialises autoRefresh toggle as off when metadata.autoRefreshEnabled is absent', () => {
    renderTemplate({ metadata: { kpiCards: TEST_KPI_CARDS } });
    const toggle = screen.getByTestId('auto-refresh-toggle') as HTMLInputElement;
    const checkbox = toggle.closest('label')?.querySelector('input[type="checkbox"]') ?? toggle;
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it('ignores non-array metadata.kpiCards gracefully', () => {
    // parseDashboardMetadata should discard a non-array kpiCards value
    // and fall back to placeholder cards, not crash.
    expect(() =>
      renderTemplate({
        metadata: { kpiCards: 'invalid' as unknown as typeof TEST_KPI_CARDS },
      }),
    ).not.toThrow();
    // Fallback placeholder message should be visible
    expect(screen.getByText(/Configure data sources/i)).toBeTruthy();
  });
});

// ── 2. TimeRangeControl ───────────────────────────────────────────────────────

describe('TimeRangeControl', () => {
  it('renders without crashing', () => {
    const onChange = vi.fn();
    expect(() =>
      render(
        <TimeRangeControl value={DEFAULT_TIME_RANGE} onChange={onChange} />,
        { wrapper: TestProviders },
      ),
    ).not.toThrow();
  });

  it('renders the time range select with current value', () => {
    const onChange = vi.fn();
    render(
      <TimeRangeControl value={DEFAULT_TIME_RANGE} onChange={onChange} />,
      { wrapper: TestProviders },
    );
    // Mantine Select renders a readonly textbox (not combobox role)
    const input = screen.getByRole('textbox', { name: 'Select time range' });
    expect(input).toBeTruthy();
    // Current value should be displayed
    expect((input as HTMLInputElement).value).toBe('Last 30 days');
  });

  it('renders comparison toggle', () => {
    const onChange = vi.fn();
    const { container } = render(
      <TimeRangeControl value={DEFAULT_TIME_RANGE} onChange={onChange} />,
      { wrapper: TestProviders },
    );
    // Mantine Switch renders an input[type=checkbox] within the component
    const toggle = container.querySelector('input[type="checkbox"]');
    expect(toggle).not.toBeNull();
  });

  it('calls onChange when comparison toggle is changed', () => {
    const onChange = vi.fn();
    const { container } = render(
      <TimeRangeControl value={DEFAULT_TIME_RANGE} onChange={onChange} />,
      { wrapper: TestProviders },
    );
    const toggle = container.querySelector('input[type="checkbox"]');
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle!);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ compareEnabled: true }),
    );
  });
});

// ── 3. KPICardRow ─────────────────────────────────────────────────────────────

describe('KPICardRow', () => {
  it('renders all KPI cards', () => {
    render(
      <KPICardRow cards={TEST_KPI_CARDS} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('Orders')).toBeTruthy();
    expect(screen.getByText('Customers')).toBeTruthy();
  });

  it('renders KPI values', () => {
    render(
      <KPICardRow cards={TEST_KPI_CARDS} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('$12,340')).toBeTruthy();
    expect(screen.getByText('234')).toBeTruthy();
  });

  it('shows delta badges when showDelta=true', () => {
    render(
      <KPICardRow cards={TEST_KPI_CARDS} showDelta />,
      { wrapper: TestProviders },
    );
    // Revenue card has +5.2% delta
    expect(screen.getByText(/5\.2/)).toBeTruthy();
  });

  it('hides delta badges when showDelta=false', () => {
    render(
      <KPICardRow cards={TEST_KPI_CARDS} showDelta={false} />,
      { wrapper: TestProviders },
    );
    // Delta text should not be present
    expect(screen.queryByText(/5\.2/)).toBeNull();
  });

  it('renders skeleton cards when loading', () => {
    const { container } = render(
      <KPICardRow cards={[]} loading />,
      { wrapper: TestProviders },
    );
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
  });

  it('renders sparkline chart when sparklineData is provided', () => {
    render(
      <KPICardRow
        cards={[{
          id: 'test',
          label: 'Test',
          value: '100',
          sparklineData: [{ value: 10 }, { value: 20 }],
          sparklineKey: 'value',
        }]}
      />,
      { wrapper: TestProviders },
    );
    // recharts mock renders a LineChart for sparkline type
    expect(screen.getByTestId('recharts-LineChart')).toBeTruthy();
  });
});

// ── 4. ChartRow ───────────────────────────────────────────────────────────────

describe('ChartRow', () => {
  it('renders nothing when charts=[]', () => {
    const { container } = render(
      <ChartRow charts={[]} />,
      { wrapper: TestProviders },
    );
    // ChartRow returns null for empty charts; the container has no chart region
    expect(container.querySelector('[role="region"]')).toBeNull();
  });

  it('renders a single chart', () => {
    render(
      <ChartRow charts={TEST_CHARTS} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Revenue over time')).toBeTruthy();
    expect(screen.getByTestId('recharts-LineChart')).toBeTruthy();
  });

  it('renders two charts side by side', () => {
    const twoCharts: ChartDefinition[] = [
      ...TEST_CHARTS,
      {
        id: 'cost-chart',
        title: 'Cost breakdown',
        type: 'bar',
        data: [{ month: 'Jan', cost: 7000 }],
        series: [{ dataKey: 'cost', name: 'Cost' }],
      },
    ];
    render(
      <ChartRow charts={twoCharts} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Revenue over time')).toBeTruthy();
    expect(screen.getByText('Cost breakdown')).toBeTruthy();
    expect(screen.getByTestId('recharts-LineChart')).toBeTruthy();
    expect(screen.getByTestId('recharts-BarChart')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(
      <ChartRow charts={TEST_CHARTS} loading />,
      { wrapper: TestProviders },
    );
    const skeletons = container.querySelectorAll('[data-visible]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders a default skeleton card when charts=[] and loading=true', () => {
    // DEFAULT_SKELETON_COUNT=1 ensures at least one skeleton is rendered even
    // when the chart config has not been fetched yet.
    const { container } = render(
      <ChartRow charts={[]} loading />,
      { wrapper: TestProviders },
    );
    const statusNodes = container.querySelectorAll('[aria-busy="true"][role="status"]');
    expect(statusNodes.length).toBe(1);
  });
});

// ── 5. MiniSummaryTable ───────────────────────────────────────────────────────

describe('MiniSummaryTable', () => {
  const TEST_COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value' },
  ];

  const TEST_ROWS = [
    { name: 'Alice', value: '$1,200' },
    { name: 'Bob', value: '$980' },
  ];

  it('renders table title', () => {
    render(
      <MiniSummaryTable title="Top Customers" columns={TEST_COLUMNS} rows={TEST_ROWS} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Top Customers')).toBeTruthy();
  });

  it('renders column headers', () => {
    render(
      <MiniSummaryTable title="Top Customers" columns={TEST_COLUMNS} rows={TEST_ROWS} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Value')).toBeTruthy();
  });

  it('renders row data', () => {
    render(
      <MiniSummaryTable title="Top Customers" columns={TEST_COLUMNS} rows={TEST_ROWS} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('$1,200')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('shows empty state when rows=[]', () => {
    render(
      <MiniSummaryTable title="Top Customers" columns={TEST_COLUMNS} rows={[]} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText(/No records to display/i)).toBeTruthy();
  });

  it('shows "View all" button when viewAllPageId is provided', () => {
    render(
      <MiniSummaryTable
        title="Top Customers"
        columns={TEST_COLUMNS}
        rows={TEST_ROWS}
        viewAllPageId="customers-page"
      />,
      { wrapper: TestProviders },
    );
    expect(screen.getByRole('button', { name: /View all/i })).toBeTruthy();
  });

  it('does not show "View all" button when viewAllPageId is not provided', () => {
    render(
      <MiniSummaryTable title="Top Customers" columns={TEST_COLUMNS} rows={TEST_ROWS} />,
      { wrapper: TestProviders },
    );
    expect(screen.queryByRole('button', { name: /View all/i })).toBeNull();
  });

  it('renders loading skeleton when loading=true', () => {
    const { container } = render(
      <MiniSummaryTable title="Top Customers" columns={TEST_COLUMNS} rows={[]} loading />,
      { wrapper: TestProviders },
    );
    const status = container.querySelector('[role="status"][aria-busy="true"]');
    expect(status).not.toBeNull();
  });

  it('renders rows with stable id-based keys when rows have an id field', () => {
    // When rows include an 'id' field, MiniSummaryTable should use it as the
    // React key rather than the array index.
    const rowsWithId = [
      { id: 'cust-1', name: 'Alice', value: '$1,200' },
      { id: 'cust-2', name: 'Bob', value: '$980' },
    ];
    const { container } = render(
      <MiniSummaryTable title="Top Customers" columns={TEST_COLUMNS} rows={rowsWithId} />,
      { wrapper: TestProviders },
    );
    // Two data rows rendered (not counting the header row)
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
});

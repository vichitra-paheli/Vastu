/**
 * DataExplorerTemplate component tests.
 *
 * Tests:
 * 1. Renders with default config (no loading, no error)
 * 2. Shows skeleton when loading=true
 * 3. Shows error alert when error is set
 * 4. Chart type toggle switches between chart modes
 * 5. Companion table renders with data rows
 * 6. Export CSV button is present
 * 7. Empty state when no measures selected
 * 8. ExplorerControls renders all three selectors
 *
 * Implements US-132 (AC-7, testing strategy).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { DataExplorerTemplate } from '../DataExplorerTemplate';
import { ChartTypeToggle } from '../ChartTypeToggle';
import { ExplorerControls } from '../ExplorerControls';
import {
  sanitizeCsvCell,
  escapeCsvCell,
  escapeCsvHeader,
  buildCsvString,
} from '../csvUtils';
import type { TemplateConfig } from '../../types';
import type { ExplorerChartMode } from '../types';

// ─── Mock VastuChart (Recharts can't run in jsdom) ───────────────────────────

vi.mock('../../../components/VastuChart', () => ({
  VastuChart: ({ type, ariaLabel }: { type: string; ariaLabel?: string }) => (
    <div data-testid="vastu-chart" data-chart-type={type} aria-label={ariaLabel}>
      Mock chart: {type}
    </div>
  ),
}));

// ─── Mock VastuTable ──────────────────────────────────────────────────────────

vi.mock('../../../components/VastuTable', () => ({
  VastuTable: ({ ariaLabel, data }: { ariaLabel?: string; data: unknown[] }) => (
    <div data-testid="vastu-table" aria-label={ariaLabel}>
      Mock table: {data.length} rows
    </div>
  ),
}));

// ─── Mock EmptyState ──────────────────────────────────────────────────────────

vi.mock('../../../components/EmptyState', () => ({
  EmptyState: ({ message }: { message: string }) => (
    <div data-testid="empty-state">{message}</div>
  ),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
}

interface RenderOptions {
  config?: Partial<TemplateConfig>;
  loading?: boolean;
  error?: string | null;
  onConfigChange?: (config: TemplateConfig) => void;
}

function renderTemplate(options: RenderOptions = {}) {
  const queryClient = createTestQueryClient();
  const {
    config = {},
    loading = false,
    error = null,
    onConfigChange = vi.fn(),
  } = options;

  const fullConfig: TemplateConfig = {
    templateType: 'data-explorer',
    fields: [],
    sections: [],
    metadata: {},
    ...config,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <DataExplorerTemplate
          pageId="test-page"
          config={fullConfig}
          loading={loading}
          error={error}
          onConfigChange={onConfigChange}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DataExplorerTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the explorer with default config', () => {
    renderTemplate();
    expect(screen.getByTestId('data-explorer-template')).toBeInTheDocument();
  });

  it('renders skeleton when loading is true', () => {
    const { container } = renderTemplate({ loading: true });
    // TemplateSkeleton renders a role="status" element
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-busy')).toBe('true');
    // The main template is NOT rendered
    expect(screen.queryByTestId('data-explorer-template')).toBeNull();
  });

  it('renders an error alert when error is set', () => {
    renderTemplate({ error: 'Something went wrong' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByTestId('data-explorer-template')).toBeNull();
  });

  it('renders the chart by default', () => {
    renderTemplate();
    expect(screen.getByTestId('vastu-chart')).toBeInTheDocument();
  });

  it('renders the companion table', () => {
    renderTemplate();
    expect(screen.getByTestId('vastu-table')).toBeInTheDocument();
  });

  it('shows the "Underlying data" table header label', () => {
    renderTemplate();
    expect(screen.getByText('Underlying data')).toBeInTheDocument();
  });

  it('renders the Export CSV button by aria-label', () => {
    renderTemplate();
    // The button has an aria-label "Export table data as CSV"
    const exportBtn = screen.getByRole('button', { name: /export table data as csv/i });
    expect(exportBtn).toBeInTheDocument();
  });

  it('renders the chart type toggle as a radiogroup', () => {
    renderTemplate();
    // Mantine SegmentedControl renders as role="radiogroup"
    const toggle = screen.getByRole('radiogroup', { name: /chart type/i });
    expect(toggle).toBeInTheDocument();
  });
});

// ─── ChartTypeToggle unit tests ───────────────────────────────────────────────

describe('ChartTypeToggle', () => {
  it('renders all chart mode options as radio inputs', () => {
    const onChange = vi.fn();
    render(
      <MantineProvider>
        <ChartTypeToggle value="bar" onChange={onChange} />
      </MantineProvider>,
    );
    // SegmentedControl renders role="radiogroup"
    const group = screen.getByRole('radiogroup', { name: /chart type/i });
    expect(group).toBeInTheDocument();
    // 6 options: line, bar, area, scatter, donut, table
    const inputs = screen.getAllByRole('radio');
    expect(inputs).toHaveLength(6);
  });

  it('calls onChange when a different option is selected', () => {
    const onChange = vi.fn();
    render(
      <MantineProvider>
        <ChartTypeToggle value="bar" onChange={onChange} />
      </MantineProvider>,
    );
    const radioInputs = screen.getAllByRole('radio');
    // Click the first radio (line)
    fireEvent.click(radioInputs[0]);
    expect(onChange).toHaveBeenCalled();
  });

  it('marks the current value as checked', () => {
    const modes: ExplorerChartMode[] = ['line', 'bar', 'area', 'scatter', 'donut', 'table'];
    for (const mode of modes) {
      const onChange = vi.fn();
      const { container, unmount } = render(
        <MantineProvider>
          <ChartTypeToggle value={mode} onChange={onChange} />
        </MantineProvider>,
      );
      const checked = container.querySelector('input[type="radio"]:checked');
      expect(checked).not.toBeNull();
      expect((checked as HTMLInputElement).value).toBe(mode);
      unmount();
    }
  });
});

// ─── ExplorerControls unit tests ──────────────────────────────────────────────

describe('ExplorerControls', () => {
  const dimensions = [
    { key: 'month', label: 'Month' },
    { key: 'region', label: 'Region' },
  ];
  const measures = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'units', label: 'Units Sold' },
  ];

  it('renders dimension, measure, and group-by selectors', () => {
    render(
      <MantineProvider>
        <ExplorerControls
          dimensions={dimensions}
          measures={measures}
          dimensionKey="month"
          onDimensionChange={vi.fn()}
          measureKeys={['revenue']}
          onMeasureChange={vi.fn()}
          groupByKey={null}
          onGroupByChange={vi.fn()}
        />
      </MantineProvider>,
    );
    // Each selector has a visible label rendered as a <label> element
    expect(screen.getByText('Dimension')).toBeInTheDocument();
    expect(screen.getByText('Measures')).toBeInTheDocument();
    expect(screen.getByText('Group by')).toBeInTheDocument();
  });
});

// ─── CSV utility unit tests ────────────────────────────────────────────────────

describe('sanitizeCsvCell', () => {
  it('prefixes values starting with = to prevent formula injection', () => {
    expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
  });

  it('prefixes values starting with + to prevent injection', () => {
    expect(sanitizeCsvCell('+cmd|\'dir\'')).toBe("'+cmd|'dir'");
  });

  it('prefixes values starting with - to prevent injection', () => {
    expect(sanitizeCsvCell('-2+3')).toBe("'-2+3");
  });

  it('prefixes values starting with @ to prevent injection', () => {
    expect(sanitizeCsvCell('@SUM(1)')).toBe("'@SUM(1)");
  });

  it('does not modify safe values', () => {
    expect(sanitizeCsvCell('hello world')).toBe('hello world');
    expect(sanitizeCsvCell('100')).toBe('100');
    expect(sanitizeCsvCell('')).toBe('');
  });
});

describe('escapeCsvCell', () => {
  it('returns empty quoted string for null', () => {
    expect(escapeCsvCell(null)).toBe('""');
  });

  it('returns empty quoted string for undefined', () => {
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it('wraps numeric values in quotes', () => {
    expect(escapeCsvCell(42000)).toBe('"42000"');
  });

  it('wraps string values in quotes', () => {
    expect(escapeCsvCell('hello')).toBe('"hello"');
  });

  it('escapes internal double-quotes by doubling', () => {
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
  });

  it('sanitizes injection characters before quoting', () => {
    expect(escapeCsvCell('=HYPERLINK("evil.com")')).toBe(`"'=HYPERLINK(""evil.com"")"`);
  });
});

describe('escapeCsvHeader', () => {
  it('wraps header labels in double-quotes', () => {
    expect(escapeCsvHeader('Revenue')).toBe('"Revenue"');
  });

  it('escapes internal double-quotes in headers', () => {
    expect(escapeCsvHeader('Say "Hi"')).toBe('"Say ""Hi"""');
  });
});

describe('buildCsvString', () => {
  it('returns empty string when data is empty', () => {
    const cols = [{ id: 'name', label: 'Name', accessorKey: 'name', dataType: 'text' as const, sortable: true }];
    expect(buildCsvString([], cols)).toBe('');
  });

  it('returns empty string when columns are empty', () => {
    expect(buildCsvString([{ name: 'Alice' }], [])).toBe('');
  });

  it('generates quoted headers and data rows', () => {
    const cols = [
      { id: 'month', label: 'Month', accessorKey: 'month', dataType: 'text' as const, sortable: true },
      { id: 'revenue', label: 'Revenue', accessorKey: 'revenue', dataType: 'number' as const, sortable: true },
    ];
    const data = [{ month: 'Jan', revenue: 42000 }];
    const result = buildCsvString(data, cols);
    expect(result).toBe('"Month","Revenue"\n"Jan","42000"');
  });

  it('sanitizes injection characters in cell values', () => {
    const cols = [
      { id: 'formula', label: 'Formula', accessorKey: 'formula', dataType: 'text' as const, sortable: true },
    ];
    const data = [{ formula: '=SUM(A1)' }];
    const result = buildCsvString(data, cols);
    // Cell should be prefixed with single-quote then wrapped in double-quotes
    expect(result).toContain("\"'=SUM(A1)\"");
  });

  it('handles null/undefined cell values as empty quoted strings', () => {
    const cols = [
      { id: 'val', label: 'Value', accessorKey: 'val', dataType: 'text' as const, sortable: true },
    ];
    const data = [{ val: null }, { val: undefined }];
    const result = buildCsvString(data, cols);
    expect(result).toBe('"Value"\n""\n""');
  });
});

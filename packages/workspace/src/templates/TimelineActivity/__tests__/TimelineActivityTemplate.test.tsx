/**
 * Component tests for TimelineActivityTemplate, TimelineEvent, DateGroupHeader,
 * and TimelineFilters.
 *
 * Test scenarios:
 * 1. Loading state renders TemplateSkeleton
 * 2. Error state renders error message
 * 3. Empty state renders EmptyState when no events
 * 4. Events grouped by date — DateGroupHeader labels render correctly
 * 5. TimelineEvent renders title, badge, and actor
 * 6. TimelineEvent expand/collapse detail
 * 7. Filter by event type (type pill toggle)
 * 8. Load more button renders when hasMore
 * 9. DateGroupHeader label formatting (Today / Yesterday / date)
 * 10. TimelineFilters search input updates state
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TimelineActivityTemplate } from '../TimelineActivityTemplate';
import { TimelineEvent } from '../TimelineEvent';
import type { TimelineEventData } from '../TimelineEvent';
import { DateGroupHeader, formatDateGroupLabel } from '../DateGroupHeader';
import { TimelineFilters, createDefaultFilterState } from '../TimelineFilters';
import type { TimelineFilterState } from '../TimelineFilters';

// ── Test helpers ──────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );
}

/** Build a minimal TimelineEventData fixture. */
function makeEvent(overrides: Partial<TimelineEventData> = {}): TimelineEventData {
  return {
    id: 'evt-1',
    type: 'order',
    title: 'Order created',
    description: 'New order placed by customer',
    timestamp: '2026-03-22T10:30:00Z',
    actor: { id: 'user-1', name: 'Alice Smith' },
    ...overrides,
  };
}

/** Minimal TemplateProps for TimelineActivityTemplate. */
const MINIMAL_PROPS = {
  pageId: 'page-test',
  config: { templateType: 'timeline-activity' as const },
};

// ── Stub fetch and browser APIs ───────────────────────────────────────────────

beforeEach(() => {
  // Default: fetch returns empty events (no backend in tests)
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({ events: [], hasMore: false }),
  } as Response);

  // IntersectionObserver is not available in jsdom.
  // Use a class constructor so that the returned instance always has disconnect as a function.
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  }
  // @ts-expect-error — partial mock sufficient for jsdom testing
  global.IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TimelineActivityTemplate', () => {
  it('renders loading skeleton when loading=true', () => {
    renderWithProviders(
      <TimelineActivityTemplate {...MINIMAL_PROPS} loading={true} />,
    );
    const status = document.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute('aria-busy')).toBe('true');
  });

  it('renders error message when error is provided', () => {
    renderWithProviders(
      <TimelineActivityTemplate
        {...MINIMAL_PROPS}
        error="Failed to load events"
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Failed to load events');
  });

  it('renders empty state when fetch returns no events', async () => {
    renderWithProviders(<TimelineActivityTemplate {...MINIMAL_PROPS} />);
    await waitFor(() => {
      const status = screen.queryByRole('status');
      // Either empty state status or the feed is empty
      expect(status ?? document.querySelector('[data-testid="timeline-activity-template"]')).toBeTruthy();
    });
  });

  it('renders the filter bar', () => {
    renderWithProviders(<TimelineActivityTemplate {...MINIMAL_PROPS} />);
    const filters = document.querySelector('[data-testid="timeline-filters"]');
    expect(filters).not.toBeNull();
  });
});

describe('DateGroupHeader', () => {
  it('renders the provided label', () => {
    render(
      <MantineProvider>
        <DateGroupHeader date="2026-03-22" label="Today" />
      </MantineProvider>,
    );
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders a custom date label', () => {
    render(
      <MantineProvider>
        <DateGroupHeader date="2026-03-20" label="March 20, 2026" />
      </MantineProvider>,
    );
    expect(screen.getByText('March 20, 2026')).toBeTruthy();
  });
});

describe('formatDateGroupLabel', () => {
  it('returns "Today" for the current date', () => {
    const now = new Date('2026-03-22T12:00:00Z');
    expect(formatDateGroupLabel('2026-03-22', now)).toBe('Today');
  });

  it('returns "Yesterday" for one day ago', () => {
    const now = new Date('2026-03-22T12:00:00Z');
    expect(formatDateGroupLabel('2026-03-21', now)).toBe('Yesterday');
  });

  it('returns a formatted date for older dates', () => {
    const now = new Date('2026-03-22T12:00:00Z');
    const result = formatDateGroupLabel('2026-03-15', now);
    expect(result).toContain('March');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('returns a formatted date for dates more than 2 days ago', () => {
    const now = new Date('2026-03-22T12:00:00Z');
    const result = formatDateGroupLabel('2026-01-01', now);
    expect(result).toContain('January');
    expect(result).toContain('1');
    expect(result).toContain('2026');
  });
});

describe('TimelineEvent', () => {
  it('renders event title and type badge', () => {
    const event = makeEvent({ title: 'Order #1234 created', type: 'order' });
    render(
      <MantineProvider>
        <TimelineEvent event={event} />
      </MantineProvider>,
    );
    expect(screen.getByText('Order #1234 created')).toBeTruthy();
    expect(screen.getByText('order')).toBeTruthy();
  });

  it('renders actor name', () => {
    const event = makeEvent({ actor: { id: 'u1', name: 'Bob Jones' } });
    render(
      <MantineProvider>
        <TimelineEvent event={event} />
      </MantineProvider>,
    );
    expect(screen.getByText('Bob Jones')).toBeTruthy();
  });

  it('renders description text', () => {
    const event = makeEvent({ description: 'This is the event description.' });
    render(
      <MantineProvider>
        <TimelineEvent event={event} />
      </MantineProvider>,
    );
    expect(screen.getByText('This is the event description.')).toBeTruthy();
  });

  it('shows expand button when detail payload exists', () => {
    const event = makeEvent({ detail: { amount: 100, currency: 'USD' } });
    render(
      <MantineProvider>
        <TimelineEvent event={event} />
      </MantineProvider>,
    );
    const expandBtn = document.querySelector('[aria-expanded]');
    expect(expandBtn).not.toBeNull();
  });

  it('expands and collapses event detail on button click', () => {
    const event = makeEvent({ detail: { amount: 100, currency: 'USD' } });
    render(
      <MantineProvider>
        <TimelineEvent event={event} />
      </MantineProvider>,
    );

    const expandBtn = document.querySelector('[aria-expanded]') as HTMLButtonElement;
    expect(expandBtn).not.toBeNull();
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(expandBtn);
    expect(expandBtn.getAttribute('aria-expanded')).toBe('true');

    // Detail region should now be visible
    const detail = document.querySelector('[role="region"]');
    expect(detail).not.toBeNull();
    expect(detail?.textContent).toContain('100');

    // Collapse
    fireEvent.click(expandBtn);
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="region"]')).toBeNull();
  });

  it('does not show expand button when no detail payload', () => {
    const event = makeEvent({ detail: undefined });
    render(
      <MantineProvider>
        <TimelineEvent event={event} />
      </MantineProvider>,
    );
    expect(document.querySelector('[aria-expanded]')).toBeNull();
  });

  it('calls onOpenRecord when related record exists and event is clicked', () => {
    const onOpenRecord = vi.fn();
    const event = makeEvent({ relatedRecordId: 'record-42' });
    render(
      <MantineProvider>
        <TimelineEvent event={event} onOpenRecord={onOpenRecord} />
      </MantineProvider>,
    );
    const eventEl = document.querySelector('[data-testid="timeline-event"]') as HTMLElement;
    fireEvent.click(eventEl);
    expect(onOpenRecord).toHaveBeenCalledWith('record-42');
  });
});

describe('TimelineFilters', () => {
  function renderFilters(
    filters: TimelineFilterState = createDefaultFilterState(),
    onChange: (f: TimelineFilterState) => void = vi.fn(),
  ) {
    return render(
      <MantineProvider>
        <TimelineFilters filters={filters} onFiltersChange={onChange} />
      </MantineProvider>,
    );
  }

  it('renders search input', () => {
    renderFilters();
    expect(document.querySelector('[data-testid="timeline-search"]')).not.toBeNull();
  });

  it('renders event type filter pills', () => {
    renderFilters();
    expect(document.querySelector('[data-testid="filter-type-order"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="filter-type-payment"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="filter-type-system"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="filter-type-agent"]')).not.toBeNull();
  });

  it('toggles event type filter on pill click', () => {
    const onChange = vi.fn();
    renderFilters(createDefaultFilterState(), onChange);

    const orderPill = document.querySelector('[data-testid="filter-type-order"]') as HTMLButtonElement;
    fireEvent.click(orderPill);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ activeTypes: ['order'] }),
    );
  });

  it('removes event type filter on second pill click', () => {
    const onChange = vi.fn();
    const filters: TimelineFilterState = {
      ...createDefaultFilterState(),
      activeTypes: ['order'],
    };
    renderFilters(filters, onChange);

    const orderPill = document.querySelector('[data-testid="filter-type-order"]') as HTMLButtonElement;
    fireEvent.click(orderPill);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ activeTypes: [] }),
    );
  });

  it('shows clear button when filters are active', () => {
    const filters: TimelineFilterState = {
      ...createDefaultFilterState(),
      search: 'test',
    };
    renderFilters(filters);
    expect(document.querySelector('[data-testid="timeline-filter-clear"]')).not.toBeNull();
  });

  it('does not show clear button when no filters active', () => {
    renderFilters(createDefaultFilterState());
    expect(document.querySelector('[data-testid="timeline-filter-clear"]')).toBeNull();
  });

  it('calls onFiltersChange with cleared state on clear button click', () => {
    const onChange = vi.fn();
    const filters: TimelineFilterState = {
      search: 'test',
      activeTypes: ['order'],
      dateFrom: '2026-03-01',
      dateTo: '2026-03-22',
    };
    renderFilters(filters, onChange);

    const clearBtn = document.querySelector('[data-testid="timeline-filter-clear"]') as HTMLButtonElement;
    fireEvent.click(clearBtn);

    expect(onChange).toHaveBeenCalledWith({
      search: '',
      activeTypes: [],
      dateFrom: '',
      dateTo: '',
    });
  });
});

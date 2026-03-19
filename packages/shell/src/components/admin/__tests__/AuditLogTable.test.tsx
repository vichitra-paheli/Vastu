/**
 * AuditLogTable tests — VASTU-0-036
 *
 * Tests:
 * - Renders filter controls (date range, user, action, resource type dropdowns)
 * - Renders Export CSV button
 * - Shows skeleton while loading
 * - Shows empty state when no events are returned
 * - Renders table rows once events load
 * - Shows pagination when total > PAGE_SIZE
 * - "Clear filters" button appears only when filters are active
 * - Row click does not throw (drawer integration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { TestProviders } from '@/test-utils/providers';
import { AuditLogTable } from '../AuditLogTable';
import type { AuditEvent } from '@vastu/shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const makeEvent = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id: 'evt-1',
  userId: 'user-1',
  userName: 'Alice Admin',
  action: 'Create',
  resourceType: 'ApiKey',
  resourceId: 'key-1',
  resourceDescription: 'API key "CI pipeline"',
  payload: { keyName: 'CI pipeline' },
  beforeState: null,
  afterState: null,
  ipAddress: '10.0.0.1',
  userAgent: 'Mozilla/5.0',
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  createdAt: new Date('2026-03-18T10:00:00Z'),
  ...overrides,
});

const defaultProps = {
  userOptions: [
    { value: 'user-1', label: 'Alice Admin (admin@vastu.dev)' },
    { value: 'user-2', label: 'Bob Editor (editor@vastu.dev)' },
  ],
  resourceTypeOptions: ['ApiKey', 'User', 'Role'],
};

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchSuccess(events: AuditEvent[], total?: number) {
  const resolvedTotal = total ?? events.length;
  // Serialise createdAt to string as the API would return
  const serialised = events.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }));
  vi.mocked(globalThis.fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ events: serialised, total: resolvedTotal, page: 1, limit: 50 }),
  } as Response);
}

function mockFetchError() {
  vi.mocked(globalThis.fetch).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'Internal server error' }),
  } as Response);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuditLogTable', () => {
  it('renders filter controls', async () => {
    mockFetchSuccess([]);
    renderComponent(<AuditLogTable {...defaultProps} />);

    // Filter labels should be visible
    expect(screen.getByText('From date')).toBeInTheDocument();
    expect(screen.getByText('To date')).toBeInTheDocument();
    // "User" and "Action" appear as both filter labels and table column headers — check at least one
    expect(screen.getAllByText('User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Action').length).toBeGreaterThan(0);
    expect(screen.getByText('Resource type')).toBeInTheDocument();

    // Wait for the fetch to complete
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });

  it('renders the Export CSV button', async () => {
    mockFetchSuccess([]);
    renderComponent(<AuditLogTable {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });

  it('shows skeleton loading state while fetching', () => {
    // Delay the fetch so we can observe the loading state
    vi.mocked(globalThis.fetch).mockReturnValueOnce(new Promise(() => undefined));
    renderComponent(<AuditLogTable {...defaultProps} />);
    // Mantine Skeleton renders a div with role="presentation" or just as a div
    // We verify table is NOT present yet (loading state replaces it)
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows empty state when no events are returned (no filters active)', async () => {
    mockFetchSuccess([]);
    renderComponent(<AuditLogTable {...defaultProps} />);
    await waitFor(() =>
      expect(
        screen.getByText('No audit events have been recorded yet.'),
      ).toBeInTheDocument(),
    );
  });

  it('renders table rows for returned events', async () => {
    const event = makeEvent();
    mockFetchSuccess([event]);
    renderComponent(<AuditLogTable {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument());
    expect(screen.getByText('API key "CI pipeline"')).toBeInTheDocument();
    // The action badge
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders table column headers', async () => {
    const event = makeEvent();
    mockFetchSuccess([event]);
    renderComponent(<AuditLogTable {...defaultProps} />);

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    const table = screen.getByRole('table');
    const headers = table.querySelectorAll('th');
    const headerTexts = Array.from(headers).map((h) => h.textContent?.trim());
    expect(headerTexts).toContain('Timestamp');
    expect(headerTexts).toContain('User');
    expect(headerTexts).toContain('Action');
    expect(headerTexts).toContain('Resource');
  });

  it('shows error message when fetch fails', async () => {
    mockFetchError();
    renderComponent(<AuditLogTable {...defaultProps} />);
    await waitFor(() =>
      expect(
        screen.getByText('Failed to load audit events. Please try again.'),
      ).toBeInTheDocument(),
    );
  });

  it('does not show "Clear filters" when no filters are active', async () => {
    mockFetchSuccess([]);
    renderComponent(<AuditLogTable {...defaultProps} />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('shows "Clear filters" button after applying an action filter', async () => {
    const user = userEvent.setup();
    // First fetch (initial load)
    mockFetchSuccess([]);
    renderComponent(<AuditLogTable {...defaultProps} />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

    // Second fetch (after filter change)
    mockFetchSuccess([]);

    // Open the Action select dropdown and pick "Create"
    const actionCombobox = screen.getByPlaceholderText('All actions');
    await user.click(actionCombobox);
    const createOption = await screen.findByRole('option', { name: 'Create' });
    await user.click(createOption);

    await waitFor(() => expect(screen.getByText('Clear filters')).toBeInTheDocument());
  });

  it('shows pagination controls when total > 50', async () => {
    // Return 50 events but total = 120 so multiple pages exist
    const events = Array.from({ length: 50 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, userName: `User ${i}` }),
    );
    mockFetchSuccess(events, 120);
    renderComponent(<AuditLogTable {...defaultProps} />);

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    // Pagination component renders numbered buttons; check for page 2
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  });

  it('shows the count summary when events are loaded', async () => {
    const event = makeEvent();
    mockFetchSuccess([event], 1);
    renderComponent(<AuditLogTable {...defaultProps} />);

    await waitFor(() => expect(screen.getByText(/Showing/)).toBeInTheDocument());
    expect(screen.getByText(/of/)).toBeInTheDocument();
    expect(screen.getByText(/results/)).toBeInTheDocument();
  });

  it('clicking a row does not throw (drawer integration)', async () => {
    const user = userEvent.setup();
    const event = makeEvent();
    mockFetchSuccess([event]);
    renderComponent(<AuditLogTable {...defaultProps} />);

    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument());

    const row = screen.getByText('Alice Admin').closest('tr');
    expect(row).not.toBeNull();
    // Should not throw
    await user.click(row!);
    // Drawer should open — look for the drawer title
    expect(await screen.findByText('Event detail')).toBeInTheDocument();
  });
});

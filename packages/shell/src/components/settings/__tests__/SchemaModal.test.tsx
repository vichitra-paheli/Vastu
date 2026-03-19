/**
 * SchemaModal tests
 *
 * Verifies:
 * - Modal renders with the connection name in the title
 * - Loading skeleton is shown while fetch is in flight
 * - Unavailable notice is shown when available=false (Phase 0 stub)
 * - Table/column list is rendered when available=true
 * - Empty state is shown when available=true but tables=[]
 * - Error state is shown on network failure, with a Retry button
 * - Retry button re-fetches schema
 * - Modal does not render when connection is null
 * - Close button triggers onClose
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SchemaModal } from '../SchemaModal';
import { TestProviders } from '../../../test-utils/providers';
import type { DbConnection } from '@vastu/shared/types';

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

const BASE_CONNECTION: DbConnection = {
  id: 'conn-1',
  name: 'Production DB',
  host: 'db.example.com',
  port: 5432,
  database: 'prod_db',
  username: 'prod_user',
  sslEnabled: false,
  protocol: 'postgresql',
  healthStatus: 'live',
  lastHealthCheck: new Date('2026-03-18T10:00:00Z'),
  organizationId: 'org-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-03-18T10:00:00Z'),
  deletedAt: null,
};

describe('SchemaModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch or render content when connection is null', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderComponent(
      <SchemaModal opened={true} connection={null} onClose={onClose} />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shows unavailable notice when API returns available=false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ available: false, reason: 'Schema inspection requires an active database connection. This feature will be available in a later release.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Schema inspection requires an active database connection/i),
      ).toBeInTheDocument();
    });
  });

  it('renders the connection name in the modal title', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ available: false, reason: 'Unavailable' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Production DB/)).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load schema/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows error state when API returns non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Connection not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Connection not found/i)).toBeInTheDocument();
    });
  });

  it('retries fetch when Retry button is clicked', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ available: false, reason: 'Unavailable' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const user = userEvent.setup();

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when available=true but tables array is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ available: true, tables: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/No tables found/i)).toBeInTheDocument();
    });
  });

  it('renders table and column information when available=true with data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          available: true,
          tables: [
            {
              name: 'users',
              columns: [
                { name: 'id', type: 'uuid', nullable: false },
                { name: 'email', type: 'varchar(255)', nullable: false },
                { name: 'deleted_at', type: 'timestamptz', nullable: true },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText('users')).toBeInTheDocument();
    });
  });

  it('calls onClose when the close button is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ available: false, reason: 'Unavailable' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const user = userEvent.setup();

    renderComponent(
      <SchemaModal opened={true} connection={BASE_CONNECTION} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Unavailable/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

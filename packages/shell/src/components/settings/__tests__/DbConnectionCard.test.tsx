/**
 * DbConnectionCard tests — US-016 AC-2, AC-5
 *
 * Verifies:
 * - Connection name is rendered
 * - Masked connection string is rendered (monospace)
 * - Health status dot is present with correct aria-label
 * - Protocol badge is rendered
 * - SSL badge only shown when SSL is enabled
 * - Last checked timestamp renders
 * - Overflow menu contains the expected actions
 * - Menu action callbacks fire correctly
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DbConnectionCard } from '../DbConnectionCard';
import { TestProviders } from '../../../test-utils/providers';
import type { DbConnection } from '@vastu/shared/types';

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

const BASE_CONNECTION: DbConnection = {
  id: 'test-id-1',
  name: 'Production Database',
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

describe('DbConnectionCard', () => {
  const onEdit = vi.fn();
  const onTest = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    onEdit.mockReset();
    onTest.mockReset();
    onDelete.mockReset();
  });

  it('renders the connection name', () => {
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('Production Database')).toBeInTheDocument();
  });

  it('renders the protocol badge', () => {
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('postgresql')).toBeInTheDocument();
  });

  it('renders a health status dot with aria-label for live status', () => {
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    const dot = screen.getByRole('status', { name: 'Live' });
    expect(dot).toBeInTheDocument();
  });

  it('renders a health status dot with aria-label for error status', () => {
    renderComponent(
      <DbConnectionCard
        connection={{ ...BASE_CONNECTION, healthStatus: 'error' }}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByRole('status', { name: 'Error' })).toBeInTheDocument();
  });

  it('renders a health status dot with aria-label for idle status', () => {
    renderComponent(
      <DbConnectionCard
        connection={{ ...BASE_CONNECTION, healthStatus: 'idle' }}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByRole('status', { name: 'Idle' })).toBeInTheDocument();
  });

  it('does not render SSL badge when SSL is disabled', () => {
    renderComponent(
      <DbConnectionCard
        connection={{ ...BASE_CONNECTION, sslEnabled: false }}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.queryByText('SSL')).not.toBeInTheDocument();
  });

  it('renders SSL badge when SSL is enabled', () => {
    renderComponent(
      <DbConnectionCard
        connection={{ ...BASE_CONNECTION, sslEnabled: true }}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('SSL')).toBeInTheDocument();
  });

  it('renders the last-checked timestamp label', () => {
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText(/Last checked/i)).toBeInTheDocument();
  });

  it('shows "Never" when lastHealthCheck is null', () => {
    renderComponent(
      <DbConnectionCard
        connection={{ ...BASE_CONNECTION, lastHealthCheck: null }}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText(/Never/)).toBeInTheDocument();
  });

  it('renders the overflow menu trigger button', () => {
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(
      screen.getByRole('button', { name: `Options for ${BASE_CONNECTION.name}` }),
    ).toBeInTheDocument();
  });

  it('calls onEdit when Edit menu item is clicked', async () => {
    const user = userEvent.setup();
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Options for/i }));
    await user.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onTest when Test connection menu item is clicked', async () => {
    const user = userEvent.setup();
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Options for/i }));
    await user.click(screen.getByText('Test connection'));
    expect(onTest).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Delete menu item is clicked', async () => {
    const user = userEvent.setup();
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Options for/i }));
    await user.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not show View schema menu item when onViewSchema is not provided', async () => {
    const user = userEvent.setup();
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Options for/i }));
    expect(screen.queryByText('View schema')).not.toBeInTheDocument();
  });

  it('shows View schema menu item when onViewSchema is provided', async () => {
    const onViewSchema = vi.fn();
    const user = userEvent.setup();
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
        onViewSchema={onViewSchema}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Options for/i }));
    expect(screen.getByText('View schema')).toBeInTheDocument();
  });

  it('calls onViewSchema when View schema menu item is clicked', async () => {
    const onViewSchema = vi.fn();
    const user = userEvent.setup();
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
        onViewSchema={onViewSchema}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Options for/i }));
    await user.click(screen.getByText('View schema'));
    expect(onViewSchema).toHaveBeenCalledTimes(1);
  });

  it('renders a masked connection string (contains bullet characters)', () => {
    renderComponent(
      <DbConnectionCard
        connection={BASE_CONNECTION}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    // The masked string should have the first 8 chars and last 4 chars visible
    // "db.exampl••••••••d_db" or similar — we just check it's present somewhere
    const text = document.body.textContent ?? '';
    // Should contain bullet chars since host+port+database string is long enough to mask
    expect(text).toMatch(/[•]/);
  });

  it('renders unknown status dot when healthStatus is unrecognised', () => {
    renderComponent(
      <DbConnectionCard
        connection={{ ...BASE_CONNECTION, healthStatus: 'connecting' }}
        onEdit={onEdit}
        onTest={onTest}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByRole('status', { name: 'Unknown' })).toBeInTheDocument();
  });
});

/**
 * ApiKeyTable tests — VASTU-0-029
 *
 * Tests:
 * - Renders table rows for provided keys
 * - Scope badges have correct labels for 'full' and 'read_only'
 * - Shows empty state when no keys are provided
 * - Generate button opens the generate modal
 * - "Never" shown when lastUsedAt is null
 * - Action menu is present per row
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { TestProviders } from '../../../test-utils/providers';
import { ApiKeyTable } from '../ApiKeyTable';
import type { ApiKey } from '@vastu/shared/types';

// Stub fetch so network calls don't fail in unit tests
globalThis.fetch = vi.fn();

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

const baseKey: ApiKey = {
  id: 'key-1',
  name: 'CI pipeline',
  keyPrefix: 'sk_live_ab12',
  scope: 'full',
  description: 'Used for CI',
  lastUsedAt: null,
  requestCount24h: 0,
  userId: 'user-1',
  organizationId: 'org-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

const readOnlyKey: ApiKey = {
  ...baseKey,
  id: 'key-2',
  name: 'Data export',
  scope: 'read_only',
  lastUsedAt: new Date('2026-02-01'),
};

describe('ApiKeyTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no keys are provided', () => {
    renderComponent(<ApiKeyTable initialKeys={[]} />);
    expect(
      screen.getByText('No API keys yet. Generate one to enable programmatic access.'),
    ).toBeInTheDocument();
  });

  it('renders the Generate button', () => {
    renderComponent(<ApiKeyTable initialKeys={[]} />);
    expect(screen.getAllByRole('button', { name: /generate/i }).length).toBeGreaterThan(0);
  });

  it('renders a table row for each key', () => {
    renderComponent(<ApiKeyTable initialKeys={[baseKey, readOnlyKey]} />);
    expect(screen.getByText('CI pipeline')).toBeInTheDocument();
    expect(screen.getByText('Data export')).toBeInTheDocument();
  });

  it('shows "Full" badge for scope=full', () => {
    renderComponent(<ApiKeyTable initialKeys={[baseKey]} />);
    const badges = screen.getAllByTestId('scope-badge');
    const fullBadge = badges.find((b) => b.getAttribute('data-scope') === 'full');
    expect(fullBadge).toBeInTheDocument();
    expect(fullBadge).toHaveTextContent('Full');
  });

  it('shows "Read only" badge for scope=read_only', () => {
    renderComponent(<ApiKeyTable initialKeys={[readOnlyKey]} />);
    const badges = screen.getAllByTestId('scope-badge');
    const readOnlyBadge = badges.find((b) => b.getAttribute('data-scope') === 'read_only');
    expect(readOnlyBadge).toBeInTheDocument();
    expect(readOnlyBadge).toHaveTextContent('Read only');
  });

  it('shows "Never" when lastUsedAt is null', () => {
    renderComponent(<ApiKeyTable initialKeys={[baseKey]} />);
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('shows relative time when lastUsedAt is set', () => {
    renderComponent(<ApiKeyTable initialKeys={[readOnlyKey]} />);
    // relativeTime returns something like "Xmo ago" or similar — just verify it's not "Never"
    const neverElements = screen.queryAllByText('Never');
    // There is one row (readOnlyKey has lastUsedAt set), so "Never" should not appear for that row
    // But we have 1 key with lastUsedAt, so no "Never" at all
    expect(neverElements).toHaveLength(0);
  });

  it('renders an action menu button per row', () => {
    renderComponent(<ApiKeyTable initialKeys={[baseKey, readOnlyKey]} />);
    const menuButtons = screen.getAllByRole('button', { name: 'Key options' });
    expect(menuButtons).toHaveLength(2);
  });

  it('opens the generate modal when the Generate button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent(<ApiKeyTable initialKeys={[]} />);
    // Click the Generate button in the empty state
    const generateButtons = screen.getAllByRole('button', { name: /generate/i });
    await user.click(generateButtons[0]!);
    // Modal should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Generate API key')).toBeInTheDocument();
  });

  it('opens the revoke dialog when Revoke is clicked in the overflow menu', async () => {
    const user = userEvent.setup();
    renderComponent(<ApiKeyTable initialKeys={[baseKey]} />);
    // Open the overflow menu
    const menuBtn = screen.getByRole('button', { name: 'Key options' });
    await user.click(menuBtn);
    // Click Revoke
    const revokeItem = await screen.findByText('Revoke');
    await user.click(revokeItem);
    // Confirmation dialog should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Revoke API key')).toBeInTheDocument();
  });

  it('table header columns are visible', () => {
    renderComponent(<ApiKeyTable initialKeys={[baseKey]} />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Name')).toBeInTheDocument();
    expect(within(table).getByText('Key')).toBeInTheDocument();
    expect(within(table).getByText('Scope')).toBeInTheDocument();
    expect(within(table).getByText('Last used')).toBeInTheDocument();
  });
});

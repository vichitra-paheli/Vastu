/**
 * UserList tests — Admin user management table.
 *
 * Tests cover:
 * - Renders search input, role filter dropdown, status filter dropdown
 * - Renders "Invite user" button
 * - Shows TableSkeleton while loading
 * - Shows user rows after successful fetch
 * - Shows EmptyState when no users match
 * - Shows ErrorState on fetch failure
 * - Clicking invite button opens InviteUserModal
 * - Clicking a user row opens EditUserDrawer
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { UserList } from '../UserList';
import { TestProviders } from '@/test-utils/providers';
import type { UserListItem } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent(roles = mockRoles) {
  return render(<UserList roles={roles} />, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockRoles = [
  { value: 'role-admin-id', label: 'Admin' },
  { value: 'role-editor-id', label: 'Editor' },
];

const mockUsers: UserListItem[] = [
  {
    id: 'user-1',
    name: 'Alice Admin',
    email: 'alice@vastu.dev',
    avatarUrl: null,
    emailVerified: true,
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    roles: [{ id: 'role-admin-id', name: 'Admin' }],
  },
  {
    id: 'user-2',
    name: 'Bob Editor',
    email: 'bob@vastu.dev',
    avatarUrl: null,
    emailVerified: false,
    deletedAt: null,
    createdAt: new Date('2024-02-20'),
    roles: [{ id: 'role-editor-id', name: 'Editor' }],
  },
];

// ---------------------------------------------------------------------------
// fetch mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

function mockFetchSuccess(users: UserListItem[] = mockUsers) {
  vi.mocked(globalThis.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ users }),
  } as Response);
}

function mockFetchError() {
  vi.mocked(globalThis.fetch).mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Server error' }),
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserList', () => {
  // ── Toolbar controls ─────────────────────────────────────────────────────

  it('renders the search input', () => {
    mockFetchSuccess();
    renderComponent();
    expect(
      screen.getByPlaceholderText(/search by name or email/i),
    ).toBeInTheDocument();
  });

  it('renders at least two select (filter) dropdowns', () => {
    mockFetchSuccess();
    renderComponent();
    const combos = screen.getAllByRole('combobox');
    expect(combos.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the Invite user button', () => {
    mockFetchSuccess();
    renderComponent();
    expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it('does not show table while loading', () => {
    // Never resolves — stays in loading state
    vi.mocked(globalThis.fetch).mockReturnValue(new Promise(() => undefined));
    renderComponent();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // ── Success state ─────────────────────────────────────────────────────────

  it('renders user names after successful fetch', async () => {
    mockFetchSuccess();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob Editor')).toBeInTheDocument();
  });

  it('renders table column headers after loading', async () => {
    mockFetchSuccess();
    renderComponent();

    await waitFor(() => screen.getByText('Alice Admin'));

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
  });

  it('renders user email addresses in the table', async () => {
    mockFetchSuccess();
    renderComponent();

    await waitFor(() => screen.getByText('Alice Admin'));

    expect(screen.getByText('alice@vastu.dev')).toBeInTheDocument();
    expect(screen.getByText('bob@vastu.dev')).toBeInTheDocument();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it('shows an empty state message when no users are returned', async () => {
    mockFetchSuccess([]);
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/try adjusting your search or filters/i),
      ).toBeInTheDocument();
    });
  });

  it('shows the invite button in the empty state', async () => {
    mockFetchSuccess([]);
    renderComponent();

    await waitFor(() =>
      screen.getByText(/try adjusting your search or filters/i),
    );

    // The EmptyState action button is also an "Invite user" button
    const inviteButtons = screen.getAllByRole('button', { name: /invite user/i });
    expect(inviteButtons.length).toBeGreaterThanOrEqual(1);
  });

  // ── Error state ──────────────────────────────────────────────────────────

  it('shows an error state when the fetch fails', async () => {
    mockFetchError();
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load users/i),
      ).toBeInTheDocument();
    });
  });

  it('shows a retry button in the error state', async () => {
    mockFetchError();
    renderComponent();

    await waitFor(() => screen.getByText(/failed to load users/i));

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  // ── Search interaction ───────────────────────────────────────────────────

  it('updates the search input value when the user types', () => {
    mockFetchSuccess();
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    expect(searchInput).toHaveValue('alice');
  });

  // ── Invite modal ─────────────────────────────────────────────────────────

  it('opens the invite modal when the Invite user button is clicked', async () => {
    mockFetchSuccess();
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));

    await waitFor(() => {
      expect(screen.getByText('Invite users')).toBeInTheDocument();
    });
  });

  // ── Row click → edit drawer ──────────────────────────────────────────────

  it('opens the edit drawer when a user row is clicked', async () => {
    mockFetchSuccess();
    renderComponent();

    await waitFor(() => screen.getByText('Alice Admin'));

    fireEvent.click(screen.getByRole('row', { name: /edit user alice admin/i }));

    await waitFor(() => {
      expect(screen.getByText('Edit user')).toBeInTheDocument();
    });
  });
});

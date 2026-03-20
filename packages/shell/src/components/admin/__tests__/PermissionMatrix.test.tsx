/**
 * PermissionMatrix tests — US-022 Permission matrix
 *
 * Verifies:
 *   - Renders skeleton while loading
 *   - Renders role columns from API data
 *   - Renders resource rows
 *   - System role cells are non-interactive (no toggle)
 *   - Custom role cells are interactive (click toggles)
 *   - Export button is rendered
 *   - Save button appears only when there are pending changes
 *   - Error state displayed on fetch failure
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TestProviders } from '@/test-utils/providers';
import { PermissionMatrix } from '../PermissionMatrix';

function renderMatrix(props: { orgUserCount?: number } = {}) {
  return render(<PermissionMatrix {...props} />, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockMatrixData = {
  roles: [
    {
      id: 'sys-admin',
      name: 'Admin',
      isSystem: true,
      userCount: 2,
      permissions: [
        { resource: 'User', action: 'read', granted: true, conditions: null },
        { resource: 'User', action: 'update', granted: true, conditions: null },
        { resource: 'User', action: 'delete', granted: true, conditions: null },
        { resource: 'User', action: 'export', granted: true, conditions: null },
      ],
    },
    {
      id: 'custom-manager',
      name: 'Manager',
      isSystem: false,
      userCount: 5,
      permissions: [
        { resource: 'User', action: 'read', granted: true, conditions: null },
        { resource: 'User', action: 'update', granted: false, conditions: null },
        { resource: 'User', action: 'delete', granted: false, conditions: null },
        { resource: 'User', action: 'export', granted: false, conditions: null },
      ],
    },
  ],
  resources: ['User', 'Role'],
};

function setupFetchMock(data: unknown = mockMatrixData, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  setupFetchMock();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('PermissionMatrix — loading state', () => {
  it('renders skeleton rows while fetching', () => {
    // Do not resolve fetch immediately
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    renderMatrix();

    // Mantine Skeleton doesn't add data-skeleton but renders as div with class.
    // We check loading state by verifying the table is NOT yet rendered.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Rendered matrix
// ---------------------------------------------------------------------------

describe('PermissionMatrix — rendered matrix', () => {
  it('renders role column headers after loading', async () => {
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  it('renders resource rows', async () => {
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('User')).toBeInTheDocument();
    });
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders the page title', async () => {
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Permissions')).toBeInTheDocument();
    });
  });

  it('renders the export button', async () => {
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Export matrix')).toBeInTheDocument();
    });
  });

  it('does not show Save button initially (no pending changes)', async () => {
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// System role — read-only
// ---------------------------------------------------------------------------

describe('PermissionMatrix — system role columns are non-interactive', () => {
  it('system role badge buttons have no click effect', async () => {
    const user = userEvent.setup();
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    // Find buttons with aria-label containing "View" for Admin column.
    // They should exist but clicking should NOT show the Save button.
    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    // Click any of the view buttons in system role column (Admin)
    if (viewButtons[0]) {
      await user.click(viewButtons[0]);
    }

    // Save button should still NOT appear since system roles are read-only
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Custom role — interactive
// ---------------------------------------------------------------------------

describe('PermissionMatrix — custom role columns are interactive', () => {
  it('clicking a badge in a custom role column shows Save button', async () => {
    const user = userEvent.setup();
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    // aria-label: "Edit: Denied" (since update is granted: false for Manager/User)
    const editDeniedButtons = screen.getAllByRole('button', { name: /Edit: Denied/i });
    expect(editDeniedButtons.length).toBeGreaterThan(0);

    // Click the first one (Manager/User/update)
    await user.click(editDeniedButtons[0]!);

    // Save button should now appear
    await waitFor(() => {
      expect(screen.getByText('Save changes')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('PermissionMatrix — error state', () => {
  it('shows error state when fetch fails', async () => {
    setupFetchMock({ error: 'Failed to fetch permissions.' }, false);
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch permissions.')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

describe('PermissionMatrix — legend', () => {
  it('renders the legend section', async () => {
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('Legend')).toBeInTheDocument();
    });
  });

  it('renders V/E/D/X legend items', async () => {
    renderMatrix();
    await waitFor(() => {
      expect(screen.getByText('V = View (read)')).toBeInTheDocument();
    });
    expect(screen.getByText('E = Edit (update)')).toBeInTheDocument();
    expect(screen.getByText('D = Delete')).toBeInTheDocument();
    expect(screen.getByText('X = Export')).toBeInTheDocument();
  });
});

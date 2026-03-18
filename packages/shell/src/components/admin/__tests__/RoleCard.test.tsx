/**
 * RoleCard tests — US-021 Role management (AC-2, AC-3, AC-5)
 *
 * Verifies:
 *  - System roles render "System" badge, only "View users" in menu
 *  - Custom roles render "Custom" badge, full menu (Edit, Duplicate, View users, Delete)
 *  - User count is displayed correctly (singular and plural)
 *  - Description renders when present, omitted when absent
 *  - Overflow menu callbacks are fired correctly
 */

import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { render } from '../../../test-utils/providers';
import { RoleCard } from '../RoleCard';
import type { RoleCardRole } from '../RoleCard';

const systemRole: RoleCardRole = {
  id: 'sys-1',
  name: 'Admin',
  description: 'Full administrative access.',
  isSystem: true,
  userCount: 3,
};

const customRole: RoleCardRole = {
  id: 'cust-1',
  name: 'Regional Manager',
  description: 'Manages a specific region.',
  isSystem: false,
  userCount: 1,
};

const noDescriptionRole: RoleCardRole = {
  id: 'cust-2',
  name: 'Support',
  description: null,
  isSystem: false,
  userCount: 0,
};

const defaultHandlers = {
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
  onViewUsers: vi.fn(),
  onDelete: vi.fn(),
};

// ---------------------------------------------------------------------------
// System role
// ---------------------------------------------------------------------------

describe('RoleCard — system role', () => {
  it('renders the role name', () => {
    render(<RoleCard role={systemRole} {...defaultHandlers} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders the "System" badge', () => {
    render(<RoleCard role={systemRole} {...defaultHandlers} />);
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('does NOT render a "Custom" badge', () => {
    render(<RoleCard role={systemRole} {...defaultHandlers} />);
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
  });

  it('renders the user count (plural)', () => {
    render(<RoleCard role={systemRole} {...defaultHandlers} />);
    expect(screen.getByText('3 users')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<RoleCard role={systemRole} {...defaultHandlers} />);
    expect(screen.getByText('Full administrative access.')).toBeInTheDocument();
  });

  it('shows only "View users" in the overflow menu', async () => {
    const user = userEvent.setup();
    render(<RoleCard role={systemRole} {...defaultHandlers} />);

    // Open the menu
    const menuTrigger = screen.getByRole('button', { name: /open role menu/i });
    await user.click(menuTrigger);

    expect(screen.getByText('View users')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls onViewUsers when "View users" is clicked', async () => {
    const onViewUsers = vi.fn();
    const user = userEvent.setup();
    render(<RoleCard role={systemRole} {...defaultHandlers} onViewUsers={onViewUsers} />);

    await user.click(screen.getByRole('button', { name: /open role menu/i }));
    await user.click(screen.getByText('View users'));
    expect(onViewUsers).toHaveBeenCalledWith('sys-1');
  });
});

// ---------------------------------------------------------------------------
// Custom role
// ---------------------------------------------------------------------------

describe('RoleCard — custom role', () => {
  it('renders the role name', () => {
    render(<RoleCard role={customRole} {...defaultHandlers} />);
    expect(screen.getByText('Regional Manager')).toBeInTheDocument();
  });

  it('renders the "Custom" badge', () => {
    render(<RoleCard role={customRole} {...defaultHandlers} />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('does NOT render a "System" badge', () => {
    render(<RoleCard role={customRole} {...defaultHandlers} />);
    expect(screen.queryByText('System')).not.toBeInTheDocument();
  });

  it('renders the user count (singular)', () => {
    render(<RoleCard role={customRole} {...defaultHandlers} />);
    expect(screen.getByText('1 user')).toBeInTheDocument();
  });

  it('shows Edit, Duplicate, View users, and Delete in the overflow menu', async () => {
    const user = userEvent.setup();
    render(<RoleCard role={customRole} {...defaultHandlers} />);

    await user.click(screen.getByRole('button', { name: /open role menu/i }));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('View users')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onEdit when "Edit" is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<RoleCard role={customRole} {...defaultHandlers} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /open role menu/i }));
    await user.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('cust-1');
  });

  it('calls onDuplicate when "Duplicate" is clicked', async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    render(<RoleCard role={customRole} {...defaultHandlers} onDuplicate={onDuplicate} />);

    await user.click(screen.getByRole('button', { name: /open role menu/i }));
    await user.click(screen.getByText('Duplicate'));
    expect(onDuplicate).toHaveBeenCalledWith('cust-1');
  });

  it('calls onDelete when "Delete" is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<RoleCard role={customRole} {...defaultHandlers} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /open role menu/i }));
    await user.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('cust-1');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('RoleCard — edge cases', () => {
  it('does not render a description section when description is null', () => {
    render(<RoleCard role={noDescriptionRole} {...defaultHandlers} />);
    // No description paragraph should be present (other than badge/count text)
    expect(screen.queryByText(/manages/i)).not.toBeInTheDocument();
  });

  it('renders "0 users" when userCount is 0', () => {
    render(<RoleCard role={noDescriptionRole} {...defaultHandlers} />);
    expect(screen.getByText('0 users')).toBeInTheDocument();
  });
});

/**
 * PermissionCell tests — US-022 Permission matrix (AC-3, AC-4, AC-5)
 *
 * Verifies:
 *   - Renders V/E/D/X badges
 *   - Granted badges use success color (aria-label contains "Granted")
 *   - Denied badges use tertiary color (aria-label contains "Denied")
 *   - System role cells: clicking does NOT call onToggle
 *   - Custom role cells: clicking DOES call onToggle
 *   - Conditional permissions: badge has amber color (not tested visually, but tooltip renders)
 */

import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { render } from '../../../test-utils/providers';
import { PermissionCell } from '../PermissionCell';
import type { CellPermission } from '../PermissionCell';

const allGrantedPermissions: CellPermission[] = [
  { action: 'read', granted: true, conditions: null },
  { action: 'update', granted: true, conditions: null },
  { action: 'delete', granted: true, conditions: null },
  { action: 'export', granted: true, conditions: null },
];

const allDeniedPermissions: CellPermission[] = [
  { action: 'read', granted: false, conditions: null },
  { action: 'update', granted: false, conditions: null },
  { action: 'delete', granted: false, conditions: null },
  { action: 'export', granted: false, conditions: null },
];

const mixedPermissions: CellPermission[] = [
  { action: 'read', granted: true, conditions: null },
  { action: 'update', granted: false, conditions: null },
  { action: 'delete', granted: false, conditions: null },
  { action: 'export', granted: false, conditions: null },
];

const conditionalPermissions: CellPermission[] = [
  { action: 'read', granted: true, conditions: { region: 'assigned' } },
  { action: 'update', granted: false, conditions: null },
  { action: 'delete', granted: false, conditions: null },
  { action: 'export', granted: false, conditions: null },
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('PermissionCell — rendering', () => {
  it('renders 4 badge buttons (V, E, D, X)', () => {
    render(
      <PermissionCell permissions={allGrantedPermissions} isSystem={false} />,
    );
    expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
  });

  it('granted badges have aria-label containing "Granted"', () => {
    render(
      <PermissionCell permissions={allGrantedPermissions} isSystem={false} />,
    );
    expect(
      screen.getByRole('button', { name: /View: Granted/i }),
    ).toBeInTheDocument();
  });

  it('denied badges have aria-label containing "Denied"', () => {
    render(
      <PermissionCell permissions={allDeniedPermissions} isSystem={false} />,
    );
    expect(
      screen.getByRole('button', { name: /View: Denied/i }),
    ).toBeInTheDocument();
  });

  it('renders mixed granted/denied states correctly', () => {
    render(
      <PermissionCell permissions={mixedPermissions} isSystem={false} />,
    );
    expect(screen.getByRole('button', { name: /View: Granted/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit: Denied/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// System role — read-only
// ---------------------------------------------------------------------------

describe('PermissionCell — system role (read-only)', () => {
  it('does NOT call onToggle when a badge is clicked in a system role cell', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <PermissionCell
        permissions={allGrantedPermissions}
        isSystem={true}
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByRole('button', { name: /View/i }));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Custom role — interactive
// ---------------------------------------------------------------------------

describe('PermissionCell — custom role (interactive)', () => {
  it('calls onToggle with correct args when a badge is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <PermissionCell
        permissions={mixedPermissions}
        isSystem={false}
        onToggle={onToggle}
      />,
    );

    // Click the "View" badge (currently granted = true)
    await user.click(screen.getByRole('button', { name: /View: Granted/i }));
    expect(onToggle).toHaveBeenCalledWith('read', true);
  });

  it('calls onToggle with granted=false when denied badge is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <PermissionCell
        permissions={mixedPermissions}
        isSystem={false}
        onToggle={onToggle}
      />,
    );

    // Click the "Edit" badge (currently granted = false)
    await user.click(screen.getByRole('button', { name: /Edit: Denied/i }));
    expect(onToggle).toHaveBeenCalledWith('update', false);
  });

  it('does not call onToggle when onToggle is undefined', async () => {
    const user = userEvent.setup();

    // Should not throw
    render(
      <PermissionCell
        permissions={allGrantedPermissions}
        isSystem={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /View: Granted/i }));
    // No error thrown = pass
  });
});

// ---------------------------------------------------------------------------
// Conditional permissions
// ---------------------------------------------------------------------------

describe('PermissionCell — conditional permissions', () => {
  it('renders a button for a conditional permission', () => {
    render(
      <PermissionCell permissions={conditionalPermissions} isSystem={false} />,
    );
    // The conditional badge still renders as a button
    expect(screen.getByRole('button', { name: /View/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('PermissionCell — edge cases', () => {
  it('renders denied state when permissions array is empty', () => {
    render(<PermissionCell permissions={[]} isSystem={false} />);
    // All four badges should still render (defaulting to denied)
    expect(screen.getByRole('button', { name: /View: Denied/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit: Denied/i })).toBeInTheDocument();
  });
});

/**
 * Tests for useConfirmDialog hook and ConfirmDialogProvider.
 *
 * Covers:
 * - calling confirm() shows the dialog
 * - resolves true when action button is clicked
 * - resolves false when cancel button is clicked
 * - multiple queued confirms resolve in FIFO order
 * - provider renders dialog with correct variant
 * - throws when used outside provider
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ConfirmDialogProvider } from '../ConfirmDialogProvider';
import { useConfirmDialog } from '../useConfirmDialog';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

/**
 * A component that uses the hook and exposes controls for tests.
 * `onResult` is called with the boolean result of each confirm() call.
 */
interface HarnessProps {
  onResult?: (confirmed: boolean, index: number) => void;
  confirmCount?: number;
}

let callIndex = 0;

function Harness({ onResult, confirmCount = 1 }: HarnessProps) {
  const confirm = useConfirmDialog();

  const handleClick = async () => {
    for (let i = 0; i < confirmCount; i++) {
      // Use a fresh captured index to avoid closure issues
      const idx = callIndex++;
      const result = await confirm({
        title: `Confirm ${idx}`,
        description: `Description ${idx}`,
        variant: 'delete',
      });
      onResult?.(result, idx);
    }
  };

  return (
    <button type="button" onClick={handleClick}>
      Open confirm
    </button>
  );
}

function renderWithProvider(props: HarnessProps = {}) {
  callIndex = 0;
  return render(
    <MantineProvider>
      <ConfirmDialogProvider>
        <Harness {...props} />
      </ConfirmDialogProvider>
    </MantineProvider>,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clickOpen() {
  fireEvent.click(screen.getByRole('button', { name: /open confirm/i }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useConfirmDialog', () => {
  it('shows a dialog when confirm() is called', async () => {
    renderWithProvider();
    clickOpen();
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('resolves true when the action button is clicked', async () => {
    const onResult = vi.fn();
    renderWithProvider({ onResult });
    clickOpen();

    await waitFor(() => screen.getByRole('dialog'));
    // Default variant = 'delete', label = 'Delete'
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(true, 0);
    });
  });

  it('resolves false when the cancel button is clicked', async () => {
    const onResult = vi.fn();
    renderWithProvider({ onResult });
    clickOpen();

    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(false, 0);
    });
  });

  it('resolves false when Escape key is pressed', async () => {
    const onResult = vi.fn();
    renderWithProvider({ onResult });
    clickOpen();

    const dialog = await waitFor(() => screen.getByRole('dialog'));
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(false, 0);
    });
  });

  it('hides the dialog after it resolves', async () => {
    renderWithProvider();
    clickOpen();

    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('ConfirmDialogProvider — queuing', () => {
  it('processes multiple queued confirms in FIFO order', async () => {
    const results: Array<{ confirmed: boolean; index: number }> = [];

    /**
     * ConcurrentHarness fires all confirm() calls simultaneously (no await
     * between them) so the queue is populated before any dialog is dismissed.
     * Each resolved promise records its result and the call index so we can
     * verify FIFO resolution order.
     */
    function ConcurrentHarness() {
      const confirm = useConfirmDialog();

      const handleClick = () => {
        // Fire three concurrent calls — none awaited, intentional.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        confirm({ title: 'Confirm 0', description: 'Desc 0', variant: 'delete' }).then(
          (confirmed) => results.push({ confirmed, index: 0 }),
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        confirm({ title: 'Confirm 1', description: 'Desc 1', variant: 'delete' }).then(
          (confirmed) => results.push({ confirmed, index: 1 }),
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        confirm({ title: 'Confirm 2', description: 'Desc 2', variant: 'delete' }).then(
          (confirmed) => results.push({ confirmed, index: 2 }),
        );
      };

      return (
        <button type="button" onClick={handleClick}>
          Open concurrent
        </button>
      );
    }

    render(
      <MantineProvider>
        <ConfirmDialogProvider>
          <ConcurrentHarness />
        </ConfirmDialogProvider>
      </MantineProvider>,
    );

    // Trigger all three concurrent confirm() calls.
    fireEvent.click(screen.getByRole('button', { name: /open concurrent/i }));

    // Dialog 0 (first in queue) should appear immediately.
    await waitFor(() => screen.getByRole('dialog'));
    expect(screen.getByText('Confirm 0')).toBeInTheDocument();
    // Confirm dialog 0 → resolves true, dialog 1 becomes visible.
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    // Dialog 1 should now be visible.
    await waitFor(() => {
      expect(screen.getByText('Confirm 1')).toBeInTheDocument();
    });
    // Cancel dialog 1 → resolves false, dialog 2 becomes visible.
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Dialog 2 should now be visible.
    await waitFor(() => {
      expect(screen.getByText('Confirm 2')).toBeInTheDocument();
    });
    // Confirm dialog 2 → resolves true.
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    // All three should have resolved in FIFO order with correct values.
    await waitFor(() => {
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ confirmed: true, index: 0 });
      expect(results[1]).toEqual({ confirmed: false, index: 1 });
      expect(results[2]).toEqual({ confirmed: true, index: 2 });
    });
  });
});

describe('ConfirmDialogProvider — variant', () => {
  it('renders the dialog with the warning variant label', async () => {
    function WarningHarness() {
      const confirm = useConfirmDialog();
      return (
        <button
          type="button"
          onClick={() =>
            confirm({ title: 'Careful', description: 'Are you sure?', variant: 'warning' })
          }
        >
          Open
        </button>
      );
    }

    render(
      <MantineProvider>
        <ConfirmDialogProvider>
          <WarningHarness />
        </ConfirmDialogProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    await waitFor(() => {
      // warning variant defaults to 'Confirm'
      expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument();
    });
  });

  it('renders the dialog with the info variant label', async () => {
    function InfoHarness() {
      const confirm = useConfirmDialog();
      return (
        <button
          type="button"
          onClick={() =>
            confirm({ title: 'Info', description: 'Just so you know.', variant: 'info' })
          }
        >
          Open info
        </button>
      );
    }

    render(
      <MantineProvider>
        <ConfirmDialogProvider>
          <InfoHarness />
        </ConfirmDialogProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open info/i }));
    await waitFor(() => {
      // info variant defaults to 'OK'
      expect(screen.getByRole('button', { name: /^ok$/i })).toBeInTheDocument();
    });
  });

  it('renders the dialog with a custom confirmLabel', async () => {
    function CustomHarness() {
      const confirm = useConfirmDialog();
      return (
        <button
          type="button"
          onClick={() =>
            confirm({
              title: 'Remove',
              description: 'This cannot be undone.',
              variant: 'delete',
              confirmLabel: 'Yes, remove it',
            })
          }
        >
          Open custom
        </button>
      );
    }

    render(
      <MantineProvider>
        <ConfirmDialogProvider>
          <CustomHarness />
        </ConfirmDialogProvider>
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open custom/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /yes, remove it/i })).toBeInTheDocument();
    });
  });
});

describe('useConfirmDialog — error boundary', () => {
  it('throws when used outside ConfirmDialogProvider', () => {
    // Suppress the React error boundary noise in test output.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function Bare() {
      useConfirmDialog();
      return null;
    }

    expect(() =>
      render(
        <MantineProvider>
          <Bare />
        </MantineProvider>,
      ),
    ).toThrow('useConfirmDialog must be used inside <ConfirmDialogProvider>');

    consoleSpy.mockRestore();
  });
});

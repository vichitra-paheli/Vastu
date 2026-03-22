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
    const onResult = (confirmed: boolean, index: number) => {
      results.push({ confirmed, index });
    };

    // Render a harness that fires 2 confirms sequentially from the same click.
    renderWithProvider({ onResult, confirmCount: 2 });
    clickOpen();

    // First dialog (index 0) should appear.
    await waitFor(() => screen.getByRole('button', { name: /^delete$/i }));
    // Confirm the first one → resolves with true, queued #1 becomes visible.
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    // Second dialog (index 1) should appear.
    await waitFor(() => {
      // The dialog should still be visible for the second queued item.
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    // Cancel the second one → resolves with false.
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ confirmed: true, index: 0 });
      expect(results[1]).toEqual({ confirmed: false, index: 1 });
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

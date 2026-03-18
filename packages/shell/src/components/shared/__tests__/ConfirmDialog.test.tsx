/**
 * ConfirmDialog tests — Style Guide SS 9.1 + Patterns Library §10
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';
import { TestProviders } from '../../../test-utils/providers';

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('ConfirmDialog', () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete API key',
    message: 'This action cannot be undone. The key will stop working immediately.',
  };

  it('renders the title', () => {
    renderComponent(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete API key')).toBeInTheDocument();
  });

  it('renders the message', () => {
    renderComponent(<ConfirmDialog {...defaultProps} />);
    expect(
      screen.getByText(
        'This action cannot be undone. The key will stop working immediately.',
      ),
    ).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons with default labels', () => {
    renderComponent(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders custom confirmLabel and cancelLabel', () => {
    renderComponent(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
      />,
    );
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    renderComponent(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderComponent(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when opened is false', () => {
    renderComponent(<ConfirmDialog {...defaultProps} opened={false} />);
    expect(screen.queryByText('Delete API key')).not.toBeInTheDocument();
  });

  it('destructive variant: confirm button has --v-status-error background', () => {
    renderComponent(<ConfirmDialog {...defaultProps} variant="destructive" />);
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toHaveStyle({
      backgroundColor: 'var(--v-status-error)',
    });
  });

  it('warning variant: confirm button has --v-status-warning background', () => {
    renderComponent(<ConfirmDialog {...defaultProps} variant="warning" />);
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toHaveStyle({
      backgroundColor: 'var(--v-status-warning)',
    });
  });

  it('disables cancel button when loading is true', () => {
    renderComponent(<ConfirmDialog {...defaultProps} loading />);
    // The cancel button receives the `disabled` HTML attribute via our `disabled={loading}` prop
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn).toBeDisabled();
  });

  it('defaults to destructive variant when variant is not specified', () => {
    renderComponent(<ConfirmDialog {...defaultProps} />);
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn).toHaveStyle({
      backgroundColor: 'var(--v-status-error)',
    });
  });
});

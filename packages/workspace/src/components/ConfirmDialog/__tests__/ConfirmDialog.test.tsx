/**
 * Standalone tests for ConfirmDialog component.
 *
 * Covers:
 * - Renders title and description
 * - Calls onConfirm when action button clicked
 * - Calls onCancel when cancel button clicked
 * - Cancel button gets autofocus (not the action button)
 * - Escape key cancels (fires onClose → onCancel)
 * - Three variants render correctly (delete / warning / info)
 * - Default labels come from i18n (no hardcoded English strings in component)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { ConfirmDialog } from '../ConfirmDialog';

function renderDialog(props?: Partial<React.ComponentProps<typeof ConfirmDialog>>) {
  const defaults: React.ComponentProps<typeof ConfirmDialog> = {
    opened: true,
    title: 'Test title',
    description: 'Test description',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(<ConfirmDialog {...defaults} {...props} />, { wrapper: TestProviders });
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // Content
  // ----------------------------------------------------------------

  it('renders the title', () => {
    renderDialog({ title: 'Delete view' });
    expect(screen.getByText('Delete view')).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderDialog({ description: 'This action cannot be undone.' });
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('does not render when opened is false', () => {
    renderDialog({ opened: false, title: 'Hidden dialog' });
    expect(screen.queryByText('Hidden dialog')).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------------
  // Confirm action
  // ----------------------------------------------------------------

  it('calls onConfirm when the action button is clicked', () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });
    // Default variant is 'delete', label comes from i18n key confirm.delete.label → 'Delete'
    const actionButton = screen.getByRole('button', { name: /^delete$/i });
    fireEvent.click(actionButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with a custom confirmLabel', () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm, confirmLabel: 'Yes, remove it' });
    fireEvent.click(screen.getByRole('button', { name: /yes, remove it/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------------
  // Cancel action
  // ----------------------------------------------------------------

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel with a custom cancelLabel', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel, cancelLabel: 'No, go back' });
    fireEvent.click(screen.getByRole('button', { name: /no, go back/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------------
  // Autofocus — cancel button should have data-autofocus, not action button
  // ----------------------------------------------------------------

  it('cancel button has data-autofocus attribute', () => {
    renderDialog();
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toHaveAttribute('data-autofocus');
  });

  it('action button does not have data-autofocus attribute', () => {
    renderDialog({ confirmLabel: 'Confirm action' });
    const actionButton = screen.getByRole('button', { name: /confirm action/i });
    expect(actionButton).not.toHaveAttribute('data-autofocus');
  });

  // ----------------------------------------------------------------
  // Escape key
  // ----------------------------------------------------------------

  it('calls onCancel when Escape key is pressed on the modal overlay', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    // Mantine Modal listens for Escape on the modal content element.
    // Find the dialog role element and dispatch keyDown there.
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------------
  // Variants
  // ----------------------------------------------------------------

  it('delete variant renders with Delete label by default', () => {
    renderDialog({ variant: 'delete' });
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('warning variant renders with Confirm label by default', () => {
    renderDialog({ variant: 'warning' });
    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument();
  });

  it('info variant renders with OK label by default', () => {
    renderDialog({ variant: 'info' });
    expect(screen.getByRole('button', { name: /^ok$/i })).toBeInTheDocument();
  });

  it('all three variants render without crashing', () => {
    const variants = ['delete', 'warning', 'info'] as const;
    for (const variant of variants) {
      const { unmount } = renderDialog({ variant, confirmLabel: `Action-${variant}` });
      expect(screen.getByRole('button', { name: new RegExp(`action-${variant}`, 'i') })).toBeInTheDocument();
      unmount();
    }
  });
});

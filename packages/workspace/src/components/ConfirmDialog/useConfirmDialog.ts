'use client';

/**
 * useConfirmDialog — imperative confirmation dialog hook.
 *
 * Provides a Promise-based API for triggering confirmation dialogs without
 * manually managing open/closed state at each call site.
 *
 * Usage:
 *   const confirm = useConfirmDialog();
 *   const confirmed = await confirm({ title: 'Delete?', description: '...', variant: 'delete' });
 *   if (confirmed) { ... }
 *
 * Requires <ConfirmDialogProvider> to be mounted in the tree (WorkspaceShell
 * wires this in automatically).
 *
 * Multiple concurrent calls are queued and resolved in FIFO order; only one
 * dialog is visible at a time.
 *
 * Implements US-138 AC-2 (imperative hook API).
 */

import { useContext } from 'react';
import { ConfirmDialogContext } from './ConfirmDialogProvider';
import type { ConfirmDialogVariant } from './ConfirmDialog';

export interface ConfirmOptions {
  /** Title shown at the top of the dialog. */
  title: string;
  /** Body text explaining the impact of the action. */
  description: string;
  /** Visual variant controlling the confirm button color. Defaults to 'delete'. */
  variant?: ConfirmDialogVariant;
  /** Custom label for the confirm button. Falls back to the variant default. */
  confirmLabel?: string;
  /** Custom label for the cancel button. Falls back to i18n 'Cancel'. */
  cancelLabel?: string;
}

/**
 * Returns an async `confirm` function that shows the confirmation dialog and
 * resolves `true` when the user confirms, `false` when they cancel.
 *
 * Must be called inside a component that is a descendant of
 * `<ConfirmDialogProvider>`.
 */
export function useConfirmDialog(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmDialogContext);
  if (ctx === null) {
    throw new Error(
      'useConfirmDialog must be used inside <ConfirmDialogProvider>. ' +
        'Ensure WorkspaceShell (or your root layout) includes the provider.',
    );
  }
  return ctx.confirm;
}

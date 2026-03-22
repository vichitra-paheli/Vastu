'use client';

/**
 * ConfirmDialogProvider — mounts a single ConfirmDialog instance at the
 * workspace root and provides an imperative `confirm()` API to all descendants.
 *
 * Queuing behaviour: if `confirm()` is called while a dialog is already open,
 * the new request is enqueued. It becomes visible once the current dialog
 * is resolved (confirmed or cancelled).
 *
 * Only one dialog is ever rendered at a time — the queue is processed in
 * FIFO order.
 *
 * Implements US-138 AC-2.
 */

import React, { createContext, useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import type { ConfirmDialogVariant } from './ConfirmDialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueuedConfirm {
  title: string;
  description: string;
  variant?: ConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmDialogContextValue {
  confirm: (options: Omit<QueuedConfirm, 'resolve'>) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Exported so `useConfirmDialog` can read it.
 * Null when no provider is mounted — the hook will throw a helpful error.
 */
export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ConfirmDialogProviderProps {
  children: React.ReactNode;
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  // The dialog currently being shown (or null when closed).
  const [current, setCurrent] = useState<QueuedConfirm | null>(null);

  // FIFO queue of pending confirm requests.
  const queue = useRef<QueuedConfirm[]>([]);

  /** Advance to the next item in the queue, if any. */
  const processQueue = useCallback(() => {
    const next = queue.current.shift();
    setCurrent(next ?? null);
  }, []);

  /** Resolve the current dialog and advance the queue. */
  const handleSettle = useCallback(
    (confirmed: boolean) => {
      current?.resolve(confirmed);
      processQueue();
    },
    [current, processQueue],
  );

  const handleConfirm = useCallback(() => handleSettle(true), [handleSettle]);
  const handleCancel = useCallback(() => handleSettle(false), [handleSettle]);

  /**
   * Imperative confirm function exposed via context.
   * Returns a Promise<boolean> that resolves once the user acts.
   */
  const confirm = useCallback(
    (options: Omit<QueuedConfirm, 'resolve'>): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const entry: QueuedConfirm = { ...options, resolve };
        setCurrent((prev) => {
          if (prev === null) {
            // No dialog open — show this one immediately.
            return entry;
          }
          // A dialog is already open — enqueue.
          queue.current.push(entry);
          return prev;
        });
      });
    },
    [],
  );

  const contextValue = React.useMemo<ConfirmDialogContextValue>(
    () => ({ confirm }),
    [confirm],
  );

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        opened={current !== null}
        title={current?.title ?? ''}
        description={current?.description ?? ''}
        variant={current?.variant}
        confirmLabel={current?.confirmLabel}
        cancelLabel={current?.cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmDialogContext.Provider>
  );
}

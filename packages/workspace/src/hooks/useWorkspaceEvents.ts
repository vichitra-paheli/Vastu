'use client';

/**
 * useWorkspaceEvents — subscribes to the SSE stream at /api/workspace/events
 * and calls the provided callback for each received workspace event.
 *
 * Connection state:
 *   'connecting'    — initial connection attempt is in progress
 *   'connected'     — EventSource is open and receiving events
 *   'disconnected'  — connection has been closed and all retries exhausted,
 *                     or the hook has been unmounted
 *
 * Auto-reconnect strategy:
 *   On error the hook closes the current EventSource and schedules a retry
 *   using exponential back-off: 1 s → 2 s → 4 s → … → max 30 s.
 *   Backoff resets to 1 s after a successful connection is established.
 *
 * The callback is stable-referenced via a ref so callers do not need to
 * memoize it — changing the callback between renders will take effect
 * immediately without reconnecting the stream.
 *
 * The EventSource is torn down and retries are cancelled on unmount.
 *
 * Implements US-207 AC-5, AC-9.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** The current state of the SSE connection. */
export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected';

/** Callback invoked for every workspace event received from the server. */
export type WorkspaceEventCallback = (event: WorkspaceEvent) => void;

// ─── Constants ─────────────────────────────────────────────────────────────────

const SSE_ENDPOINT = '/api/workspace/events';

/** Initial back-off before the first reconnect attempt (milliseconds). */
const BACKOFF_INITIAL_MS = 1_000;
/** Back-off is doubled on each failure, up to this maximum. */
const BACKOFF_MAX_MS = 30_000;

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Subscribe to live workspace events from the SSE endpoint.
 *
 * @param callback - Called with each WorkspaceEvent delivered by the server.
 *   The callback identity does not need to be stable — changes take effect on
 *   the next event without reconnecting the stream.
 * @returns The current SSE connection state.
 *
 * @example
 * ```tsx
 * const status = useWorkspaceEvents((event) => {
 *   if (event.type === 'record.created' && event.table === 'races') {
 *     setNewRacesCount((n) => n + 1);
 *   }
 * });
 * ```
 */
export function useWorkspaceEvents(callback: WorkspaceEventCallback): SSEConnectionState {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('connecting');

  // Stable ref so we can update the callback without tearing down the stream.
  const callbackRef = useRef<WorkspaceEventCallback>(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Accumulate the current back-off delay. We use a ref so the retry closure
  // always reads the latest value without needing to re-register effects.
  const backoffRef = useRef<number>(BACKOFF_INITIAL_MS);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    setConnectionState('connecting');

    const es = new EventSource(SSE_ENDPOINT);
    esRef.current = es;

    es.addEventListener('open', () => {
      if (!mountedRef.current) return;
      // Reset back-off on successful connection.
      backoffRef.current = BACKOFF_INITIAL_MS;
      setConnectionState('connected');
    });

    // The server sends custom `workspace` events.
    es.addEventListener('workspace', (ev: MessageEvent<string>) => {
      if (!mountedRef.current) return;
      try {
        const event = JSON.parse(ev.data) as WorkspaceEvent;
        callbackRef.current(event);
      } catch {
        // Malformed JSON — skip.
      }
    });

    es.addEventListener('error', () => {
      if (!mountedRef.current) return;
      // Close the broken connection before scheduling a retry.
      es.close();
      esRef.current = null;
      setConnectionState('disconnected');

      const delay = backoffRef.current;
      // Double back-off for next failure, capped at BACKOFF_MAX_MS.
      backoffRef.current = Math.min(delay * 2, BACKOFF_MAX_MS);

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    });
  }, []); // no deps — connect is stable across mounts

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  return connectionState;
}

'use client';

/**
 * useWorkspaceEvents — client-side SSE hook for workspace live updates.
 *
 * Connects to `/api/workspace/events` and dispatches incoming events to a
 * registered callback. Manages the EventSource lifecycle including:
 * - Connection state tracking (connected / connecting / disconnected)
 * - Automatic reconnect with exponential backoff (1s, 2s, 4s … max 30s)
 * - Cleanup on unmount to prevent memory leaks
 *
 * Usage:
 *   useWorkspaceEvents((event) => {
 *     console.log('Received:', event.type, event.table);
 *   });
 *
 * Connection state is surfaced through sseConnectionStore, which is used
 * by the SSE status indicator in the tray bar.
 *
 * Implements US-207 AC-5, AC-7, AC-9.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { WorkspaceEvent } from '@vastu/shared';
import { useSSEConnectionStore } from '../stores/sseConnectionStore';

/** The SSE endpoint path on the shell server. */
const SSE_ENDPOINT = '/api/workspace/events';

/** Initial reconnect delay in milliseconds. */
const INITIAL_DELAY_MS = 1_000;

/** Maximum reconnect delay in milliseconds (30 seconds). */
const MAX_DELAY_MS = 30_000;

/** Multiplier applied to the delay on each successive reconnect attempt. */
const BACKOFF_FACTOR = 2;

/** Callback type for SSE event consumers. */
export type WorkspaceEventHandler = (event: WorkspaceEvent) => void;

/**
 * Subscribe to workspace SSE events with auto-reconnect.
 *
 * @param onEvent - Called with each `WorkspaceEvent` as it arrives.
 *   The reference is stabilised internally so callers can use inline
 *   arrow functions without causing reconnects.
 */
export function useWorkspaceEvents(onEvent: WorkspaceEventHandler): void {
  const setStatus = useSSEConnectionStore((s) => s.setStatus);
  const onEventRef = useRef<WorkspaceEventHandler>(onEvent);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDelayRef = useRef<number>(INITIAL_DELAY_MS);
  const unmountedRef = useRef<boolean>(false);

  // Keep the callback ref up-to-date without triggering reconnects.
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const scheduleReconnect = useCallback((): void => {
    if (unmountedRef.current) return;

    const delay = currentDelayRef.current;
    // Increase delay for the next attempt, capped at MAX_DELAY_MS.
    currentDelayRef.current = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY_MS);

    reconnectTimerRef.current = setTimeout(() => {
      if (!unmountedRef.current) {
        connect();
      }
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback((): void => {
    if (unmountedRef.current) return;

    setStatus('connecting');

    const es = new EventSource(SSE_ENDPOINT);
    esRef.current = es;

    es.onopen = () => {
      if (unmountedRef.current) {
        es.close();
        return;
      }
      // Connection established — reset backoff delay.
      currentDelayRef.current = INITIAL_DELAY_MS;
      setStatus('connected');
    };

    es.onmessage = (messageEvent: MessageEvent<string>) => {
      if (unmountedRef.current) return;
      try {
        const event = JSON.parse(messageEvent.data) as WorkspaceEvent;
        onEventRef.current(event);
      } catch {
        // Malformed JSON — ignore and continue.
      }
    };

    es.onerror = () => {
      if (unmountedRef.current) return;
      es.close();
      esRef.current = null;
      setStatus('disconnected');
      scheduleReconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStatus, scheduleReconnect]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (esRef.current !== null) {
        esRef.current.close();
        esRef.current = null;
      }

      setStatus('disconnected');
    };
    // connect is stable (useCallback with stable deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

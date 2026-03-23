'use client';

/**
 * SSEProvider — establishes a single SSE connection for the workspace session.
 *
 * Problem this solves:
 *   Multiple components need to react to workspace events (e.g., the cache
 *   invalidation hook and the connection status indicator). Without this
 *   provider, each consumer that calls `useWorkspaceEvents` independently
 *   would create its own EventSource connection, doubling server load.
 *
 * Solution:
 *   SSEProvider calls `useWorkspaceEvents` exactly once and broadcasts
 *   incoming events to all registered handlers via a context-provided
 *   `subscribe` function. Connection state continues to flow through
 *   `sseConnectionStore` (unchanged — SSEStatusIndicator reads from there).
 *
 * Usage:
 *   // Mount once at the top of the workspace component tree:
 *   <SSEProvider>
 *     <YourWorkspaceContent />
 *   </SSEProvider>
 *
 *   // Consume inside the tree:
 *   function MyComponent() {
 *     const { subscribe } = useSSEContext();
 *     useEffect(() => {
 *       return subscribe((event) => { ... });
 *     }, [subscribe]);
 *   }
 *
 * Implements US-207 (deduplication of SSE connections).
 */

import React, { createContext, useContext, useRef, useCallback } from 'react';
import type { WorkspaceEvent } from '@vastu/shared';
import { useWorkspaceEvents } from '../hooks/useWorkspaceEvents';
import type { WorkspaceEventHandler } from '../hooks/useWorkspaceEvents';

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * A function that registers an event handler and returns an unsubscribe
 * function. The pattern matches the standard EventEmitter convention.
 */
export type SSESubscribeFn = (handler: WorkspaceEventHandler) => () => void;

interface SSEContextValue {
  /**
   * Register a handler to receive workspace events. Returns a cleanup
   * function that unregisters the handler when called.
   *
   * The handler will receive every WorkspaceEvent emitted while registered.
   * The returned cleanup function MUST be called when the consumer unmounts
   * (typically as the return value of a useEffect).
   */
  subscribe: SSESubscribeFn;
}

/**
 * Exported for use in tests that need to provide a mock SSEContext directly
 * without mounting a real SSEProvider (which would create an EventSource).
 * Production code should use SSEProvider and useSSEContext instead.
 */
export const SSEContext = createContext<SSEContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SSEProviderProps {
  children: React.ReactNode;
}

/**
 * Establishes a single SSE connection and provides an event subscription
 * mechanism to all descendant components.
 *
 * Must be mounted inside any providers that the event handlers depend on
 * (e.g., QueryClientProvider, if useEventInvalidation is a consumer).
 */
export function SSEProvider({ children }: SSEProviderProps) {
  /**
   * Set of currently registered event handlers. Using a Set ensures
   * O(1) registration and unsubscription without index bookkeeping.
   *
   * We store this in a ref so that the dispatch function below is stable
   * across renders without needing to be in the dependency array.
   */
  const handlersRef = useRef<Set<WorkspaceEventHandler>>(new Set());

  /**
   * Dispatch function passed to the single useWorkspaceEvents call.
   * Iterates over all registered handlers and invokes them.
   *
   * We use useCallback with an empty dep array so the reference is stable —
   * this prevents useWorkspaceEvents from reconnecting on every render.
   * All mutable state is accessed via handlersRef (a ref), so no deps are
   * needed.
   */
  const dispatch = useCallback((event: WorkspaceEvent): void => {
    for (const handler of handlersRef.current) {
      handler(event);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Establish the single SSE connection for the entire workspace session.
  useWorkspaceEvents(dispatch);

  /**
   * Context value: a stable `subscribe` function that registers a handler
   * and returns its cleanup (unsubscribe) function.
   *
   * useCallback with empty deps keeps the reference stable so consumers
   * can safely include it in their own useEffect dependency arrays.
   */
  const subscribe = useCallback((handler: WorkspaceEventHandler): (() => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue: SSEContextValue = { subscribe };

  return <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the SSEContext value.
 *
 * Throws if called outside of an SSEProvider — this is intentional so that
 * missing provider setup surfaces as a clear error rather than silent
 * no-op behaviour.
 */
export function useSSEContext(): SSEContextValue {
  const ctx = useContext(SSEContext);
  if (ctx === null) {
    throw new Error(
      'useSSEContext must be used within an SSEProvider. ' +
        'Ensure SSEProvider is mounted above this component in the tree.',
    );
  }
  return ctx;
}

'use client';

/**
 * SSEProvider — shared SSE connection for the workspace.
 *
 * Holds a single useWorkspaceEvents() call and exposes the connection state
 * plus a subscribe(handler) API via React context. Multiple consumers
 * (status indicator, cache invalidation, etc.) share one EventSource.
 *
 * Implements US-207 review fix: deduplicate SSE connections.
 */

import React, { createContext, useCallback, useContext, useRef } from 'react';
import {
  useWorkspaceEvents,
  type SSEConnectionState,
  type WorkspaceEventCallback,
} from '../hooks/useWorkspaceEvents';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Context ──────────────────────────────────────────────────────────────────

interface SSEContextValue {
  /** Current SSE connection state. */
  connectionState: SSEConnectionState;
  /** Register a handler for workspace events. Returns an unsubscribe function. */
  subscribe: (handler: WorkspaceEventCallback) => () => void;
}

const SSEContext = createContext<SSEContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the shared SSE context.
 * Must be called within an SSEProvider.
 */
export function useSSEContext(): SSEContextValue {
  const ctx = useContext(SSEContext);
  if (!ctx) {
    throw new Error('useSSEContext must be used within an SSEProvider');
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SSEProviderProps {
  children: React.ReactNode;
}

export function SSEProvider({ children }: SSEProviderProps) {
  const handlersRef = useRef<Set<WorkspaceEventCallback>>(new Set());

  // Single SSE connection — fans out events to all registered handlers.
  const connectionState = useWorkspaceEvents(
    useCallback((event: WorkspaceEvent) => {
      for (const handler of handlersRef.current) {
        handler(event);
      }
    }, []),
  );

  const subscribe = useCallback((handler: WorkspaceEventCallback) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return (
    <SSEContext.Provider value={{ connectionState, subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

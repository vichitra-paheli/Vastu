/**
 * Tests for useEventInvalidation hook.
 *
 * Verifies that the correct TanStack Query cache keys are invalidated
 * for each workspace event type. The hook consumes from SSEContext
 * (provided by SSEProvider) rather than calling useWorkspaceEvents
 * directly, so the test provides a mock SSEContext instead of mocking
 * EventSource.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventInvalidation } from '../useEventInvalidation';
import { SSEContext } from '../../providers/SSEProvider';
import type { WorkspaceEventHandler } from '../useWorkspaceEvents';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Mock SSEContext ──────────────────────────────────────────────────────────

/**
 * TestSSEProvider captures the registered handler so the test can
 * simulate events being dispatched from the shared SSE connection.
 */
function TestSSEProvider({
  children,
  onSubscribe,
}: {
  children: React.ReactNode;
  onSubscribe: (handler: WorkspaceEventHandler) => void;
}) {
  const handlersRef = useRef<Set<WorkspaceEventHandler>>(new Set());

  const subscribe = (handler: WorkspaceEventHandler) => {
    handlersRef.current.add(handler);
    onSubscribe(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  };

  return (
    <SSEContext.Provider value={{ subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<WorkspaceEvent>): WorkspaceEvent {
  return {
    type: 'record.created',
    table: 'race',
    tenantId: 't1',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let queryClient: QueryClient;
let capturedHandler: WorkspaceEventHandler | null = null;

function makeWrapper() {
  capturedHandler = null;
  const onSubscribe = (h: WorkspaceEventHandler) => {
    capturedHandler = h;
  };

  return function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TestSSEProvider onSubscribe={onSubscribe}>{children}</TestSSEProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  queryClient = new QueryClient();
  capturedHandler = null;
});

describe('useEventInvalidation', () => {
  it('invalidates data queries for record.created', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper() });

    act(() => {
      capturedHandler?.(makeEvent({ type: 'record.created', table: 'driver' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'data', 'driver'],
    });
  });

  it('invalidates data queries for record.updated', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper() });

    act(() => {
      capturedHandler?.(makeEvent({ type: 'record.updated', table: 'race' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'data', 'race'],
    });
  });

  it('invalidates data queries for record.deleted', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper() });

    act(() => {
      capturedHandler?.(makeEvent({ type: 'record.deleted', table: 'constructor' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'data', 'constructor'],
    });
  });

  it('invalidates view queries for view.saved', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper() });

    act(() => {
      capturedHandler?.(makeEvent({ type: 'view.saved', table: 'view' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'views'],
    });
  });

  it('invalidates page queries for config.changed', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper() });

    act(() => {
      capturedHandler?.(makeEvent({ type: 'config.changed', table: 'page' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'pages'],
    });
  });

  it('does not call invalidateQueries for unknown event types', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper() });

    act(() => {
      capturedHandler?.({
        type: 'unknown.event' as WorkspaceEvent['type'],
        table: 'x',
        tenantId: 't1',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('unsubscribes from SSEContext on unmount', () => {
    const unsubscribeSpy = vi.fn();
    let registeredHandler: WorkspaceEventHandler | null = null;

    function CapturingSSEProvider({ children }: { children: React.ReactNode }) {
      const subscribe = (handler: WorkspaceEventHandler) => {
        registeredHandler = handler;
        return unsubscribeSpy;
      };
      return <SSEContext.Provider value={{ subscribe }}>{children}</SSEContext.Provider>;
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <CapturingSSEProvider>{children}</CapturingSSEProvider>
      </QueryClientProvider>
    );

    const { unmount } = renderHook(() => useEventInvalidation(), { wrapper });
    expect(registeredHandler).not.toBeNull();

    unmount();
    expect(unsubscribeSpy).toHaveBeenCalledOnce();
  });
});

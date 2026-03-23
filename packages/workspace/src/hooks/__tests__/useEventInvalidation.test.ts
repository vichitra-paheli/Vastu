/**
 * Unit tests for useEventInvalidation (US-207 AC-6, AC-8).
 *
 * We test that the correct QueryClient.invalidateQueries calls are made
 * for each workspace event type by mounting the hook inside a real
 * QueryClientProvider and a mock SSEProvider context.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventInvalidation } from '../useEventInvalidation';
import type { WorkspaceEvent } from '@vastu/shared';
import type { WorkspaceEventCallback } from '../useWorkspaceEvents';

// ─── Mock SSEProvider context ──────────────────────────────────────────────────

let subscribedHandlers: Set<WorkspaceEventCallback>;

vi.mock('../../providers/SSEProvider', () => ({
  useSSEContext: () => ({
    connectionState: 'connected',
    subscribe: (handler: WorkspaceEventCallback) => {
      subscribedHandlers.add(handler);
      return () => {
        subscribedHandlers.delete(handler);
      };
    },
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emitEvent(event: WorkspaceEvent) {
  for (const handler of subscribedHandlers) {
    handler(event);
  }
}

function makeEvent(partial: Partial<WorkspaceEvent> & { type: WorkspaceEvent['type'] }): WorkspaceEvent {
  return {
    tenantId: 'tenant-1',
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useEventInvalidation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    subscribedHandlers = new Set();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
  });

  it('invalidates [records, table] on record.created', () => {
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper(queryClient) });

    act(() => {
      emitEvent(makeEvent({ type: 'record.created', table: 'races' }));
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['records', 'races'] }),
    );
  });

  it('also invalidates [record, table, id] when recordId is present on record.updated', () => {
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper(queryClient) });

    act(() => {
      emitEvent(makeEvent({ type: 'record.updated', table: 'drivers', recordId: 'drv-1' }));
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['records', 'drivers'] }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['record', 'drivers', 'drv-1'] }),
    );
  });

  it('invalidates [records, table] on record.deleted without recordId', () => {
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper(queryClient) });

    act(() => {
      emitEvent(makeEvent({ type: 'record.deleted', table: 'races' }));
    });

    const calls = (queryClient.invalidateQueries as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1); // only the table-level invalidation (no recordId)
    expect(calls[0][0]).toMatchObject({ queryKey: ['records', 'races'] });
  });

  it('invalidates [views] on view.saved', () => {
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper(queryClient) });

    act(() => {
      emitEvent(makeEvent({ type: 'view.saved' }));
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['views'] }),
    );
  });

  it('invalidates [pages] on config.changed', () => {
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper(queryClient) });

    act(() => {
      emitEvent(makeEvent({ type: 'config.changed' }));
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['pages'] }),
    );
  });

  it('does not invalidate records when record event has no table', () => {
    renderHook(() => useEventInvalidation(), { wrapper: makeWrapper(queryClient) });

    act(() => {
      emitEvent(makeEvent({ type: 'record.created' /* no table */ }));
    });

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});

/**
 * Tests for useEventInvalidation hook.
 *
 * Verifies that the correct TanStack Query cache keys are invalidated
 * for each workspace event type.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventInvalidation } from '../useEventInvalidation';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Mock EventSource ─────────────────────────────────────────────────────────

interface MockEventSourceInstance {
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
}

let lastInstance: MockEventSourceInstance | null = null;

const MockEventSource = vi.fn().mockImplementation(() => {
  const instance: MockEventSourceInstance = {
    onopen: null,
    onmessage: null,
    onerror: null,
    close: vi.fn(),
  };
  lastInstance = instance;
  return instance;
});

vi.stubGlobal('EventSource', MockEventSource);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<WorkspaceEvent>): WorkspaceEvent {
  return {
    type: 'record.created',
    table: 'race',
    tenantId: 't1',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function simulateEvent(event: WorkspaceEvent): void {
  lastInstance?.onmessage?.({ data: JSON.stringify(event) });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.useFakeTimers();
  MockEventSource.mockClear();
  lastInstance = null;
  queryClient = new QueryClient();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useEventInvalidation', () => {
  it('invalidates data queries for record.created', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper });

    act(() => {
      simulateEvent(makeEvent({ type: 'record.created', table: 'driver' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'data', 'driver'],
    });
  });

  it('invalidates data queries for record.updated', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper });

    act(() => {
      simulateEvent(makeEvent({ type: 'record.updated', table: 'race' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'data', 'race'],
    });
  });

  it('invalidates data queries for record.deleted', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper });

    act(() => {
      simulateEvent(makeEvent({ type: 'record.deleted', table: 'constructor' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'data', 'constructor'],
    });
  });

  it('invalidates view queries for view.saved', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper });

    act(() => {
      simulateEvent(makeEvent({ type: 'view.saved', table: 'view' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'views'],
    });
  });

  it('invalidates page queries for config.changed', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper });

    act(() => {
      simulateEvent(makeEvent({ type: 'config.changed', table: 'page' }));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['workspace', 'pages'],
    });
  });

  it('does not call invalidateQueries for unknown event types', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useEventInvalidation(), { wrapper });

    act(() => {
      lastInstance?.onmessage?.({
        data: JSON.stringify({
          type: 'unknown.event',
          table: 'x',
          tenantId: 't1',
          timestamp: '2024-01-01T00:00:00.000Z',
        }),
      });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

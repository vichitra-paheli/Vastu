/**
 * Tests for useWorkspaceEvents hook.
 *
 * EventSource is mocked so we can control connection state without a real
 * server. Tests cover:
 * - Sets status to 'connecting' immediately on mount
 * - Sets status to 'connected' on EventSource.onopen
 * - Calls the event handler when a message arrives
 * - Sets status to 'disconnected' and schedules reconnect on error
 * - Doubles the reconnect delay on successive errors (backoff)
 * - Caps delay at 30s
 * - Cleans up EventSource and timer on unmount
 * - Does not reconnect after unmount
 * - Ignores malformed JSON messages
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaceEvents } from '../useWorkspaceEvents';
import { useSSEConnectionStore } from '../../stores/sseConnectionStore';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Mock EventSource ─────────────────────────────────────────────────────────

interface MockEventSourceInstance {
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onerror: (() => void) | null;
  close: ReturnType<typeof vi.fn>;
  url: string;
}

let lastInstance: MockEventSourceInstance | null = null;

const MockEventSource = vi.fn().mockImplementation((url: string) => {
  const instance: MockEventSourceInstance = {
    onopen: null,
    onmessage: null,
    onerror: null,
    close: vi.fn(),
    url,
  };
  lastInstance = instance;
  return instance;
});

vi.stubGlobal('EventSource', MockEventSource);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<WorkspaceEvent> = {}): WorkspaceEvent {
  return {
    type: 'record.created',
    table: 'race',
    tenantId: 't1',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  MockEventSource.mockClear();
  lastInstance = null;
  // Reset Zustand store
  useSSEConnectionStore.setState({ status: 'disconnected' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useWorkspaceEvents', () => {
  it('sets status to connecting on mount', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    expect(useSSEConnectionStore.getState().status).toBe('connecting');
  });

  it('sets status to connected on EventSource open', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    act(() => {
      lastInstance?.onopen?.();
    });
    expect(useSSEConnectionStore.getState().status).toBe('connected');
  });

  it('resets backoff delay to 1s on successful connection', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    // Trigger an error and reconnect
    act(() => { lastInstance?.onerror?.(); });
    act(() => { vi.advanceTimersByTime(1000); });
    // Open the new connection
    act(() => { lastInstance?.onopen?.(); });
    // Another error should reset to 1s delay
    act(() => { lastInstance?.onerror?.(); });
    expect(useSSEConnectionStore.getState().status).toBe('disconnected');
    act(() => { vi.advanceTimersByTime(1000); });
    // Should have reconnected a third time
    expect(MockEventSource).toHaveBeenCalledTimes(3);
  });

  it('calls the event handler on message', () => {
    const handler = vi.fn();
    renderHook(() => useWorkspaceEvents(handler), { wrapper });
    const event = makeEvent();
    act(() => {
      lastInstance?.onmessage?.({ data: JSON.stringify(event) });
    });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('ignores malformed JSON messages without throwing', () => {
    const handler = vi.fn();
    renderHook(() => useWorkspaceEvents(handler), { wrapper });
    expect(() => {
      act(() => {
        lastInstance?.onmessage?.({ data: 'not valid json {{{' });
      });
    }).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('sets status to disconnected on error and schedules reconnect', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    act(() => { lastInstance?.onerror?.(); });
    expect(useSSEConnectionStore.getState().status).toBe('disconnected');
    // Should reconnect after 1s
    act(() => { vi.advanceTimersByTime(1000); });
    expect(MockEventSource).toHaveBeenCalledTimes(2);
  });

  it('applies exponential backoff on successive errors', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    // First error → retry in 1s
    act(() => { lastInstance?.onerror?.(); });
    act(() => { vi.advanceTimersByTime(1000); }); // reconnect #2
    // Second error → retry in 2s
    act(() => { lastInstance?.onerror?.(); });
    act(() => { vi.advanceTimersByTime(1000); }); // 1s elapsed, not yet
    expect(MockEventSource).toHaveBeenCalledTimes(2);
    act(() => { vi.advanceTimersByTime(1000); }); // 2s total
    expect(MockEventSource).toHaveBeenCalledTimes(3);
  });

  it('caps backoff delay at 30 seconds', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    // Exhaust delays to max
    for (let i = 0; i < 8; i++) {
      act(() => { lastInstance?.onerror?.(); });
      act(() => { vi.advanceTimersByTime(30_001); });
    }
    const callsBefore = MockEventSource.mock.calls.length;
    // One more error — should reconnect in ≤30s
    act(() => { lastInstance?.onerror?.(); });
    act(() => { vi.advanceTimersByTime(30_001); });
    expect(MockEventSource.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    const instance = lastInstance!;
    unmount();
    expect(instance.close).toHaveBeenCalled();
  });

  it('sets status to disconnected on unmount', () => {
    const { unmount } = renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    act(() => { lastInstance?.onopen?.(); });
    unmount();
    expect(useSSEConnectionStore.getState().status).toBe('disconnected');
  });

  it('does not reconnect after unmount', () => {
    const { unmount } = renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    unmount();
    // Error on old instance should not trigger a new connection
    act(() => { lastInstance?.onerror?.(); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(MockEventSource).toHaveBeenCalledTimes(1);
  });

  it('cancels pending reconnect timer on unmount', () => {
    const { unmount } = renderHook(() => useWorkspaceEvents(vi.fn()), { wrapper });
    act(() => { lastInstance?.onerror?.(); }); // schedules 1s reconnect
    unmount(); // cancels the timer
    act(() => { vi.advanceTimersByTime(2000); });
    expect(MockEventSource).toHaveBeenCalledTimes(1);
  });

  it('passes all event fields through to the handler', () => {
    const handler = vi.fn();
    renderHook(() => useWorkspaceEvents(handler), { wrapper });
    const event = makeEvent({
      type: 'record.updated',
      table: 'driver',
      recordId: 'drv-1',
      tenantId: 'org-abc',
      payload: { field: 'points', from: 10, to: 25 },
    });
    act(() => {
      lastInstance?.onmessage?.({ data: JSON.stringify(event) });
    });
    expect(handler).toHaveBeenCalledWith(event);
  });
});

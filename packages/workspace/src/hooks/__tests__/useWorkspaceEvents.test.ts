/**
 * Unit tests for useWorkspaceEvents hook.
 *
 * We mock EventSource at the global level and exercise connection state
 * transitions, event delivery, and auto-reconnect logic without a real server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceEvents } from '../useWorkspaceEvents';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Mock EventSource ──────────────────────────────────────────────────────────

type EventListener = (ev: Event) => void;
type MessageListener = (ev: MessageEvent) => void;

interface MockEventSourceInstance {
  url: string;
  listeners: Map<string, (EventListener | MessageListener)[]>;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: (type: string, data?: unknown) => void;
}

let mockESInstances: MockEventSourceInstance[] = [];

class MockEventSource {
  url: string;
  listeners: Map<string, (EventListener | MessageListener)[]> = new Map();
  close = vi.fn(() => {
    /* noop */
  });

  constructor(url: string) {
    this.url = url;
    // Cast to satisfy the interface shape expected by the hook.
    mockESInstances.push(this as unknown as MockEventSourceInstance);
  }

  addEventListener(type: string, fn: EventListener | MessageListener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(fn);
  }

  dispatchEvent(type: string, data?: unknown) {
    const handlers = this.listeners.get(type) ?? [];
    for (const handler of handlers) {
      if (type === 'workspace' || type === 'message') {
        (handler as MessageListener)({ data: JSON.stringify(data) } as MessageEvent);
      } else {
        (handler as EventListener)({} as Event);
      }
    }
  }
}

beforeEach(() => {
  mockESInstances = [];
  vi.stubGlobal('EventSource', MockEventSource);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('useWorkspaceEvents', () => {
  it('starts in connecting state', () => {
    const { result } = renderHook(() => useWorkspaceEvents(vi.fn()));
    expect(result.current).toBe('connecting');
  });

  it('transitions to connected when EventSource opens', () => {
    const { result } = renderHook(() => useWorkspaceEvents(vi.fn()));

    act(() => {
      mockESInstances[0].dispatchEvent('open');
    });

    expect(result.current).toBe('connected');
  });

  it('calls the callback when a workspace event is received', () => {
    const callback = vi.fn();
    renderHook(() => useWorkspaceEvents(callback));

    const event: WorkspaceEvent = {
      type: 'record.created',
      tenantId: 't1',
      timestamp: new Date().toISOString(),
      table: 'races',
    };

    act(() => {
      mockESInstances[0].dispatchEvent('open');
      mockESInstances[0].dispatchEvent('workspace', event);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0]).toMatchObject({ type: 'record.created', table: 'races' });
  });

  it('transitions to disconnected and schedules a retry on error', () => {
    const { result } = renderHook(() => useWorkspaceEvents(vi.fn()));

    act(() => {
      mockESInstances[0].dispatchEvent('open');
      mockESInstances[0].dispatchEvent('error');
    });

    expect(result.current).toBe('disconnected');
    // One EventSource has been created so far; after 1 s back-off a second should appear.
    expect(mockESInstances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockESInstances).toHaveLength(2);
  });

  it('doubles the back-off on consecutive failures (max 30 s)', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()));

    // First failure: retry after 1 s.
    act(() => {
      mockESInstances[0].dispatchEvent('error');
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockESInstances).toHaveLength(2);

    // Second failure: retry after 2 s.
    act(() => {
      mockESInstances[1].dispatchEvent('error');
    });
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(mockESInstances).toHaveLength(2); // not yet
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockESInstances).toHaveLength(3);
  });

  it('resets back-off after a successful connection', () => {
    renderHook(() => useWorkspaceEvents(vi.fn()));

    // Fail once (1 s back-off → retry).
    act(() => {
      mockESInstances[0].dispatchEvent('error');
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockESInstances).toHaveLength(2);

    // Connect successfully → back-off resets to 1 s.
    act(() => {
      mockESInstances[1].dispatchEvent('open');
    });

    // Fail again; should wait 1 s (not 2 s).
    act(() => {
      mockESInstances[1].dispatchEvent('error');
    });
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(mockESInstances).toHaveLength(2); // 1 ms short
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockESInstances).toHaveLength(3);
  });

  it('closes EventSource and cancels retry timer on unmount', () => {
    const { unmount } = renderHook(() => useWorkspaceEvents(vi.fn()));
    const firstES = mockESInstances[0];

    // Trigger a disconnect so a retry timer is pending.
    act(() => {
      firstES.dispatchEvent('error');
    });

    unmount();

    // Timer should be cancelled — no new EventSource after 1 s.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockESInstances).toHaveLength(1);
    expect(firstES.close).toHaveBeenCalled();
  });

  it('picks up a new callback reference without reconnecting', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const { rerender } = renderHook(({ cb }) => useWorkspaceEvents(cb), {
      initialProps: { cb: cb1 },
    });

    act(() => {
      mockESInstances[0].dispatchEvent('open');
    });

    rerender({ cb: cb2 });

    const event: WorkspaceEvent = {
      type: 'view.saved',
      tenantId: 't1',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      mockESInstances[0].dispatchEvent('workspace', event);
    });

    // Still only one EventSource instance (no reconnect on callback change).
    expect(mockESInstances).toHaveLength(1);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledOnce();
  });
});

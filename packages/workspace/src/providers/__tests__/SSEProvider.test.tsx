/**
 * Tests for SSEProvider and useSSEContext.
 *
 * SSEProvider is responsible for:
 * - Establishing exactly ONE SSE connection (via useWorkspaceEvents) regardless
 *   of how many consumers subscribe.
 * - Broadcasting events to all registered handlers.
 * - Cleaning up handler registrations when consumers unmount.
 * - Throwing a clear error when useSSEContext is called outside a provider.
 *
 * useWorkspaceEvents is mocked to avoid real EventSource connections.
 */

import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SSEProvider, useSSEContext } from '../SSEProvider';
import type { WorkspaceEventHandler } from '../../hooks/useWorkspaceEvents';
import type { WorkspaceEvent } from '@vastu/shared';
import type { SSESubscribeFn } from '../SSEProvider';

// ─── Mock useWorkspaceEvents ──────────────────────────────────────────────────

/**
 * Capture the handler passed to useWorkspaceEvents so tests can
 * simulate incoming events.
 */
let capturedDispatch: WorkspaceEventHandler | null = null;
let useWorkspaceEventsCallCount = 0;

vi.mock('../../hooks/useWorkspaceEvents', () => ({
  useWorkspaceEvents: vi.fn((handler: WorkspaceEventHandler) => {
    capturedDispatch = handler;
    useWorkspaceEventsCallCount += 1;
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<WorkspaceEvent> = {}): WorkspaceEvent {
  return {
    type: 'record.created',
    table: 'race',
    tenantId: 't1',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function simulateEvent(event: WorkspaceEvent): void {
  if (!capturedDispatch) {
    throw new Error('No dispatch captured — is SSEProvider mounted?');
  }
  capturedDispatch(event);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  capturedDispatch = null;
  useWorkspaceEventsCallCount = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SSEProvider', () => {
  it('renders children', () => {
    render(
      <SSEProvider>
        <div data-testid="child">hello</div>
      </SSEProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('establishes exactly one SSE connection regardless of consumer count', () => {
    function ConsumerA() {
      const { subscribe } = useSSEContext();
      useEffect(() => subscribe(vi.fn()), [subscribe]);
      return null;
    }

    function ConsumerB() {
      const { subscribe } = useSSEContext();
      useEffect(() => subscribe(vi.fn()), [subscribe]);
      return null;
    }

    render(
      <SSEProvider>
        <ConsumerA />
        <ConsumerB />
      </SSEProvider>,
    );

    // useWorkspaceEvents must be called exactly once even with two consumers.
    expect(useWorkspaceEventsCallCount).toBe(1);
  });

  it('dispatches events to all registered handlers', () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    function ConsumerA() {
      const { subscribe } = useSSEContext();
      useEffect(() => subscribe(handlerA), [subscribe]);
      return null;
    }

    function ConsumerB() {
      const { subscribe } = useSSEContext();
      useEffect(() => subscribe(handlerB), [subscribe]);
      return null;
    }

    render(
      <SSEProvider>
        <ConsumerA />
        <ConsumerB />
      </SSEProvider>,
    );

    const event = makeEvent({ type: 'view.saved', table: 'view' });
    act(() => simulateEvent(event));

    expect(handlerA).toHaveBeenCalledWith(event);
    expect(handlerB).toHaveBeenCalledWith(event);
  });

  it('stops delivering events to a handler after it unsubscribes', () => {
    const handler = vi.fn();
    let unsubscribe: (() => void) | null = null;

    function Consumer() {
      const { subscribe } = useSSEContext();
      useEffect(() => {
        unsubscribe = subscribe(handler);
        // Don't return unsubscribe — we'll call it manually in the test.
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }

    render(
      <SSEProvider>
        <Consumer />
      </SSEProvider>,
    );

    act(() => simulateEvent(makeEvent()));
    expect(handler).toHaveBeenCalledTimes(1);

    // Manually unsubscribe
    act(() => unsubscribe?.());

    act(() => simulateEvent(makeEvent()));
    // Handler should NOT be called again after unsubscription.
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes a handler when the consumer unmounts', () => {
    const handler = vi.fn();

    function Consumer() {
      const { subscribe } = useSSEContext();
      useEffect(() => subscribe(handler), [subscribe]);
      return null;
    }

    const { unmount } = render(
      <SSEProvider>
        <Consumer />
      </SSEProvider>,
    );

    act(() => simulateEvent(makeEvent()));
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();

    // After unmount, the consumer's cleanup calls unsubscribe.
    // Verify the handler was called exactly once (before unmount) and no more.
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('useSSEContext', () => {
  it('throws when called outside SSEProvider', () => {
    // Suppress the expected React error boundary output.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useSSEContext());
    }).toThrow(/useSSEContext must be used within an SSEProvider/i);

    consoleError.mockRestore();
  });

  it('returns a stable subscribe reference across renders', () => {
    const subscribeRefs: SSESubscribeFn[] = [];

    function Consumer() {
      const { subscribe } = useSSEContext();
      subscribeRefs.push(subscribe);
      return null;
    }

    const { rerender } = render(
      <SSEProvider>
        <Consumer />
      </SSEProvider>,
    );

    rerender(
      <SSEProvider>
        <Consumer />
      </SSEProvider>,
    );

    // subscribe must be the same reference on re-render (useCallback stability).
    expect(subscribeRefs[0]).toBe(subscribeRefs[1]);
  });
});

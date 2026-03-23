/**
 * Unit tests for the workspace event bus.
 *
 * Tests: emitWorkspaceEvent, subscribe (tenant scoping), unsubscribe, subscriberCount.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitWorkspaceEvent, subscribe, subscriberCount } from '../events';

describe('workspace event bus', () => {
  it('calls a subscriber when an event for its tenant is emitted', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe('tenant-1', callback);

    emitWorkspaceEvent({ type: 'record.created', tenantId: 'tenant-1', table: 'races' });

    expect(callback).toHaveBeenCalledOnce();
    const received = callback.mock.calls[0][0];
    expect(received.type).toBe('record.created');
    expect(received.tenantId).toBe('tenant-1');
    expect(received.table).toBe('races');
    expect(typeof received.timestamp).toBe('string');

    unsubscribe();
  });

  it('does not call a subscriber for a different tenant', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe('tenant-2', callback);

    emitWorkspaceEvent({ type: 'record.updated', tenantId: 'tenant-1' });

    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('auto-adds an ISO timestamp when not provided', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe('t1', callback);

    emitWorkspaceEvent({ type: 'view.saved', tenantId: 't1' });

    const event = callback.mock.calls[0][0];
    expect(() => new Date(event.timestamp)).not.toThrow();
    expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0);

    unsubscribe();
  });

  it('preserves a caller-provided timestamp', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe('t1', callback);
    const ts = '2026-01-01T00:00:00.000Z';

    emitWorkspaceEvent({ type: 'config.changed', tenantId: 't1', timestamp: ts });

    expect(callback.mock.calls[0][0].timestamp).toBe(ts);
    unsubscribe();
  });

  it('stops delivering events after unsubscribe is called', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe('t1', callback);

    emitWorkspaceEvent({ type: 'record.deleted', tenantId: 't1' });
    unsubscribe();
    emitWorkspaceEvent({ type: 'record.deleted', tenantId: 't1' });

    expect(callback).toHaveBeenCalledOnce();
  });

  it('supports multiple simultaneous subscribers for the same tenant', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub1 = subscribe('t1', cb1);
    const unsub2 = subscribe('t1', cb2);

    emitWorkspaceEvent({ type: 'record.created', tenantId: 't1' });

    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();

    unsub1();
    unsub2();
  });

  it('subscriberCount reflects the current number of listeners', () => {
    const before = subscriberCount();
    const unsub = subscribe('t1', vi.fn());
    expect(subscriberCount()).toBe(before + 1);
    unsub();
    expect(subscriberCount()).toBe(before);
  });

  it('forwards optional payload to the subscriber', () => {
    const callback = vi.fn();
    const unsubscribe = subscribe('t1', callback);

    emitWorkspaceEvent({
      type: 'record.created',
      tenantId: 't1',
      payload: { foo: 'bar' },
    });

    expect(callback.mock.calls[0][0].payload).toEqual({ foo: 'bar' });
    unsubscribe();
  });
});

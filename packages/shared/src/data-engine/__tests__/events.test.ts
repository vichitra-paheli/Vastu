import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  emitWorkspaceEvent,
  subscribe,
  unsubscribe,
  getSubscriberCount,
  _resetBus,
} from '../events';
import type { WorkspaceEvent } from '../eventTypes';

function makeEvent(overrides: Partial<WorkspaceEvent> = {}): WorkspaceEvent {
  return {
    type: 'record.created',
    table: 'race',
    tenantId: 'tenant-abc',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  _resetBus();
});

describe('subscribe / emitWorkspaceEvent', () => {
  it('delivers an emitted event to a subscriber for the same tenant', () => {
    const cb = vi.fn();
    subscribe('tenant-abc', cb);
    const event = makeEvent();
    emitWorkspaceEvent(event);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(event);
  });

  it('does not deliver events to subscribers for a different tenant', () => {
    const cb = vi.fn();
    subscribe('tenant-xyz', cb);
    emitWorkspaceEvent(makeEvent({ tenantId: 'tenant-abc' }));
    expect(cb).not.toHaveBeenCalled();
  });

  it('delivers events to multiple subscribers for the same tenant', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    subscribe('tenant-abc', cb1);
    subscribe('tenant-abc', cb2);
    emitWorkspaceEvent(makeEvent());
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('delivers all event types correctly', () => {
    const received: WorkspaceEvent[] = [];
    subscribe('t1', (e) => received.push(e));

    const types = [
      'record.created',
      'record.updated',
      'record.deleted',
      'view.saved',
      'config.changed',
    ] as const;

    for (const type of types) {
      emitWorkspaceEvent(makeEvent({ type, tenantId: 't1' }));
    }

    expect(received).toHaveLength(types.length);
    expect(received.map((e) => e.type)).toEqual([...types]);
  });

  it('passes optional recordId and payload through', () => {
    const cb = vi.fn();
    subscribe('t1', cb);
    const event = makeEvent({ tenantId: 't1', recordId: 'rec-1', payload: { key: 'value' } });
    emitWorkspaceEvent(event);
    expect(cb).toHaveBeenCalledWith(event);
  });
});

describe('unsubscribe', () => {
  it('stops delivering events after unsubscribe', () => {
    const cb = vi.fn();
    const id = subscribe('t1', cb);
    unsubscribe(id, 't1');
    emitWorkspaceEvent(makeEvent({ tenantId: 't1' }));
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not throw when called with a non-existent id', () => {
    expect(() => unsubscribe('nonexistent', 't1')).not.toThrow();
  });

  it('only removes the specified subscription, not others', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const id1 = subscribe('t1', cb1);
    subscribe('t1', cb2);
    unsubscribe(id1, 't1');
    emitWorkspaceEvent(makeEvent({ tenantId: 't1' }));
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledOnce();
  });
});

describe('getSubscriberCount', () => {
  it('returns 0 when no subscribers are registered', () => {
    expect(getSubscriberCount('t1')).toBe(0);
  });

  it('increments on subscribe', () => {
    subscribe('t1', vi.fn());
    subscribe('t1', vi.fn());
    expect(getSubscriberCount('t1')).toBe(2);
  });

  it('decrements on unsubscribe', () => {
    const id = subscribe('t1', vi.fn());
    subscribe('t1', vi.fn());
    unsubscribe(id, 't1');
    expect(getSubscriberCount('t1')).toBe(1);
  });

  it('does not count subscribers for other tenants', () => {
    subscribe('t1', vi.fn());
    subscribe('t2', vi.fn());
    expect(getSubscriberCount('t1')).toBe(1);
    expect(getSubscriberCount('t2')).toBe(1);
  });
});

describe('_resetBus', () => {
  it('clears all subscriptions', () => {
    subscribe('t1', vi.fn());
    subscribe('t2', vi.fn());
    _resetBus();
    expect(getSubscriberCount('t1')).toBe(0);
    expect(getSubscriberCount('t2')).toBe(0);
  });
});

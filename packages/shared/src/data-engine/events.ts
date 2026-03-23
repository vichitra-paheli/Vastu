/**
 * In-process workspace event bus.
 *
 * Uses Node.js EventEmitter for single-process, in-memory pub/sub.
 * All events are scoped to a tenantId so that subscribers only
 * receive events for their own organization.
 *
 * This is intentionally simple for Phase 2A (single-process).
 * A Redis pub/sub adapter should replace this in a multi-instance
 * deployment (Phase 3+).
 *
 * Usage (emit):
 *   import { emitWorkspaceEvent } from '@vastu/shared/data-engine/events';
 *   emitWorkspaceEvent({ type: 'record.created', table: 'race', tenantId, timestamp: new Date().toISOString() });
 *
 * Usage (subscribe):
 *   import { subscribe, unsubscribe } from '@vastu/shared/data-engine/events';
 *   const id = subscribe('tenant-123', (event) => { ... });
 *   // later:
 *   unsubscribe(id);
 *
 * Implements US-207 AC-2, AC-4.
 */

import { EventEmitter } from 'events';
import type { WorkspaceEvent } from './eventTypes';

// ─── Internal bus ─────────────────────────────────────────────────────────────

/** Singleton EventEmitter used as the internal bus. */
const bus = new EventEmitter();

/**
 * Increase the default listener limit to accommodate many simultaneous SSE
 * connections without triggering Node's MaxListenersExceededWarning.
 * 100 concurrent SSE connections per process is generous for Phase 2A.
 */
bus.setMaxListeners(100);

// ─── Types ────────────────────────────────────────────────────────────────────

/** Callback invoked whenever a matching event fires for a tenant. */
export type WorkspaceEventCallback = (event: WorkspaceEvent) => void;

/** Opaque subscription identifier returned by `subscribe()`. */
export type SubscriptionId = string;

/** Internal map from subscription ID to its registered listener. */
const subscriptions = new Map<SubscriptionId, WorkspaceEventCallback>();

/** Monotonically-increasing counter for generating unique subscription IDs. */
let counter = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Emit a workspace event to all subscribers for the given tenant.
 *
 * @param event - The event to publish. `timestamp` should be an ISO-8601 string.
 */
export function emitWorkspaceEvent(event: WorkspaceEvent): void {
  bus.emit(`tenant:${event.tenantId}`, event);
}

/**
 * Subscribe to all workspace events for a specific tenant.
 *
 * @param tenantId - Only events with a matching `tenantId` will be delivered.
 * @param callback - Called with each `WorkspaceEvent` as it arrives.
 * @returns An opaque `SubscriptionId` that can be passed to `unsubscribe()`.
 */
export function subscribe(
  tenantId: string,
  callback: WorkspaceEventCallback,
): SubscriptionId {
  const id: SubscriptionId = `sub_${++counter}_${tenantId}`;
  subscriptions.set(id, callback);
  bus.on(`tenant:${tenantId}`, callback);
  return id;
}

/**
 * Unsubscribe a previously registered listener.
 *
 * @param id - The `SubscriptionId` returned by `subscribe()`.
 * @param tenantId - The tenantId used when subscribing.
 */
export function unsubscribe(id: SubscriptionId, tenantId: string): void {
  const callback = subscriptions.get(id);
  if (callback) {
    bus.off(`tenant:${tenantId}`, callback);
    subscriptions.delete(id);
  }
}

/**
 * Returns the number of active subscriptions for a tenant.
 * Useful for testing and diagnostics.
 */
export function getSubscriberCount(tenantId: string): number {
  return bus.listenerCount(`tenant:${tenantId}`);
}

/**
 * Remove all subscriptions. Intended for use in tests only.
 * @internal
 */
export function _resetBus(): void {
  bus.removeAllListeners();
  subscriptions.clear();
  counter = 0;
}

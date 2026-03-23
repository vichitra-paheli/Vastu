/**
 * In-process event bus for workspace events.
 *
 * Uses Node.js EventEmitter under the hood. This is intentionally a single-
 * process implementation for Phase 2A. In Phase 3 this will be replaced by a
 * Redis Pub/Sub fan-out so that events can cross process boundaries.
 *
 * Usage (server-side — API routes, seed scripts):
 *
 *   import { emitWorkspaceEvent } from '@vastu/shared/data-engine/events';
 *
 *   emitWorkspaceEvent({
 *     type: 'record.created',
 *     table: 'races',
 *     recordId: race.id,
 *     tenantId: session.user.tenantId,
 *   });
 *
 * The SSE route handler subscribes on behalf of each connected client and
 * filters events by tenantId before forwarding them.
 *
 * Implements US-207 AC-2, AC-11.
 */

import { EventEmitter } from 'events';
import type { WorkspaceEvent } from './eventTypes';

// ─── Internal bus ─────────────────────────────────────────────────────────────

/**
 * We increase the default listener limit to accommodate many concurrent SSE
 * connections (one listener per connected browser tab).
 */
const WORKSPACE_EVENT_CHANNEL = 'workspace:event';
const MAX_LISTENERS = 1024;

class WorkspaceEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(MAX_LISTENERS);
  }
}

/** Module-level singleton — shared across the process lifetime. */
const bus = new WorkspaceEventBus();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Emit a workspace event to all current subscribers.
 *
 * Automatically adds an ISO-8601 `timestamp` if one is not already present.
 *
 * @param event - The event to emit. `tenantId` is required.
 */
export function emitWorkspaceEvent(
  event: Omit<WorkspaceEvent, 'timestamp'> & { timestamp?: string },
): void {
  const fullEvent: WorkspaceEvent = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  bus.emit(WORKSPACE_EVENT_CHANNEL, fullEvent);
}

/**
 * Subscribe to all workspace events.
 *
 * Returns an unsubscribe function — call it when the subscriber is no longer
 * active (e.g. when the SSE connection closes) to prevent memory leaks.
 *
 * @param tenantId - Only events for this tenant are forwarded to `callback`.
 * @param callback - Called with each matching event.
 * @returns An `unsubscribe` function.
 */
export function subscribe(
  tenantId: string,
  callback: (event: WorkspaceEvent) => void,
): () => void {
  const handler = (event: WorkspaceEvent) => {
    if (event.tenantId === tenantId) {
      callback(event);
    }
  };

  bus.on(WORKSPACE_EVENT_CHANNEL, handler);

  return () => {
    bus.off(WORKSPACE_EVENT_CHANNEL, handler);
  };
}

/**
 * Returns the current number of active subscribers on the bus.
 * Useful for health checks and debugging.
 */
export function subscriberCount(): number {
  return bus.listenerCount(WORKSPACE_EVENT_CHANNEL);
}

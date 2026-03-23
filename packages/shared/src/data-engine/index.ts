/**
 * @vastu/shared — data-engine public API.
 *
 * Exports event types and the event bus utilities used by both the SSE
 * endpoint (packages/shell) and consumer API routes / seed scripts.
 */

export type { WorkspaceEvent, WorkspaceEventType } from './eventTypes';
export { emitWorkspaceEvent, subscribe, subscriberCount } from './events';

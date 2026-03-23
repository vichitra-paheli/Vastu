/**
 * WorkspaceEvent — typed workspace event for the in-process event bus.
 *
 * Consumers receive events over SSE. Server-side producers emit via
 * `emitWorkspaceEvent()`. All events are tenant-scoped so that
 * subscribers only receive events belonging to their organization.
 *
 * Implements US-207 AC-2, AC-3.
 */

/** Discriminated union of all workspace event types. */
export type WorkspaceEventType =
  | 'record.created'
  | 'record.updated'
  | 'record.deleted'
  | 'view.saved'
  | 'config.changed';

/** A single workspace event emitted by any server-side action. */
export interface WorkspaceEvent {
  /** Event type discriminator. */
  type: WorkspaceEventType;
  /** The database table / model the event pertains to (e.g. "race", "driver"). */
  table: string;
  /** The primary key of the affected record, if applicable. */
  recordId?: string;
  /** The tenant (organization) this event belongs to. Required for scoping. */
  tenantId: string;
  /** ISO-8601 timestamp when the event occurred. */
  timestamp: string;
  /** Optional extra data relevant to the event type. */
  payload?: Record<string, unknown>;
}

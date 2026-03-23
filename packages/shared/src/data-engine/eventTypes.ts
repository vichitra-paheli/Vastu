/**
 * WorkspaceEvent — event types for the SSE live-update system.
 *
 * Events are emitted server-side (e.g. in API routes or seed scripts)
 * and delivered to subscribed clients via the SSE endpoint at
 * /api/workspace/events.
 *
 * Events are always scoped to a tenantId so that users only receive
 * events for their own organisation.
 *
 * Implements US-207 AC-2, AC-3.
 */

/** The union of all workspace event type strings. */
export type WorkspaceEventType =
  | 'record.created'
  | 'record.updated'
  | 'record.deleted'
  | 'view.saved'
  | 'config.changed';

/**
 * A workspace event payload that can be emitted and received via SSE.
 *
 * All fields except `type`, `tenantId`, and `timestamp` are optional so
 * that non-record events (e.g. `config.changed`) can omit `table` and
 * `recordId`.
 */
export interface WorkspaceEvent {
  /** Discriminating type tag. */
  type: WorkspaceEventType;

  /** The tenant this event belongs to. Clients are only sent events for
   *  their own tenant. Required for all events. */
  tenantId: string;

  /** ISO-8601 timestamp set by the emitter. */
  timestamp: string;

  /** Prisma model name (lowercase, e.g. 'race', 'driver'). */
  table?: string;

  /** Primary-key value of the affected record. */
  recordId?: string;

  /** Arbitrary extra data for the event consumer. */
  payload?: Record<string, unknown>;
}

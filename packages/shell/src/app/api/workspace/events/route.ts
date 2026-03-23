/**
 * GET /api/workspace/events — Server-Sent Events endpoint.
 *
 * Streams workspace events to the connected client using the native
 * ReadableStream API (no external dependencies required).
 *
 * Tenant scoping: only events for the authenticated user's tenantId are
 * forwarded.  If the user has no tenantId (org-level only), the connection
 * is accepted but no events will be delivered (future-proof: org-level
 * events can be added without a schema change).
 *
 * Protocol:
 *   - Content-Type: text/event-stream; charset=utf-8
 *   - Each event: `event: workspace\ndata: <JSON>\n\n`
 *   - Heartbeat every 30 s: `: heartbeat\n\n`  (comment line, ignored by EventSource)
 *   - `retry: 1000` sent on connect to seed the client's reconnect interval
 *
 * The client must supply a valid session cookie. Unauthenticated requests
 * receive a 401 JSON response, not an SSE stream.
 *
 * Implements US-207 AC-1, AC-4, AC-11.
 */

import { getSession } from '@/lib/session';
import { subscribe } from '@vastu/shared/data-engine/events';
import type { WorkspaceEvent } from '@vastu/shared/data-engine/eventTypes';

// 30-second heartbeat keeps connections alive through proxies and load balancers.
const HEARTBEAT_MS = 30_000;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // tenantId may be null for org-level admins; we use organizationId as a
  // fallback scope so they still receive a valid stream (zero events).
  const tenantId = session.user.tenantId ?? `org:${session.user.organizationId}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // ── Helpers ───────────────────────────────────────────────────────────

      function send(chunk: string) {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed — nothing to do.
        }
      }

      function sendEvent(event: WorkspaceEvent) {
        send(`event: workspace\ndata: ${JSON.stringify(event)}\n\n`);
      }

      function sendHeartbeat() {
        send(': heartbeat\n\n');
      }

      // ── Seed client reconnect interval (1 second initial back-off) ────────
      send('retry: 1000\n\n');

      // ── Subscribe to the in-process event bus ─────────────────────────────
      const unsubscribe = subscribe(tenantId, sendEvent);

      // ── Heartbeat timer ───────────────────────────────────────────────────
      const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);

      // ── Cleanup on stream cancel (client disconnect) ──────────────────────
      return () => {
        clearInterval(heartbeatTimer);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable Nginx / proxy buffering for SSE
      'X-Accel-Buffering': 'no',
    },
  });
}

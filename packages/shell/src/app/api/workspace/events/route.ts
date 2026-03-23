/**
 * GET /api/workspace/events — Server-Sent Events endpoint for workspace.
 *
 * Streams workspace events to the authenticated browser client using the
 * native Web Streams API (ReadableStream). No external libraries required.
 *
 * Security:
 * - Requires an authenticated session. Returns 401 otherwise.
 * - Events are tenant-scoped: only events for the user's organization
 *   are forwarded to the client.
 *
 * SSE protocol:
 * - `data:` field carries JSON-encoded WorkspaceEvent.
 * - `retry: 1000` advises the browser to reconnect after 1 second on loss.
 * - A `:heartbeat` comment is sent every 30 seconds to keep the connection
 *   alive through proxies and load balancers that close idle connections.
 *
 * Lifecycle:
 * - On connect: subscribe to tenant's event channel.
 * - On disconnect: unsubscribe to prevent memory leaks.
 *
 * Implements US-207 AC-1, AC-3, AC-4, AC-9.
 */

import { subscribe, unsubscribe } from '@vastu/shared/data-engine';
import type { WorkspaceEvent } from '@vastu/shared/data-engine';
import { getSession } from '@/lib/session';

/** Heartbeat interval in milliseconds (30 seconds). */
const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET(): Promise<Response> {
  const session = await getSession();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const tenantId = session.user.organizationId;

  if (!tenantId) {
    return new Response('No organization associated with this session', { status: 403 });
  }

  let subscriptionId: string | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      /**
       * Encode a raw SSE chunk string and enqueue it in the stream.
       */
      function send(chunk: string): void {
        try {
          controller.enqueue(new TextEncoder().encode(chunk));
        } catch {
          // Stream may already be closed if the client disconnected.
        }
      }

      /**
       * Send the SSE `retry:` hint once at connection time so that the
       * browser knows how long to wait before reconnecting.
       * Send an initial `:ok` comment to flush headers to the client
       * immediately (some proxies buffer until the first byte arrives).
       */
      send('retry: 1000\n');
      send(':ok\n\n');

      /**
       * Forward an emitted WorkspaceEvent to this SSE client.
       * Each event is serialised as a single `data:` line followed by a
       * blank line (SSE message terminator).
       */
      function forwardEvent(event: WorkspaceEvent): void {
        send(`data: ${JSON.stringify(event)}\n\n`);
      }

      subscriptionId = subscribe(tenantId, forwardEvent);

      /**
       * Start the heartbeat. A `:heartbeat` comment (no `data:` field)
       * keeps the TCP connection alive through intermediary proxies.
       */
      heartbeatTimer = setInterval(() => {
        send(':heartbeat\n\n');
      }, HEARTBEAT_INTERVAL_MS);
    },

    cancel() {
      // Client disconnected or stream was cancelled — clean up resources.
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (subscriptionId !== null) {
        unsubscribe(subscriptionId, tenantId);
        subscriptionId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      /**
       * X-Accel-Buffering: no tells Nginx not to buffer the SSE stream,
       * which would otherwise cause events to arrive in batches instead
       * of individually.
       */
      'X-Accel-Buffering': 'no',
    },
  });
}

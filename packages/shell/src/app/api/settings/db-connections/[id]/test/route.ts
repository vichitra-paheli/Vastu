/**
 * POST /api/settings/db-connections/[id]/test
 *
 * Tests connectivity for a saved DB connection.
 * Decrypts the stored password, attempts a TCP-level connect (or a simple
 * dialect-appropriate query), and returns success/failure with latency.
 *
 * Because Phase 0 ships without a DB driver for arbitrary connections, this
 * route performs a DNS resolution + TCP handshake as a lightweight proxy for
 * a real connect. A real driver integration can be added in a later phase
 * without changing this contract.
 *
 * Returns:
 *   200 { success: true,  latencyMs: number }
 *   200 { success: false, error: string }
 *   401 { error: string }
 *   403 { error: string }
 *   404 { error: string }
 *   500 { error: string }
 *
 * MCP tool equivalent: test_db_connection({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import net from 'net';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { validateHostForSSRF, SsrfBlockedError } from '@vastu/shared/utils/validation.server';
import { requireSessionWithAbility } from '@/lib/session';

interface RouteContext {
  params: { id: string };
}

/** Attempt a TCP connection to host:port within timeoutMs. */
function tcpConnect(host: string, port: number, timeoutMs = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve(latency);
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Connection timed out after ${timeoutMs}ms`));
    });
  });
}

export async function POST(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'DbConnection')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    const connection = await prisma.dbConnection.findFirst({
      where: { id, organizationId: session.user.organizationId, deletedAt: null },
      select: { id: true, name: true, host: true, port: true },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    let success = false;
    let latencyMs = 0;
    let testError = '';

    try {
      // SSRF protection: validate the host resolves to a public IP before
      // opening any TCP connection. Throws SsrfBlockedError for private/
      // loopback/link-local targets; throws Error for DNS failures.
      await validateHostForSSRF(connection.host);

      latencyMs = await tcpConnect(connection.host, connection.port);
      success = true;

      // Update health status to live
      await prisma.dbConnection.update({
        where: { id },
        data: { healthStatus: 'live', lastHealthCheck: new Date() },
      });
    } catch (connectErr) {
      if (connectErr instanceof SsrfBlockedError) {
        // Surface SSRF blocks as a 403 immediately — don't update health
        // status or write an audit event for the blocked attempt, as the
        // connection record itself is not at fault.
        return NextResponse.json(
          { error: connectErr.message },
          { status: 403 },
        );
      }
      testError =
        connectErr instanceof Error ? connectErr.message : 'Connection failed';

      // Update health status to error
      await prisma.dbConnection.update({
        where: { id },
        data: { healthStatus: 'error', lastHealthCheck: new Date() },
      });
    }

    // Audit event (best effort)
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'db_connection.test',
      resourceType: 'DbConnection',
      resourceId: id,
      resourceDescription: `Tested connection: ${connection.name}`,
      payload: { result: success ? 'success' : 'failure', latencyMs, error: testError || undefined },
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      tenantId: session.user.tenantId ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((auditErr: unknown) => {
      console.error('[db-connections test] Failed to write audit event:', auditErr);
    });

    if (success) {
      return NextResponse.json({ success: true, latencyMs });
    }
    return NextResponse.json({ success: false, error: testError });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[db-connections test] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

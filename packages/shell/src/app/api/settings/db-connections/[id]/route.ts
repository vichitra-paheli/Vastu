/**
 * PATCH  /api/settings/db-connections/[id] — update a DB connection
 * DELETE /api/settings/db-connections/[id] — soft-delete a DB connection
 *
 * Returns:
 *   PATCH  200 { connection: DbConnection }
 *   DELETE 200 { success: true }
 *   400 { error: string }   — validation failure
 *   401 { error: string }   — unauthenticated
 *   403 { error: string }   — insufficient permissions
 *   404 { error: string }   — connection not found
 *   500 { error: string }   — unexpected failure
 *
 * MCP tool equivalent: update_db_connection({ id, ...fields }), delete_db_connection({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { encrypt, createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';

const DB_CONNECTION_SELECT = {
  id: true,
  name: true,
  host: true,
  port: true,
  database: true,
  username: true,
  sslEnabled: true,
  protocol: true,
  healthStatus: true,
  lastHealthCheck: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface RouteContext {
  params: { id: string };
}

interface UpdateDbConnectionBody {
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  sslEnabled?: boolean;
  protocol?: string;
}

function isUpdateBody(body: unknown): body is UpdateDbConnectionBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  const optionalString = (v: unknown) => v === undefined || typeof v === 'string';
  const optionalNumber = (v: unknown) => v === undefined || typeof v === 'number';
  const optionalBool = (v: unknown) => v === undefined || typeof v === 'boolean';
  return (
    optionalString(b.name) &&
    optionalString(b.host) &&
    optionalNumber(b.port) &&
    optionalString(b.database) &&
    optionalString(b.username) &&
    optionalString(b.password) &&
    optionalBool(b.sslEnabled) &&
    optionalString(b.protocol)
  );
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('update', 'DbConnection')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Verify the connection belongs to this org and is not deleted
    const existing = await prisma.dbConnection.findFirst({
      where: { id, organizationId: session.user.organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        database: true,
        username: true,
        sslEnabled: true,
        protocol: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    let body: UpdateDbConnectionBody;
    try {
      const raw = (await request.json()) as unknown;
      if (!isUpdateBody(raw)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = raw;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validate fields if provided
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: 'Connection name is required' }, { status: 400 });
    }
    if (body.host !== undefined && !body.host.trim()) {
      return NextResponse.json({ error: 'Host is required' }, { status: 400 });
    }
    if (body.database !== undefined && !body.database.trim()) {
      return NextResponse.json({ error: 'Database name is required' }, { status: 400 });
    }
    if (body.username !== undefined && !body.username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    if (
      body.port !== undefined &&
      (!Number.isInteger(body.port) || body.port < 1 || body.port > 65535)
    ) {
      return NextResponse.json({ error: 'Port must be between 1 and 65535' }, { status: 400 });
    }

    // Build the update data
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.host !== undefined) updateData.host = body.host.trim();
    if (body.port !== undefined) updateData.port = body.port;
    if (body.database !== undefined) updateData.database = body.database.trim();
    if (body.username !== undefined) updateData.username = body.username.trim();
    if (body.sslEnabled !== undefined) updateData.sslEnabled = body.sslEnabled;
    if (body.protocol !== undefined) updateData.protocol = body.protocol;
    if (body.password !== undefined && body.password) {
      updateData.encryptedPassword = encrypt(body.password);
    }

    const connection = await prisma.dbConnection.update({
      where: { id },
      data: updateData,
      select: DB_CONNECTION_SELECT,
    });

    // Audit event (best effort)
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'db_connection.update',
      resourceType: 'DbConnection',
      resourceId: connection.id,
      resourceDescription: `Updated DB connection: ${connection.name}`,
      beforeState: {
        name: existing.name,
        host: existing.host,
        port: existing.port,
        database: existing.database,
        username: existing.username,
        sslEnabled: existing.sslEnabled,
        protocol: existing.protocol,
      },
      afterState: {
        name: connection.name,
        host: connection.host,
        port: connection.port,
        database: connection.database,
        username: connection.username,
        sslEnabled: connection.sslEnabled,
        protocol: connection.protocol,
      },
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      tenantId: session.user.tenantId ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((auditErr: unknown) => {
      console.error('[db-connections PATCH] Failed to write audit event:', auditErr);
    });

    return NextResponse.json({ connection });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[db-connections PATCH] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('delete', 'DbConnection')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    const existing = await prisma.dbConnection.findFirst({
      where: { id, organizationId: session.user.organizationId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Soft-delete
    await prisma.dbConnection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit event (best effort)
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'db_connection.delete',
      resourceType: 'DbConnection',
      resourceId: id,
      resourceDescription: `Deleted DB connection: ${existing.name}`,
      beforeState: { deletedAt: null },
      afterState: { deletedAt: new Date().toISOString() },
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      tenantId: session.user.tenantId ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((auditErr: unknown) => {
      console.error('[db-connections DELETE] Failed to write audit event:', auditErr);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[db-connections DELETE] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

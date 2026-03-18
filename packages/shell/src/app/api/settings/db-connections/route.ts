/**
 * GET  /api/settings/db-connections — list all active DB connections for the org
 * POST /api/settings/db-connections — create a new DB connection
 *
 * All credentials are encrypted at rest using AES-256-GCM via encrypt() from @vastu/shared/utils.
 * The encryptedPassword column is never included in API responses.
 *
 * Returns:
 *   GET  200 { connections: DbConnection[] }
 *   POST 201 { connection: DbConnection }
 *   POST 400 { error: string }   — validation failure
 *   401 { error: string }        — unauthenticated
 *   403 { error: string }        — insufficient permissions
 *   500 { error: string }        — unexpected failure
 *
 * MCP tool equivalent: list_db_connections(), create_db_connection({ name, host, port, database, username, password, sslEnabled, protocol })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { encrypt, createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '../../../../lib/session';

// Fields returned to the client — encryptedPassword is intentionally excluded
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

interface CreateDbConnectionBody {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled?: boolean;
  protocol?: string;
}

function isCreateBody(body: unknown): body is CreateDbConnectionBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    typeof b.host === 'string' &&
    typeof b.port === 'number' &&
    typeof b.database === 'string' &&
    typeof b.username === 'string' &&
    typeof b.password === 'string'
  );
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'DbConnection')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const connections = await prisma.dbConnection.findMany({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
      },
      select: DB_CONNECTION_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ connections });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[db-connections GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('create', 'DbConnection')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: CreateDbConnectionBody;
    try {
      const raw = (await request.json()) as unknown;
      if (!isCreateBody(raw)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = raw;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Validation
    const name = body.name.trim();
    const host = body.host.trim();
    const database = body.database.trim();
    const username = body.username.trim();
    const password = body.password;
    const port = body.port;
    const sslEnabled = body.sslEnabled ?? false;
    const protocol = body.protocol ?? 'postgresql';

    if (!name) {
      return NextResponse.json({ error: 'Connection name is required' }, { status: 400 });
    }
    if (!host) {
      return NextResponse.json({ error: 'Host is required' }, { status: 400 });
    }
    if (!database) {
      return NextResponse.json({ error: 'Database name is required' }, { status: 400 });
    }
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json({ error: 'Port must be between 1 and 65535' }, { status: 400 });
    }

    const encryptedPassword = encrypt(password);

    const connection = await prisma.dbConnection.create({
      data: {
        name,
        host,
        port,
        database,
        username,
        encryptedPassword,
        sslEnabled,
        protocol,
        healthStatus: 'unknown',
        organizationId: session.user.organizationId,
      },
      select: DB_CONNECTION_SELECT,
    });

    // Audit event (best effort, non-blocking)
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'db_connection.create',
      resourceType: 'DbConnection',
      resourceId: connection.id,
      resourceDescription: `Created DB connection: ${connection.name}`,
      afterState: { host, port, protocol, database, username, sslEnabled },
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      tenantId: session.user.tenantId ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((auditErr: unknown) => {
      console.error('[db-connections POST] Failed to write audit event:', auditErr);
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[db-connections POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

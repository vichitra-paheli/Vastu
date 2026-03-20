/**
 * GET  /api/settings/api-keys — list all non-revoked API keys for the org
 * POST /api/settings/api-keys — generate a new API key
 *
 * Both endpoints require an authenticated session with appropriate CASL permissions.
 * The full raw key is returned ONLY in the POST response; subsequent reads
 * show only the keyPrefix (masked display in the UI).
 *
 * Returns:
 *   GET  200 { keys: ApiKey[] }
 *   POST 201 { key: ApiKey & { fullKey: string } }
 *   POST 400 { error: string }   — validation failure
 *   401 { error: string }        — unauthenticated
 *   403 { error: string }        — insufficient permissions
 *   500 { error: string }        — unexpected failure
 *
 * MCP tool equivalent: list_api_keys() / create_api_key({ name, scope, description })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { generateApiKey, createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';

// ---------------------------------------------------------------------------
// GET — list API keys for the authenticated user's organization
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'ApiKey')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const keys = await prisma.apiKey.findMany({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        description: true,
        lastUsedAt: true,
        requestCount24h: true,
        userId: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ keys });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api-keys GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — generate a new API key
// ---------------------------------------------------------------------------

interface CreateApiKeyBody {
  name: string;
  scope?: string;
  description?: string;
}

function isValidCreateBody(body: unknown): body is CreateApiKeyBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.name === 'string';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('create', 'ApiKey')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: CreateApiKeyBody;
    try {
      const raw = (await request.json()) as unknown;
      if (!isValidCreateBody(raw)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = raw;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const scope = body.scope?.trim() ?? 'full';
    const allowedScopes = ['full', 'read_only'];
    if (!allowedScopes.includes(scope)) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    const { key, prefix, hash } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash: hash,
        keyPrefix: prefix,
        scope,
        description: body.description?.trim() ?? null,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        description: true,
        lastUsedAt: true,
        requestCount24h: true,
        userId: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    // Write audit event — best effort
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'CREATE',
      resourceType: 'ApiKey',
      resourceId: apiKey.id,
      resourceDescription: `API key created: ${name}`,
      afterState: { id: apiKey.id, name, scope },
      organizationId: session.user.organizationId,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    }).catch((err: unknown) => {
      console.error('[api-keys] Failed to write audit event:', err);
    });

    return NextResponse.json(
      {
        // fullKey is returned ONCE and never stored in plaintext
        key: { ...apiKey, fullKey: key },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api-keys POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

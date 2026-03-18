/**
 * GET  /api/settings/api-keys — list all non-revoked API keys for the org
 * POST /api/settings/api-keys — generate a new API key
 *
 * Both endpoints require an authenticated session.
 * The full raw key is returned ONLY in the POST response; subsequent reads
 * show only the keyPrefix (masked display in the UI).
 *
 * MCP tool equivalent: list_api_keys() / create_api_key({ name, scope, description })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { generateApiKey, createAuditEvent } from '@vastu/shared/utils';
import { requireSession } from '../../../../lib/session';

// ---------------------------------------------------------------------------
// GET — list API keys for the authenticated user's organization
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  try {
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
    console.error('[api-keys] Failed to create API key:', err);
    return NextResponse.json({ error: 'Failed to create API key. Please try again.' }, { status: 500 });
  }
}

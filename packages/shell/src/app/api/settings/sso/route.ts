/**
 * GET  /api/settings/sso — List all configured SSO identity providers.
 * POST /api/settings/sso — Create a new SSO identity provider.
 *
 * Authentication: requires a valid session. Admin-only (CASL gated at the
 * page level; route also checks to prevent direct API abuse).
 *
 * Returns:
 *   GET  200 { providers: SsoProviderConfig[] }
 *   POST 201 { provider: SsoProviderConfig }
 *   POST 400 { error: string }   — validation failure
 *   401 { error: string }        — unauthenticated
 *   403 { error: string }        — insufficient permissions
 *   500 { error: string }        — unexpected failure
 *
 * MCP parity note: When the MCP server ships (Phase 4), these map to:
 *   GET  → list_sso_provider_configs()
 *   POST → create_sso_provider_config(input)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { encrypt, createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';
import type {
  SsoProviderListResponse,
  SsoProviderConfig,
  CreateSsoProviderInput,
  SsoProtocol,
  SsoProviderStatus,
} from '@/types/sso-provider';

// Fields returned to the client — encryptedClientSecret is intentionally excluded
const SSO_PROVIDER_SELECT = {
  id: true,
  name: true,
  type: true,
  status: true,
  isDefault: true,
  clientId: true,
  issuerUrl: true,
  metadataUrl: true,
  redirectUri: true,
  enabled: true,
  organizationId: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SsoProviderRow = {
  id: string;
  name: string;
  /** Prisma enum field name is `type`; values match SsoProtocol ('SAML' | 'OIDC') */
  type: SsoProtocol;
  status: SsoProviderStatus;
  isDefault: boolean;
  clientId: string | null;
  issuerUrl: string | null;
  metadataUrl: string | null;
  redirectUri: string | null;
  enabled: boolean;
  organizationId: string;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toProviderConfig(row: SsoProviderRow): SsoProviderConfig {
  return {
    id: row.id,
    name: row.name,
    protocol: row.type, // SsoProviderType enum values match SsoProtocol ('SAML' | 'OIDC')
    status: row.status,
    isDefault: row.isDefault,
    clientId: row.clientId,
    metadataUrl: row.metadataUrl,
    redirectUri: row.redirectUri,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isCreateInput(body: unknown): body is CreateSsoProviderInput {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    (b.protocol === 'SAML' || b.protocol === 'OIDC')
  );
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'SsoProvider')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.ssoProvider.findMany({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
      },
      select: SSO_PROVIDER_SELECT,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const response: SsoProviderListResponse = {
      providers: rows.map(toProviderConfig),
    };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[sso GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('create', 'SsoProvider')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: CreateSsoProviderInput;
    try {
      const raw = (await request.json()) as unknown;
      if (!isCreateInput(raw)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = raw;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }

    // Validate that at least one of metadataUrl or clientId is provided
    const metadataUrl = body.metadataUrl?.trim() || null;
    const clientId = body.clientId?.trim() || null;
    const redirectUri = body.redirectUri?.trim() || null;

    if (!metadataUrl && !clientId) {
      return NextResponse.json(
        { error: 'Either metadataUrl or clientId is required' },
        { status: 400 },
      );
    }

    // Encrypt client secret before storage if provided
    const encryptedClientSecret = body.clientSecret ? encrypt(body.clientSecret) : null;

    const provider = await prisma.ssoProvider.create({
      data: {
        name,
        type: body.protocol,
        status: 'DRAFT',
        isDefault: false,
        clientId,
        encryptedClientSecret,
        metadataUrl,
        redirectUri,
        enabled: false,
        organizationId: session.user.organizationId,
        tenantId: session.user.tenantId ?? null,
      },
      select: SSO_PROVIDER_SELECT,
    });

    // Audit event (best effort, non-blocking)
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'sso_provider.create',
      resourceType: 'SsoProvider',
      resourceId: provider.id,
      resourceDescription: `Created SSO provider: ${provider.name}`,
      afterState: {
        name: provider.name,
        type: provider.type,
        status: provider.status,
        metadataUrl: provider.metadataUrl,
        clientId: provider.clientId,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      tenantId: session.user.tenantId ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((auditErr: unknown) => {
      console.error('[sso POST] Failed to write audit event:', auditErr);
    });

    return NextResponse.json({ provider: toProviderConfig(provider) }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[sso POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

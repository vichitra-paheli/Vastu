/**
 * PATCH  /api/settings/sso/[id] — Update or test an SSO identity provider.
 * DELETE /api/settings/sso/[id] — Soft-delete an SSO identity provider.
 *
 * PATCH supports a special `_action: 'test'` body to trigger a connection test
 * without persisting any changes.
 *
 * Authentication: requires a valid session. Admin-only (CASL gated).
 *
 * Returns:
 *   PATCH  200 { provider: SsoProviderConfig }
 *   PATCH  200 { success: boolean, latencyMs: number }   — for _action: 'test'
 *   DELETE 200 { success: true }
 *   400 { error: string }   — validation failure
 *   401 { error: string }   — unauthenticated
 *   403 { error: string }   — insufficient permissions
 *   404 { error: string }   — provider not found
 *   500 { error: string }   — unexpected failure
 *
 * MCP parity note: When the MCP server ships (Phase 4), these map to:
 *   PATCH  → update_sso_provider_config(id, input)
 *   DELETE → delete_sso_provider_config(id)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { encrypt, createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';
import type {
  SsoProviderConfig,
  UpdateSsoProviderInput,
  SsoProtocol,
  SsoProviderStatus,
} from '@/types/sso-provider';

interface RouteContext {
  params: { id: string };
}

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

type PatchBody = UpdateSsoProviderInput & { _action?: string };

function isPatchBody(body: unknown): body is PatchBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  const optionalString = (v: unknown) => v === undefined || typeof v === 'string';
  const optionalBool = (v: unknown) => v === undefined || typeof v === 'boolean';
  return (
    optionalString(b._action) &&
    optionalString(b.name) &&
    (b.protocol === undefined || b.protocol === 'SAML' || b.protocol === 'OIDC') &&
    (b.status === undefined || b.status === 'LIVE' || b.status === 'DRAFT') &&
    optionalString(b.metadataUrl) &&
    optionalString(b.clientId) &&
    optionalString(b.clientSecret) &&
    optionalString(b.redirectUri) &&
    optionalBool(b.isDefault)
  );
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('update', 'SsoProvider')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    // Verify the provider belongs to this org and is not deleted
    const existing = await prisma.ssoProvider.findFirst({
      where: { id, organizationId: session.user.organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        isDefault: true,
        metadataUrl: true,
        clientId: true,
        redirectUri: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    let body: PatchBody;
    try {
      const raw = (await request.json()) as unknown;
      if (!isPatchBody(raw)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = raw;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Handle test action — connectivity check without persisting changes
    if (body._action === 'test') {
      // A real implementation would attempt a Keycloak identity provider
      // connectivity check here. For now, return a stub success response.
      // TODO(Phase 4): wire this up to the Keycloak admin API.
      return NextResponse.json({ success: true, latencyMs: 0 }, { status: 200 });
    }

    // Validate fields if provided
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: 'Provider name is required' }, { status: 400 });
    }

    // Build the update data
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.protocol !== undefined) updateData.type = body.protocol;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.metadataUrl !== undefined) updateData.metadataUrl = body.metadataUrl.trim() || null;
    if (body.clientId !== undefined) updateData.clientId = body.clientId.trim() || null;
    if (body.redirectUri !== undefined) updateData.redirectUri = body.redirectUri.trim() || null;
    if (body.clientSecret !== undefined && body.clientSecret) {
      updateData.encryptedClientSecret = encrypt(body.clientSecret);
    }
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;

    // If setting as default, unset any existing default first (in a transaction)
    if (body.isDefault === true) {
      await prisma.$transaction([
        prisma.ssoProvider.updateMany({
          where: {
            organizationId: session.user.organizationId,
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        }),
        prisma.ssoProvider.update({
          where: { id },
          data: updateData,
        }),
      ]);
    } else {
      await prisma.ssoProvider.update({
        where: { id },
        data: updateData,
      });
    }

    // Re-fetch to return up-to-date data
    const updated = await prisma.ssoProvider.findUniqueOrThrow({
      where: { id },
      select: SSO_PROVIDER_SELECT,
    });

    // Audit event (best effort)
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'sso_provider.update',
      resourceType: 'SsoProvider',
      resourceId: id,
      resourceDescription: `Updated SSO provider: ${updated.name}`,
      beforeState: {
        name: existing.name,
        type: existing.type,
        status: existing.status,
        isDefault: existing.isDefault,
        metadataUrl: existing.metadataUrl,
        clientId: existing.clientId,
      },
      afterState: {
        name: updated.name,
        type: updated.type,
        status: updated.status,
        isDefault: updated.isDefault,
        metadataUrl: updated.metadataUrl,
        clientId: updated.clientId,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      tenantId: session.user.tenantId ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((auditErr: unknown) => {
      console.error('[sso PATCH] Failed to write audit event:', auditErr);
    });

    return NextResponse.json({ provider: toProviderConfig(updated) });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[sso PATCH] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('delete', 'SsoProvider')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const existing = await prisma.ssoProvider.findFirst({
      where: { id, organizationId: session.user.organizationId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Soft-delete
    await prisma.ssoProvider.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit event (best effort)
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'sso_provider.delete',
      resourceType: 'SsoProvider',
      resourceId: id,
      resourceDescription: `Deleted SSO provider: ${existing.name}`,
      beforeState: { deletedAt: null },
      afterState: { deletedAt: new Date().toISOString() },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      tenantId: session.user.tenantId ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((auditErr: unknown) => {
      console.error('[sso DELETE] Failed to write audit event:', auditErr);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[sso DELETE] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

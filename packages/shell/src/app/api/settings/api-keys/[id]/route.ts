/**
 * DELETE /api/settings/api-keys/[id] — revoke an API key (soft-delete)
 *
 * Only the key owner's organization can revoke it.
 * Sets deletedAt to the current timestamp; the key is excluded from future
 * list queries but the record is retained for audit purposes.
 *
 * Returns:
 *   DELETE 200 { success: true }
 *   401 { error: string }   — unauthenticated
 *   403 { error: string }   — insufficient permissions
 *   404 { error: string }   — key not found
 *   500 { error: string }   — unexpected failure
 *
 * MCP tool equivalent: revoke_api_key({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('delete', 'ApiKey')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Verify the key exists and belongs to the same organization
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Write audit event — best effort
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'DELETE',
      resourceType: 'ApiKey',
      resourceId: id,
      resourceDescription: `API key revoked: ${apiKey.name}`,
      organizationId: session.user.organizationId,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    }).catch((err: unknown) => {
      console.error('[api-keys/[id]] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[api-keys/[id]] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

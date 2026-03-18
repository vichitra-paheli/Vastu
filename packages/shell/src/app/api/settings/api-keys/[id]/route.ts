/**
 * DELETE /api/settings/api-keys/[id] — revoke an API key (soft-delete)
 *
 * Only the key owner's organization can revoke it.
 * Sets deletedAt to the current timestamp; the key is excluded from future
 * list queries but the record is retained for audit purposes.
 *
 * MCP tool equivalent: revoke_api_key({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSession } from '../../../../../lib/session';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  try {
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
    console.error('[api-keys/[id]] Failed to revoke API key:', err);
    return NextResponse.json({ error: 'Failed to revoke API key. Please try again.' }, { status: 500 });
  }
}

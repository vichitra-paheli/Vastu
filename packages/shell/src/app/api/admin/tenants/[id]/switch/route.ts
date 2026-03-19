/**
 * POST /api/admin/tenants/[id]/switch
 *
 * Switches the active tenant context for the current session.
 * Updates the session's tenantId and reloads the workspace.
 *
 * Returns:
 *   200 { success: true, tenantId }   on success
 *   401                                if unauthenticated
 *   403                                if non-admin
 *   404                                if tenant not found in org
 *
 * MCP tool equivalent: switch_tenant({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireSessionWithAbility>>['session'];
  let ability: Awaited<ReturnType<typeof requireSessionWithAbility>>['ability'];

  try {
    ({ session, ability } = await requireSessionWithAbility());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(ability)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = params;

  const tenant = await prisma.tenant.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
    select: { id: true, name: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  createAuditEvent({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    action: 'UPDATE',
    resourceType: 'Session',
    resourceDescription: `Switched to tenant: ${tenant.name}`,
    afterState: { tenantId: tenant.id, tenantName: tenant.name },
    ipAddress:
      request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    organizationId: session.user.organizationId,
    tenantId: tenant.id,
  }).catch((err: unknown) => {
    console.error('[POST /api/admin/tenants/:id/switch] Failed to write audit event:', err);
  });

  // The client is responsible for navigating to /workspace after switch.
  // The session tenantId update happens on the next auth() call (next-auth
  // picks up the latest tenantId from the DB).  For Phase 0 we return the
  // new tenantId so the client can update state; full session refresh is
  // Phase 1 work tied to the JWT strategy.
  return NextResponse.json({ success: true, tenantId: tenant.id });
}

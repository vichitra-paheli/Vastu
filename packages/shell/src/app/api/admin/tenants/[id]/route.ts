/**
 * PATCH /api/admin/tenants/[id] — update tenant name, status, region, or dbIsolationMode
 * DELETE /api/admin/tenants/[id] — soft-delete a tenant (sets deletedAt)
 *
 * Both endpoints are admin-only. The last active tenant cannot be deleted.
 *
 * MCP tool equivalents:
 *   update_tenant({ id, ...fields })
 *   archive_tenant({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '../../../../../lib/session';
import { isAdmin } from '@vastu/shared/permissions';

// ---------------------------------------------------------------------------
// PATCH /api/admin/tenants/[id]
// ---------------------------------------------------------------------------

interface UpdateTenantBody {
  name?: string;
  status?: 'ACTIVE' | 'SANDBOX';
  region?: string | null;
  dbIsolationMode?: string;
}

function isValidUpdateBody(body: unknown): body is UpdateTenantBody {
  if (typeof body !== 'object' || body === null) return false;
  return true;
}

export async function PATCH(
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

  // Verify tenant belongs to this org.
  const existing = await prisma.tenant.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  let body: UpdateTenantBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidUpdateBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: 'Tenant name cannot be empty' }, { status: 400 });
    }
    updateData.name = name;
  }

  if (body.status !== undefined) {
    if (body.status !== 'ACTIVE' && body.status !== 'SANDBOX') {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }
    updateData.status = body.status;
  }

  if (body.region !== undefined) {
    updateData.region = body.region;
  }

  if (body.dbIsolationMode !== undefined) {
    updateData.dbIsolationMode = body.dbIsolationMode;
  }

  try {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'Tenant',
      resourceId: tenant.id,
      resourceDescription: `Tenant updated: ${tenant.name}`,
      beforeState: {
        name: existing.name,
        status: existing.status,
        region: existing.region,
        dbIsolationMode: existing.dbIsolationMode,
      },
      afterState: {
        name: tenant.name,
        status: tenant.status,
        region: tenant.region,
        dbIsolationMode: tenant.dbIsolationMode,
      },
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[PATCH /api/admin/tenants/:id] Failed to write audit event:', err);
    });

    return NextResponse.json({ tenant });
  } catch (err) {
    console.error('[PATCH /api/admin/tenants/:id] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/tenants/[id] — soft-delete
// ---------------------------------------------------------------------------

export async function DELETE(
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

  // Verify tenant belongs to this org.
  const existing = await prisma.tenant.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Must keep at least one active tenant.
  const activeTenantCount = await prisma.tenant.count({
    where: {
      organizationId: session.user.organizationId,
      deletedAt: null,
      status: 'ACTIVE',
    },
  });

  if (activeTenantCount <= 1 && existing.status === 'ACTIVE') {
    return NextResponse.json(
      { error: 'Cannot archive the last active tenant' },
      { status: 422 },
    );
  }

  try {
    await prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'DELETE',
      resourceType: 'Tenant',
      resourceId: id,
      resourceDescription: `Tenant archived: ${existing.name}`,
      beforeState: { name: existing.name, status: existing.status },
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[DELETE /api/admin/tenants/:id] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/tenants/:id] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to archive tenant' }, { status: 500 });
  }
}

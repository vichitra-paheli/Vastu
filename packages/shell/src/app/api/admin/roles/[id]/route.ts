/**
 * PATCH /api/admin/roles/[id] — update a custom role's name, description, or permissions
 * DELETE /api/admin/roles/[id] — delete a custom role
 *
 * Both endpoints:
 * - Require an authenticated admin session.
 * - Refuse to mutate system roles (isSystem === true).
 *
 * PATCH body: { name?, description?, permissions? }
 * PATCH response:
 *   200 { role }
 *   400 { error }
 *   401 { error }
 *   403 { error }
 *   404 { error }
 *   409 { error }   (name conflict)
 *   500 { error }
 *
 * DELETE response:
 *   200 { success: true }
 *   401 { error }
 *   403 { error }
 *   404 { error }
 *   500 { error }
 *
 * MCP tool equivalents:
 *   update_role(id, { name, description, permissions })
 *   delete_role(id)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';

interface PermissionInput {
  resource: string;
  action: string;
  granted: boolean;
}

interface UpdateRoleBody {
  name?: string;
  description?: string | null;
  permissions?: PermissionInput[];
}

function isUpdateRoleBody(body: unknown): body is UpdateRoleBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;

  if ('name' in b) {
    if (typeof b.name !== 'string' || b.name.trim().length === 0) return false;
  }
  if ('description' in b && b.description !== undefined && b.description !== null) {
    if (typeof b.description !== 'string') return false;
  }
  if ('permissions' in b && b.permissions !== undefined) {
    if (!Array.isArray(b.permissions)) return false;
    for (const p of b.permissions as unknown[]) {
      if (typeof p !== 'object' || p === null) return false;
      const pObj = p as Record<string, unknown>;
      if (typeof pObj.resource !== 'string' || typeof pObj.action !== 'string') return false;
      if (typeof pObj.granted !== 'boolean') return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { id } = params;

  let session: Awaited<ReturnType<typeof requireSessionWithAbility>>['session'];
  let ability: Awaited<ReturnType<typeof requireSessionWithAbility>>['ability'];

  try {
    const result = await requireSessionWithAbility();
    session = result.session;
    ability = result.ability;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(ability)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch the role — must belong to the same org
  const existing = await prisma.role.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: { permissions: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  }
  if (existing.isSystem) {
    return NextResponse.json({ error: 'System roles cannot be modified.' }, { status: 403 });
  }

  let body: UpdateRoleBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isUpdateRoleBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const newName = body.name?.trim();

  // Name uniqueness check within the org (excluding the current role)
  if (newName && newName !== existing.name) {
    const conflict = await prisma.role.findFirst({
      where: {
        name: newName,
        organizationId: session.user.organizationId,
        id: { not: id },
      },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `A role named "${newName}" already exists.` },
        { status: 409 },
      );
    }
  }

  try {
    // Replace all permissions atomically when provided
    const role = await prisma.$transaction(async (tx) => {
      if (body.permissions !== undefined) {
        // Delete old permissions and recreate
        await tx.permission.deleteMany({ where: { roleId: id } });
        if (body.permissions.length > 0) {
          await tx.permission.createMany({
            data: body.permissions.map((p) => ({
              roleId: id,
              resource: p.resource,
              action: p.action,
              granted: p.granted,
            })),
          });
        }
      }

      return tx.role.update({
        where: { id },
        data: {
          ...(newName !== undefined && { name: newName }),
          ...('description' in body && { description: body.description }),
        },
        include: {
          permissions: true,
          _count: { select: { userRoles: true } },
        },
      });
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'Role',
      resourceId: id,
      resourceDescription: `Updated custom role "${role.name}"`,
      beforeState: {
        name: existing.name,
        description: existing.description,
        permissions: existing.permissions,
      },
      afterState: { name: role.name, description: role.description, permissions: role.permissions },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[admin/roles/[id]] Failed to write audit event:', err);
    });

    return NextResponse.json({ role: { ...role, userCount: role._count.userRoles } });
  } catch (err) {
    console.error('[admin/roles/[id]] PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to update role.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { id } = params;

  let session: Awaited<ReturnType<typeof requireSessionWithAbility>>['session'];
  let ability: Awaited<ReturnType<typeof requireSessionWithAbility>>['ability'];

  try {
    const result = await requireSessionWithAbility();
    session = result.session;
    ability = result.ability;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdmin(ability)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.role.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
  }
  if (existing.isSystem) {
    return NextResponse.json({ error: 'System roles cannot be deleted.' }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.permission.deleteMany({ where: { roleId: id } });
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'DELETE',
      resourceType: 'Role',
      resourceId: id,
      resourceDescription: `Deleted custom role "${existing.name}"`,
      beforeState: { name: existing.name, description: existing.description },
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[admin/roles/[id]] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/roles/[id]] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete role.' }, { status: 500 });
  }
}

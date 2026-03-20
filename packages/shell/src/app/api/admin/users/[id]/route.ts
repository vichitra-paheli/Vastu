/**
 * PATCH /api/admin/users/[id]  — update user (name, role, deactivation)
 * DELETE /api/admin/users/[id] — remove user from organization (soft-delete)
 *
 * Both endpoints require an authenticated admin session.
 *
 * PATCH body:
 *   { name?: string, roleId?: string, deactivated?: boolean }
 *
 * Returns:
 *   PATCH  200 { success: true, user: UserListItem }
 *   DELETE 200 { success: true }
 *   400/401/403/404/500 { error: string }
 *
 * MCP tool equivalent:
 *   PATCH  → update_user({ id, name, roleId, deactivated })
 *   DELETE → remove_user({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { isAdmin } from '@vastu/shared/permissions';
import { createAuditEvent } from '@vastu/shared/utils';
import { getSessionWithAbility } from '@/lib/session';

// ---------------------------------------------------------------------------
// Body type guard
// ---------------------------------------------------------------------------

interface PatchBody {
  name?: string;
  roleId?: string;
  deactivated?: boolean;
}

function isValidPatchBody(body: unknown): body is PatchBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    (b.name === undefined || typeof b.name === 'string') &&
    (b.roleId === undefined || typeof b.roleId === 'string') &&
    (b.deactivated === undefined || typeof b.deactivated === 'boolean')
  );
}

// ---------------------------------------------------------------------------
// Auth guard helper
// ---------------------------------------------------------------------------

async function requireAdmin(_request: NextRequest) {
  const { session, ability } = await getSessionWithAbility();
  if (!session || !ability) {
    return {
      session: null,
      ability: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!isAdmin(ability)) {
    return {
      session: null,
      ability: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, ability, error: null };
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { session, error } = await requireAdmin(request);
  if (error || !session) return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = params.id;

  // Load existing user
  const existing = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.user.organizationId },
    include: {
      userRoles: { include: { role: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  // Parse body
  let body: PatchBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidPatchBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Guard: cannot deactivate the last admin
  if (body.deactivated === true) {
    const isTargetAdmin = existing.userRoles.some(
      (ur) => ur.role.name.toLowerCase() === 'admin',
    );

    if (isTargetAdmin) {
      const adminCount = await prisma.user.count({
        where: {
          organizationId: session.user.organizationId,
          deletedAt: null,
          userRoles: {
            some: {
              role: { name: { equals: 'Admin', mode: 'insensitive' } },
            },
          },
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last admin user.' },
          { status: 400 },
        );
      }
    }
  }

  try {
    // Capture before-state for audit
    const beforeState = {
      name: existing.name,
      email: existing.email,
      deletedAt: existing.deletedAt,
      roles: existing.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
    };

    // Update name if provided
    const updateData: { name?: string; deletedAt?: Date | null } = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.deactivated === true) updateData.deletedAt = new Date();
    if (body.deactivated === false) updateData.deletedAt = null;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        userRoles: { include: { role: true } },
      },
    });

    // Update role if provided
    if (body.roleId !== undefined) {
      // Validate role exists in this org
      const newRole = await prisma.role.findFirst({
        where: { id: body.roleId, organizationId: session.user.organizationId },
        select: { id: true, name: true },
      });

      if (!newRole) {
        return NextResponse.json({ error: 'Role not found.' }, { status: 400 });
      }

      // Replace all role assignments with the new single role atomically
      await prisma.$transaction([
        prisma.userRole.deleteMany({ where: { userId } }),
        prisma.userRole.create({ data: { userId, roleId: newRole.id } }),
      ]);
    }

    // Re-fetch for response with updated roles
    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        deletedAt: true,
        createdAt: true,
        userRoles: { select: { role: { select: { id: true, name: true } } } },
      },
    });

    // Audit event
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: userId,
      resourceDescription: `User updated: ${existing.email}`,
      beforeState,
      afterState: {
        name: updated.name,
        email: updated.email,
        deletedAt: updated.deletedAt,
        roleId: body.roleId,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[admin/users PATCH] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true, user: finalUser });
  } catch (err) {
    console.error('[admin/users PATCH] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { session, error } = await requireAdmin(request);
  if (error || !session) return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = params.id;

  // Cannot remove yourself
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove your own account.' }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.user.organizationId, deletedAt: null },
    select: { id: true, email: true, name: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'DELETE',
      resourceType: 'User',
      resourceId: userId,
      resourceDescription: `User removed: ${existing.email}`,
      beforeState: { email: existing.email, name: existing.name },
      ipAddress:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[admin/users DELETE] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users DELETE] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to remove user.' }, { status: 500 });
  }
}

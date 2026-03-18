/**
 * GET  /api/admin/permissions  — fetch all roles + permission matrix for the org
 * PATCH /api/admin/permissions — bulk-update permissions for a custom role
 *
 * Both endpoints require an authenticated admin session.
 *
 * GET response:
 *   200 { roles: RoleMatrixEntry[], resources: string[] }
 *   401 { error: string }
 *   403 { error: string }
 *   500 { error: string }
 *
 * PATCH body: { roleId: string, permissions: { resource: string; action: string; granted: boolean }[] }
 * PATCH response:
 *   200 { updated: number }
 *   400 { error: string }
 *   401 { error: string }
 *   403 { error: string }
 *   409 { error: string }   (system role cannot be modified)
 *   500 { error: string }
 *
 * MCP tool equivalents:
 *   get_permission_matrix()
 *   update_role_permissions({ roleId, permissions })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';
import { resources } from '@vastu/shared/permissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PermissionEntry {
  resource: string;
  action: string;
  granted: boolean;
  conditions: Record<string, unknown> | null;
}

export interface RoleMatrixEntry {
  id: string;
  name: string;
  isSystem: boolean;
  userCount: number;
  permissions: PermissionEntry[];
}

interface PermissionUpdateItem {
  resource: string;
  action: string;
  granted: boolean;
}

interface PatchBody {
  roleId: string;
  permissions: PermissionUpdateItem[];
}

function isPatchBody(body: unknown): body is PatchBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.roleId !== 'string') return false;
  if (!Array.isArray(b.permissions)) return false;
  for (const p of b.permissions as unknown[]) {
    if (typeof p !== 'object' || p === null) return false;
    const pObj = p as Record<string, unknown>;
    if (typeof pObj.resource !== 'string') return false;
    if (typeof pObj.action !== 'string') return false;
    if (typeof pObj.granted !== 'boolean') return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dbRoles = await prisma.role.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        permissions: true,
        _count: { select: { userRoles: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    const roles: RoleMatrixEntry[] = dbRoles.map((r) => ({
      id: r.id,
      name: r.name,
      isSystem: r.isSystem,
      userCount: r._count.userRoles,
      permissions: r.permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
        granted: p.granted,
        conditions: p.conditions as Record<string, unknown> | null,
      })),
    }));

    // Expose all known resources (excluding 'all') for the matrix rows
    const resourceList = (resources as readonly string[]).filter((r) => r !== 'all');

    return NextResponse.json({ roles, resources: resourceList });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[admin/permissions] GET failed:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: PatchBody;
    try {
      const raw = (await request.json()) as unknown;
      if (!isPatchBody(raw)) {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
      }
      body = raw;
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    // Verify the role belongs to this org
    const role = await prisma.role.findFirst({
      where: { id: body.roleId, organizationId: session.user.organizationId },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json(
        { error: 'System role permissions cannot be modified.' },
        { status: 409 },
      );
    }

    // Upsert each permission in a transaction
    const ops = body.permissions.map((p) =>
      prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: body.roleId,
            resource: p.resource,
            action: p.action,
          },
        },
        update: { granted: p.granted },
        create: {
          roleId: body.roleId,
          resource: p.resource,
          action: p.action,
          granted: p.granted,
        },
      }),
    );

    await prisma.$transaction(ops);

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'Permission',
      resourceId: body.roleId,
      resourceDescription: `Updated permissions for role "${role.name}"`,
      afterState: { roleId: body.roleId, changes: body.permissions.length },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[admin/permissions] Failed to write audit event:', err);
    });

    return NextResponse.json({ updated: body.permissions.length });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[admin/permissions] PATCH failed:', error);
    return NextResponse.json({ error: 'Failed to update permissions.' }, { status: 500 });
  }
}

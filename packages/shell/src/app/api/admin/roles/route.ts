/**
 * GET  /api/admin/roles  — list all roles for the organisation with user counts
 * POST /api/admin/roles  — create a new custom role
 *
 * Both endpoints require an authenticated admin session.
 *
 * GET response:
 *   200 { roles: RoleWithCount[] }
 *   401 { error: string }
 *   403 { error: string }
 *   500 { error: string }
 *
 * POST body: { name, description?, baseRoleId?, permissions? }
 * POST response:
 *   201 { role: RoleWithCount }
 *   400 { error: string }
 *   401 { error: string }
 *   403 { error: string }
 *   409 { error: string }   (name already exists in the org)
 *   500 { error: string }
 *
 * MCP tool equivalents:
 *   list_roles()
 *   create_role({ name, description, baseRoleId, permissions })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface PermissionInput {
  resource: string;
  action: string;
  granted: boolean;
}

interface CreateRoleBody {
  name: string;
  description?: string;
  baseRoleId?: string;
  permissions?: PermissionInput[];
}

function isCreateRoleBody(body: unknown): body is CreateRoleBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string' || b.name.trim().length === 0) return false;
  if ('description' in b && b.description !== undefined && typeof b.description !== 'string') {
    return false;
  }
  if ('baseRoleId' in b && b.baseRoleId !== undefined && typeof b.baseRoleId !== 'string') {
    return false;
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
// GET
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
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

  try {
    const roles = await prisma.role.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        permissions: true,
        _count: { select: { userRoles: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    const mapped = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      baseRoleId: r.baseRoleId,
      organizationId: r.organizationId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      permissions: r.permissions,
      userCount: r._count.userRoles,
    }));

    return NextResponse.json({ roles: mapped });
  } catch (err) {
    console.error('[admin/roles] GET failed:', err);
    return NextResponse.json({ error: 'Failed to fetch roles.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  let body: CreateRoleBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isCreateRoleBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const name = body.name.trim();

  // Unique name check within the org
  const existing = await prisma.role.findUnique({
    where: { name_organizationId: { name, organizationId: session.user.organizationId } },
  });
  if (existing) {
    return NextResponse.json({ error: `A role named "${name}" already exists.` }, { status: 409 });
  }

  try {
    const role = await prisma.role.create({
      data: {
        name,
        description: body.description ?? null,
        isSystem: false,
        baseRoleId: body.baseRoleId ?? null,
        organizationId: session.user.organizationId,
        permissions: body.permissions
          ? {
              create: body.permissions.map((p) => ({
                resource: p.resource,
                action: p.action,
                granted: p.granted,
              })),
            }
          : undefined,
      },
      include: {
        permissions: true,
        _count: { select: { userRoles: true } },
      },
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'CREATE',
      resourceType: 'Role',
      resourceId: role.id,
      resourceDescription: `Created custom role "${name}"`,
      afterState: { name, description: body.description, baseRoleId: body.baseRoleId },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[admin/roles] Failed to write audit event:', err);
    });

    return NextResponse.json(
      {
        role: {
          ...role,
          userCount: role._count.userRoles,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[admin/roles] POST failed:', err);
    return NextResponse.json({ error: 'Failed to create role.' }, { status: 500 });
  }
}

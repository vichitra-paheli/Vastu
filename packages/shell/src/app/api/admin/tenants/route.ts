/**
 * GET  /api/admin/tenants  — list all non-deleted tenants for the session org
 * POST /api/admin/tenants  — create a new tenant
 *
 * Both endpoints are admin-only: a 403 is returned for non-admin callers.
 *
 * MCP tool equivalents:
 *   list_tenants()
 *   create_tenant({ name, subdomain, region, dbIsolationMode })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';

// ---------------------------------------------------------------------------
// GET /api/admin/tenants
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
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

  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ tenants });
  } catch (err) {
    console.error('[GET /api/admin/tenants] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/tenants
// ---------------------------------------------------------------------------

interface CreateTenantBody {
  name: string;
  subdomain: string;
  region?: string;
  dbIsolationMode?: string;
}

function isValidCreateBody(body: unknown): body is CreateTenantBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.name === 'string' && typeof b.subdomain === 'string';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  let body: CreateTenantBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidCreateBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = body.name.trim();
  const subdomain = body.subdomain.trim().toLowerCase();
  const region = body.region?.trim() ?? null;
  const dbIsolationMode = body.dbIsolationMode?.trim() ?? 'shared_schema';

  if (!name) {
    return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 });
  }
  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 });
  }
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { error: 'Subdomain may only contain lowercase letters, numbers, and hyphens' },
      { status: 400 },
    );
  }

  // Check subdomain uniqueness.
  const existing = await prisma.tenant.findFirst({
    where: { subdomain, deletedAt: null },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A tenant with this subdomain already exists' },
      { status: 409 },
    );
  }

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        subdomain,
        region,
        dbIsolationMode,
        organizationId: session.user.organizationId,
      },
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'CREATE',
      resourceType: 'Tenant',
      resourceId: tenant.id,
      resourceDescription: `Tenant created: ${tenant.name}`,
      afterState: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        region: tenant.region,
        dbIsolationMode: tenant.dbIsolationMode,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[POST /api/admin/tenants] Failed to write audit event:', err);
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/tenants] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}

/**
 * GET  /api/admin/users  — list users (search + filters)
 * POST /api/admin/users  — invite user(s)
 *
 * Both endpoints require an authenticated admin session.
 *
 * GET query params:
 *   search  — partial match on name or email
 *   role    — filter by role name (case-insensitive)
 *   status  — "active" | "pending" | "deactivated"
 *
 * POST body:
 *   { emails: string[], roleId: string, message?: string }
 *
 * Returns:
 *   GET  200 { users: UserListItem[] }
 *   POST 201 { success: true, invitedCount: number }
 *   400/401/403/500 { error: string }
 *
 * MCP tool equivalent:
 *   GET  → list_users({ search, role, status })
 *   POST → invite_users({ emails, roleId, message })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { isAdmin } from '@vastu/shared/permissions';
import { isValidEmail, createAuditEvent } from '@vastu/shared/utils';
import { getSessionWithAbility } from '../../../../lib/session';
import type { UserListItem } from '../../../../components/admin/types';

export type { UserListItem };

interface InviteBody {
  emails: string[];
  roleId: string;
  message?: string;
}

function isValidInviteBody(body: unknown): body is InviteBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    Array.isArray(b.emails) &&
    b.emails.every((e) => typeof e === 'string') &&
    typeof b.roleId === 'string' &&
    (b.message === undefined || typeof b.message === 'string')
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
// GET /api/admin/users
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { session, error } = await requireAdmin(request);
  if (error || !session) return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const roleFilter = url.searchParams.get('role')?.trim() ?? '';
  const statusFilter = url.searchParams.get('status')?.trim() ?? '';

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma where type is complex
  const where: any = {
    organizationId: session.user.organizationId,
    // Soft-deleted users should not appear in the list
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (roleFilter) {
    where.userRoles = {
      some: {
        role: { name: { equals: roleFilter, mode: 'insensitive' } },
      },
    };
  }

  // Status filter: "pending" → emailVerified=false, "deactivated" → deletedAt≠null (re-include soft-deleted)
  if (statusFilter === 'pending') {
    where.emailVerified = false;
    // Pending users are NOT deleted — keep deletedAt: null
  } else if (statusFilter === 'deactivated') {
    // Deactivated = soft-deleted; override the deletedAt: null filter
    where.deletedAt = { not: null };
  } else if (statusFilter === 'active') {
    where.emailVerified = true;
    // deletedAt: null is already set
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        deletedAt: true,
        createdAt: true,
        userRoles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: UserListItem[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      emailVerified: u.emailVerified,
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
      roles: u.userRoles.map((ur) => ur.role),
    }));

    return NextResponse.json({ users: result });
  } catch (err) {
    console.error('[admin/users GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load users.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/users — invite
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { session, error } = await requireAdmin(request);
  if (error || !session) return error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: InviteBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidInviteBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate emails
  const emails = body.emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (emails.length === 0) {
    return NextResponse.json(
      { error: 'At least one email address is required.' },
      { status: 400 },
    );
  }

  const invalidEmails = emails.filter((e) => !isValidEmail(e));
  if (invalidEmails.length > 0) {
    return NextResponse.json(
      { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate role exists within the org
  const role = await prisma.role.findFirst({
    where: { id: body.roleId, organizationId: session.user.organizationId },
    select: { id: true, name: true },
  });

  if (!role) {
    return NextResponse.json({ error: 'Role not found.' }, { status: 400 });
  }

  try {
    let invitedCount = 0;

    for (const email of emails) {
      // Check if user already exists in this org
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, organizationId: true },
      });

      if (existing && existing.organizationId === session.user.organizationId) {
        // Already a member — skip silently
        continue;
      }

      // Create the user record (unverified = pending)
      const newUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0] ?? email, // Placeholder name until user completes profile
          emailVerified: false,
          organizationId: session.user.organizationId,
        },
      });

      // Assign role
      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleId: role.id,
        },
      });

      invitedCount++;

      // Audit event per invited user
      createAuditEvent({
        userId: session.user.id,
        userName: session.user.name ?? undefined,
        action: 'CREATE',
        resourceType: 'User',
        resourceId: newUser.id,
        resourceDescription: `User invited: ${email}`,
        afterState: { email, roleId: role.id, roleName: role.name },
        ipAddress:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        organizationId: session.user.organizationId,
      }).catch((err: unknown) => {
        console.error('[admin/users POST] Failed to write audit event:', err);
      });
    }

    return NextResponse.json({ success: true, invitedCount }, { status: 201 });
  } catch (err) {
    console.error('[admin/users POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to send invitations.' }, { status: 500 });
  }
}

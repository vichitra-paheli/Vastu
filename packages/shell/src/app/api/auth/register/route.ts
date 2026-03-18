/**
 * POST /api/auth/register
 *
 * Creates a new user, organization, and default tenant in the database.
 * Assigns the "Admin" role to the first user in the organization.
 *
 * All database operations are wrapped in a transaction so partial failures
 * leave no orphaned records.
 *
 * Returns:
 *   201 { success: true, userId, organizationId }  on success
 *   400 { error: string }                          on validation failure
 *   409 { error: string }                          on duplicate email
 *   500 { error: string }                          on unexpected failure
 *
 * MCP tool equivalent: register_user({ name, orgName, email, password })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { isValidEmail, createAuditEvent } from '@vastu/shared/utils';

interface RegisterRequestBody {
  name: string;
  orgName: string;
  email: string;
  password: string;
}

function isValidRegisterBody(body: unknown): body is RegisterRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    typeof b.orgName === 'string' &&
    typeof b.email === 'string' &&
    typeof b.password === 'string'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: RegisterRequestBody;

  try {
    const raw = (await request.json()) as unknown;
    if (!isValidRegisterBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = body.name.trim();
  const orgName = body.orgName.trim();
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  // Server-side validation.
  if (!name) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  }
  if (!orgName) {
    return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid work email is required' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 },
    );
  }

  // Check for duplicate email.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email address already exists.' },
      { status: 409 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create organization.
      const organization = await tx.organization.create({
        data: { name: orgName },
      });

      // 2. Create default tenant for the organization.
      const subdomain = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);

      // Ensure subdomain uniqueness by appending a short random suffix when needed.
      const tenantSubdomain = `${subdomain}-${Math.random().toString(36).substring(2, 7)}`;

      const tenant = await tx.tenant.create({
        data: {
          name: orgName,
          subdomain: tenantSubdomain,
          organizationId: organization.id,
        },
      });

      // 3. Create user (no password stored in DB — auth is via Keycloak).
      const user = await tx.user.create({
        data: {
          name,
          email,
          organizationId: organization.id,
        },
      });

      // 4. Create the "Admin" system role for this organization.
      const adminRole = await tx.role.create({
        data: {
          name: 'Admin',
          description: 'Full administrative access to the organization',
          isSystem: true,
          organizationId: organization.id,
        },
      });

      // 5. Assign the Admin role to the user within the default tenant.
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
          tenantId: tenant.id,
        },
      });

      return { user, organization, tenant };
    });

    // 6. Write audit event (outside transaction — best effort, non-blocking).
    createAuditEvent({
      userId: result.user.id,
      userName: result.user.name,
      action: 'CREATE',
      resourceType: 'User',
      resourceId: result.user.id,
      resourceDescription: `New user registered: ${result.user.email}`,
      afterState: {
        userId: result.user.id,
        email: result.user.email,
        organizationId: result.organization.id,
        tenantId: result.tenant.id,
      },
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: result.organization.id,
    }).catch((err: unknown) => {
      console.error('[register] Failed to write audit event:', err);
    });

    return NextResponse.json(
      {
        success: true,
        userId: result.user.id,
        organizationId: result.organization.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[register] Unexpected error during registration:', err);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }
}

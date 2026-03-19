/**
 * POST /api/auth/register
 *
 * Creates a new user, organization, and default tenant.
 * Assigns the "Admin" role to the first user in the organization.
 *
 * Flow:
 *   1. Validate the request body (name, email, password, orgName).
 *   2. Check for duplicate email in the DB (fast early rejection).
 *   3. Create the Keycloak user with the provided password.
 *      - If Keycloak creation fails, return an error immediately.
 *        No DB records are created.
 *   4. Create DB records (user, organization, tenant, role, userRole)
 *      in a single Prisma transaction.
 *      - If the transaction fails, attempt to delete the Keycloak user
 *        as a compensating action so no orphan accounts are left in Keycloak.
 *   5. Write an audit event (best-effort, non-blocking).
 *
 * Returns:
 *   201 { success: true, userId, organizationId }  on success
 *   400 { error: string }                          on validation failure
 *   409 { error: string }                          on duplicate email
 *   502 { error: string }                          on Keycloak communication error
 *   500 { error: string }                          on unexpected failure
 *
 * MCP tool equivalent: register_user({ name, orgName, email, password })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { isValidEmail, createAuditEvent } from '@vastu/shared/utils';
import { createKeycloakUser, deleteKeycloakUser, KeycloakAdminError } from '@/lib/keycloak-admin';

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

  // Check for duplicate email before touching Keycloak.
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

  // Step 1: Create the Keycloak user first.
  // If this fails, no DB records are created — no orphan state.
  let keycloakUserId: string;
  try {
    keycloakUserId = await createKeycloakUser({ email, name, password });
  } catch (err) {
    if (err instanceof KeycloakAdminError) {
      if (err.status === 409) {
        // Keycloak already has this email — treat as duplicate.
        return NextResponse.json(
          { error: 'An account with this email address already exists.' },
          { status: 409 },
        );
      }
      console.error('[register] Keycloak user creation failed:', err);
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 502 },
      );
    }
    console.error('[register] Unexpected error creating Keycloak user:', err);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }

  // Step 2: Create DB records in a transaction.
  // If this fails, delete the Keycloak user to avoid orphan accounts.
  let result: { user: { id: string; name: string; email: string }; organization: { id: string }; tenant: { id: string } };

  try {
    result = await prisma.$transaction(async (tx) => {
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

      // Ensure subdomain uniqueness by appending a short random suffix.
      const tenantSubdomain = `${subdomain}-${Math.random().toString(36).substring(2, 7)}`;

      const tenant = await tx.tenant.create({
        data: {
          name: orgName,
          subdomain: tenantSubdomain,
          organizationId: organization.id,
        },
      });

      // 3. Create user record. Auth is handled by Keycloak; we store the
      //    Keycloak user ID in an Account record so next-auth can link the
      //    OAuth session to this DB user on first sign-in.
      const user = await tx.user.create({
        data: {
          name,
          email,
          organizationId: organization.id,
        },
      });

      // 4. Link the Keycloak identity to the user via an Account record.
      //    This is the record that next-auth / PrismaAdapter looks up when
      //    the user authenticates via Keycloak OIDC.
      await tx.account.create({
        data: {
          userId: user.id,
          type: 'oidc',
          provider: 'keycloak',
          providerAccountId: keycloakUserId,
        },
      });

      // 5. Create the "Admin" system role for this organization.
      const adminRole = await tx.role.create({
        data: {
          name: 'Admin',
          description: 'Full administrative access to the organization',
          isSystem: true,
          organizationId: organization.id,
        },
      });

      // 6. Assign the Admin role to the user within the default tenant.
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
          tenantId: tenant.id,
        },
      });

      return { user, organization, tenant };
    });
  } catch (err) {
    // DB transaction failed after Keycloak user was created.
    // Attempt to clean up the Keycloak user so no orphan account is left.
    // deleteKeycloakUser swallows its own errors, but we guard here too so
    // that a cleanup failure never masks the original error response.
    console.error('[register] DB transaction failed after Keycloak user created. Attempting cleanup:', err);
    await deleteKeycloakUser(keycloakUserId).catch((cleanupErr: unknown) => {
      console.error('[register] Keycloak cleanup also failed:', cleanupErr);
    });

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 },
    );
  }

  // Step 3: Write audit event (outside transaction — best effort, non-blocking).
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
      keycloakUserId,
    },
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    organizationId: result.organization.id,
  }).catch((auditErr: unknown) => {
    console.error('[register] Failed to write audit event:', auditErr);
  });

  return NextResponse.json(
    {
      success: true,
      userId: result.user.id,
      organizationId: result.organization.id,
    },
    { status: 201 },
  );
}

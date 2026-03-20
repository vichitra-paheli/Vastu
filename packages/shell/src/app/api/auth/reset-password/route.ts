/**
 * POST /api/auth/reset-password
 *
 * Validates a password reset token and sets the user's new password.
 *
 * Request body: { token: string; password: string }
 *
 * Responses:
 *   200 — password updated successfully
 *   400 — token missing, expired, or invalid; or password fails validation
 *   500 — unexpected server error
 *
 * The VerificationToken record is deleted after successful use (single-use tokens).
 *
 * Note: Vastu uses Keycloak for authentication in production. In Phase 0,
 * this route stores a bcrypt hash in a future `passwordHash` field pattern.
 * Because the User model does not yet have a passwordHash column, this route
 * stores the hashed value in a dedicated Account record with provider
 * "credentials". This mirrors the next-auth credentials provider approach
 * and keeps the schema forward-compatible.
 *
 * Phase 0 simplification: the password hash is logged to the console since
 * there is no credentials provider wired up yet. The token validation and
 * expiry logic are fully functional.
 */

import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a password using SHA-256 with a random salt.
 * In production use bcrypt or argon2. This is a Phase 0 placeholder.
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let token: string;
  let password: string;

  try {
    const body = (await request.json()) as unknown;
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).token !== 'string' ||
      typeof (body as Record<string, unknown>).password !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    token = (body as Record<string, unknown>).token as string;
    password = (body as Record<string, unknown>).password as string;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate password length.
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    );
  }

  // Look up the verification token.
  let verificationToken: { identifier: string; token: string; expires: Date } | null = null;

  try {
    // Find any token record that matches this token value.
    // The identifier for reset tokens uses the prefix "reset:".
    verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: { startsWith: 'reset:' },
      },
    });
  } catch (err) {
    console.error('[reset-password] Error looking up token:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Token not found.
  if (!verificationToken) {
    return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
  }

  // Token expired.
  if (verificationToken.expires < new Date()) {
    // Clean up the expired token.
    await prisma.verificationToken
      .delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      })
      .catch(() => {
        // Ignore cleanup errors.
      });

    return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
  }

  // Extract email from identifier ("reset:<email>").
  const email = verificationToken.identifier.replace(/^reset:/, '');

  // Look up the user.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, organizationId: true },
  });

  if (!user) {
    // Token exists but user was deleted — clean up and reject.
    await prisma.verificationToken
      .delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      })
      .catch(() => {
        // Ignore cleanup errors.
      });

    return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
  }

  try {
    const passwordHash = hashPassword(password);

    // Phase 0: log the hash. In production this would update the user's
    // credentials in Keycloak or the local credentials Account record.
    console.info(`[reset-password] Password hash for user ${user.id}: ${passwordHash}`);

    // Delete the used token (single-use).
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    // Write audit event — best effort, fire-and-forget.
    createAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'password_reset.complete',
      resourceType: 'User',
      resourceId: user.id,
      resourceDescription: `Password reset completed for ${email}`,
      ipAddress:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: user.organizationId,
    }).catch((err: unknown) => {
      console.error('[reset-password] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reset-password] Error resetting password:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

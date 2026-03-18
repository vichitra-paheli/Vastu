/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email address and creates a password reset token in the database.
 * Always returns 200 with a success body regardless of whether the email exists
 * to prevent email enumeration attacks.
 *
 * The reset token is stored in the VerificationToken table with the email as
 * the identifier and expires after 1 hour.
 *
 * In production this route would send an email via a transactional email
 * provider. In Phase 0 the token is logged to the server console.
 */

import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';

const TOKEN_EXPIRY_HOURS = 1;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let email: string;

  try {
    const body = (await request.json()) as unknown;
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).email !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    email = ((body as Record<string, unknown>).email as string).trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate email format.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
    // Still return success to prevent enumeration.
    return NextResponse.json({ success: true });
  }

  try {
    // Check whether the user exists — but do not reveal the result to the caller.
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, organizationId: true },
    });

    if (user) {
      // Delete any existing reset tokens for this identifier.
      await prisma.verificationToken.deleteMany({
        where: { identifier: `reset:${email}` },
      });

      // Generate a cryptographically secure random token.
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          identifier: `reset:${email}`,
          token,
          expires,
        },
      });

      // Phase 0: log the reset link to the console.
      // Production: send via transactional email provider.
      const resetUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`;
      console.info(`[forgot-password] Reset link for ${email}: ${resetUrl}`);

      // Write audit event — best effort, fire-and-forget.
      createAuditEvent({
        userId: user.id,
        userName: user.name,
        action: 'password_reset.request',
        resourceType: 'User',
        resourceId: user.id,
        resourceDescription: `Password reset requested for ${user.email}`,
        ipAddress:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        organizationId: user.organizationId,
      }).catch((err: unknown) => {
        console.error('[forgot-password] Failed to write audit event:', err);
      });
    }
  } catch (err) {
    // Log but do not leak error details to the client.
    console.error('[forgot-password] Error generating reset token:', err);
  }

  // Always return success to prevent email enumeration.
  return NextResponse.json({ success: true });
}

/**
 * GET /api/auth/verify-email?token=<token>&email=<email>
 *
 * Handles email verification link clicks.
 * - Validates the token from the VerificationToken table (next-auth compatible).
 * - Marks the user's emailVerified flag as true.
 * - Deletes the used token.
 * - Redirects the user to /login with a ?verified=true query param on success.
 * - Redirects to /verify-email?error=<reason> on failure.
 *
 * MCP tool equivalent (Phase 4): `verifyEmail({ token, email })`
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Both params are required.
  if (!token || !email) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
  }

  try {
    // Look up the verification token. next-auth stores identifier as the email.
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
    }

    // Check expiry.
    if (verificationToken.expires < new Date()) {
      // Clean up the expired token.
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token,
          },
        },
      });
      return NextResponse.redirect(
        new URL(`/verify-email?error=expired&email=${encodeURIComponent(email)}`, request.url),
      );
    }

    // Find the user by email.
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
    }

    // Mark email as verified.
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Delete the used token.
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    // Write audit event — fire-and-forget so a logging failure does not block
    // the verification redirect (consistent with all other routes).
    createAuditEvent({
      userId: user.id,
      userName: user.name,
      action: 'email_verified',
      resourceType: 'user',
      resourceId: user.id,
      resourceDescription: `Email verified for ${user.email}`,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: user.organizationId,
    }).catch((err) => console.error('[verify-email] Failed to write audit event:', err));

    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('[verify-email] Unexpected error:', error);
    return NextResponse.redirect(new URL('/verify-email?error=server', request.url));
  }
}

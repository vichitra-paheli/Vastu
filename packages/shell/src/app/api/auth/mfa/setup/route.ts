/**
 * POST /api/auth/mfa/setup
 *
 * Generates a TOTP secret for the authenticated user, stores it (unverified)
 * on the user record, and returns a QR code data URL plus the raw secret for
 * manual entry.
 *
 * The secret is stored but MFA is NOT enabled until the user verifies via
 * POST /api/auth/mfa/verify.
 *
 * Returns:
 *   200 { qrCodeDataUrl: string, secret: string }  on success
 *   401 { error: string }                           when not authenticated
 *   500 { error: string }                           on unexpected failure
 *
 * MCP tool equivalent: mfa_setup_generate() → { qrCode, secret }
 */

import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '@vastu/shared/prisma';
import { auth } from '@/lib/auth';
import { createAuditEvent } from '@vastu/shared/utils';
import { QR_COLORS } from '@/theme/constants';

export async function POST(): Promise<NextResponse> {
  // Require an authenticated session.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Generate a new TOTP secret.
    const secret = authenticator.generateSecret();

    // Build the otpauth URI for the QR code.
    // Format: otpauth://totp/{issuer}:{accountName}?secret={secret}&issuer={issuer}
    const issuer = 'Vastu';
    const accountName = session.user.email ?? userId;
    const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);

    // Generate QR code as a data URL (PNG embedded in base64).
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 200,
      margin: 2,
      color: QR_COLORS,
    });

    // Store the secret on the user record (mfaEnabled stays false until verified).
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    // Write audit event — MFA setup initiated.
    createAuditEvent({
      userId,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: userId,
      resourceDescription: 'MFA setup initiated',
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[mfa/setup] Failed to write audit event:', err);
    });

    return NextResponse.json({ qrCodeDataUrl, secret });
  } catch (err) {
    console.error('[mfa/setup] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to generate MFA setup. Please try again.' }, { status: 500 });
  }
}

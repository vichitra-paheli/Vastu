/**
 * POST /api/auth/mfa/recovery
 *
 * Validates a recovery code for a user who cannot access their authenticator app.
 * On success, the used recovery code is invalidated (one-time use).
 *
 * The recovery codes are stored as SHA-256 hashes encoded after the TOTP secret
 * in the mfaSecret field using the format:
 *   "<TOTP_SECRET>||RC:<hash1>,<hash2>,...,<hashN>"
 *
 * Returns:
 *   200 { success: true }   on valid recovery code
 *   400 { error: string }   on invalid/missing code
 *   401 { error: string }   when not authenticated or code is wrong
 *   500 { error: string }   on unexpected failure
 *
 * MCP tool equivalent: mfa_recovery({ code }) → { success }
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { auth } from '../../../../../lib/auth';
import { hashApiKey, createAuditEvent } from '@vastu/shared/utils';

interface RecoveryRequestBody {
  code: string;
}

function isValidRecoveryBody(body: unknown): body is RecoveryRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.code === 'string';
}

/**
 * Parse stored mfaSecret field to extract TOTP secret and hashed recovery codes.
 * Returns null if the format is invalid or MFA was never fully set up.
 */
function parseMfaSecret(mfaSecret: string): { totpSecret: string; hashedCodes: string[] } | null {
  const separator = '||RC:';
  const sepIndex = mfaSecret.indexOf(separator);
  if (sepIndex === -1) return null;

  const totpSecret = mfaSecret.slice(0, sepIndex);
  const codesStr = mfaSecret.slice(sepIndex + separator.length);
  const hashedCodes = codesStr.split(',').filter(Boolean);

  if (hashedCodes.length === 0) return null;
  return { totpSecret, hashedCodes };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Require an authenticated session.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: RecoveryRequestBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidRecoveryBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Normalise: strip spaces, uppercase. Codes are stored as "XXXX-XXXX".
  const code = body.code.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Recovery code is required' }, { status: 400 });
  }

  // Load user.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true, mfaSecret: true },
  });

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: 'MFA is not enabled for this account' }, { status: 400 });
  }

  const parsed = parseMfaSecret(user.mfaSecret);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid MFA configuration' }, { status: 500 });
  }

  const { totpSecret, hashedCodes } = parsed;

  // Hash the submitted code and check if it matches any stored hash.
  const submittedHash = hashApiKey(code);
  const matchIndex = hashedCodes.indexOf(submittedHash);

  if (matchIndex === -1) {
    return NextResponse.json({ error: 'Invalid recovery code' }, { status: 401 });
  }

  // Invalidate the used recovery code by removing it from the list.
  const remainingCodes = hashedCodes.filter((_, i) => i !== matchIndex);
  const updatedSecret = `${totpSecret}||RC:${remainingCodes.join(',')}`;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: updatedSecret },
    });

    // Write audit event.
    createAuditEvent({
      userId,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: userId,
      resourceDescription: 'MFA recovery code used',
      afterState: { remainingRecoveryCodes: remainingCodes.length },
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[mfa/recovery] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[mfa/recovery] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to process recovery code. Please try again.' }, { status: 500 });
  }
}

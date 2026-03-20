/**
 * POST /api/auth/mfa/recovery
 *
 * Validates a recovery code for a user who cannot access their authenticator app.
 * On success, the used recovery code is invalidated (one-time use).
 *
 * Recovery codes are stored as a JSON array of SHA-256 hashes in the
 * mfaRecoveryCodes column. The mfaSecret column holds only the pure TOTP
 * secret with no appended data.
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
import { auth } from '@/lib/auth';
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
 * Parse the mfaRecoveryCodes column value (a JSON array of hashed codes).
 * Returns null if the value is absent or cannot be parsed.
 */
function parseHashedCodes(mfaRecoveryCodes: string | null): string[] | null {
  if (!mfaRecoveryCodes) return null;
  try {
    const parsed: unknown = JSON.parse(mfaRecoveryCodes);
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((v) => typeof v === 'string')) return null;
    return parsed as string[];
  } catch {
    return null;
  }
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
    select: { mfaEnabled: true, mfaSecret: true, mfaRecoveryCodes: true },
  });

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: 'MFA is not enabled for this account' }, { status: 400 });
  }

  const hashedCodes = parseHashedCodes(user.mfaRecoveryCodes);
  if (!hashedCodes || hashedCodes.length === 0) {
    return NextResponse.json({ error: 'Invalid MFA configuration' }, { status: 500 });
  }

  // Hash the submitted code and check if it matches any stored hash.
  const submittedHash = hashApiKey(code);
  const matchIndex = hashedCodes.indexOf(submittedHash);

  if (matchIndex === -1) {
    return NextResponse.json({ error: 'Invalid recovery code' }, { status: 401 });
  }

  // Invalidate the used recovery code by removing it from the list.
  const remainingCodes = hashedCodes.filter((_, i) => i !== matchIndex);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodes: JSON.stringify(remainingCodes) },
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

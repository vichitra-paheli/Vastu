/**
 * POST /api/auth/mfa/verify
 *
 * Verifies the 6-digit TOTP code the user entered after scanning the QR code.
 * On success:
 *   - Sets mfaEnabled = true on the user record
 *   - Generates 6 recovery codes and stores their hashed values
 *   - Returns the plaintext recovery codes (shown once only)
 *
 * Recovery codes are 8-character hex strings generated via generateToken(4)
 * (4 random bytes = 8 hex chars). They are returned formatted as "XXXX-XXXX"
 * for readability.
 *
 * Returns:
 *   200 { recoveryCodes: string[] }  on success
 *   400 { error: string }            on invalid/missing code
 *   401 { error: string }            when not authenticated
 *   409 { error: string }            when MFA is already enabled
 *   500 { error: string }            on unexpected failure
 *
 * MCP tool equivalent: mfa_verify({ code }) → { recoveryCodes }
 */

import { type NextRequest, NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { prisma } from '@vastu/shared/prisma';
import { auth } from '../../../../../lib/auth';
import { generateToken, hashApiKey, createAuditEvent } from '@vastu/shared/utils';

const RECOVERY_CODE_COUNT = 6;

function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    // generateToken(4) = 4 random bytes = 8 hex chars. Format as XXXX-XXXX.
    const raw = generateToken(4);
    const formatted = `${raw.slice(0, 4).toUpperCase()}-${raw.slice(4, 8).toUpperCase()}`;
    plain.push(formatted);
    hashed.push(hashApiKey(formatted));
  }

  return { plain, hashed };
}

interface VerifyRequestBody {
  code: string;
}

function isValidVerifyBody(body: unknown): body is VerifyRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.code === 'string';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Require an authenticated session.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let body: VerifyRequestBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidVerifyBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const code = body.code.replace(/\D/g, '');
  if (code.length !== 6) {
    return NextResponse.json({ error: 'A 6-digit verification code is required' }, { status: 400 });
  }

  // Load the user to get their pending MFA secret.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  if (user.mfaEnabled) {
    return NextResponse.json({ error: 'MFA is already enabled for this account' }, { status: 409 });
  }

  if (!user.mfaSecret) {
    return NextResponse.json(
      { error: 'No MFA setup in progress. Please start MFA setup first.' },
      { status: 400 },
    );
  }

  // Verify the TOTP code against the stored secret.
  const isValid = authenticator.verify({ token: code, secret: user.mfaSecret });
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
  }

  // Generate recovery codes.
  const { plain: recoveryCodes, hashed: hashedCodes } = generateRecoveryCodes();

  try {
    // Enable MFA and store hashed recovery codes.
    // Recovery codes are stored as a JSON array in a dedicated field.
    // The schema stores mfaEnabled and mfaSecret already — recovery codes
    // are stored in a JSON field we add to the update call via Prisma's
    // flexible data object (the field exists in the DB via the schema's
    // `mfaSecret` column being used for the secret).
    //
    // Note: The Prisma schema doesn't have a dedicated recovery codes column.
    // We use a separate approach: store the hashed codes as a JSON-encoded
    // string in a field named `mfaRecoveryCodes`. Since this field doesn't
    // exist in the current schema, we store them serialised into mfaSecret
    // using a structured format, or — better — we accept the schema as-is
    // and store recovery codes in the AuditEvent payload for now while
    // updating the user record to enable MFA.
    //
    // SCHEMA NOTE: The current schema (schema.prisma) only has mfaEnabled
    // and mfaSecret on User. Recovery codes need a new column. For Phase 0
    // we store the hashed codes as a JSON string in a convention-based way.
    // The `mfaSecret` field stores the TOTP secret. Recovery codes need
    // their own storage — we'll encode them alongside the secret using a
    // separator that otplib will never produce, so we can parse them back.
    // Format: "<TOTP_SECRET>||RC:<hash1>,<hash2>,...,<hashN>"

    const encodedSecret = `${user.mfaSecret}||RC:${hashedCodes.join(',')}`;

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: encodedSecret,
      },
    });

    // Write audit event.
    createAuditEvent({
      userId,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: userId,
      resourceDescription: 'MFA enabled',
      afterState: { mfaEnabled: true },
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[mfa/verify] Failed to write audit event:', err);
    });

    return NextResponse.json({ recoveryCodes });
  } catch (err) {
    console.error('[mfa/verify] Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to enable MFA. Please try again.' }, { status: 500 });
  }
}

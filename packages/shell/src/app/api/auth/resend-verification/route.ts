/**
 * POST /api/auth/resend-verification
 *
 * Rate-limited resend of the email verification link.
 * Body: { email: string }
 *
 * Rate limit: maximum 3 resend requests per email per 10 minutes.
 * Rate limit state is stored in a module-level Map (process memory).
 * This is suitable for Phase 0 single-instance deployments.
 * Phase N upgrade path: replace with Redis-backed rate limiting.
 *
 * Responses:
 *   200 — resend queued (always, even if email not found, to prevent enumeration)
 *   400 — request body missing or invalid
 *   429 — rate limit exceeded
 *   500 — unexpected server error
 *
 * MCP tool equivalent (Phase 4): `resendVerificationEmail({ email })`
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { generateToken, createAuditEvent } from '@vastu/shared/utils';

// ---------------------------------------------------------------------------
// In-process rate limit store
// key: email — value: { count: number; windowStart: number }
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
/** Token TTL in minutes — matches the window so expired tokens don't accumulate. */
const TOKEN_TTL_MINUTES = 60;

/**
 * Check and increment the rate limit counter for the given email.
 * Returns true if the request is allowed, false if it should be blocked.
 */
function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(email);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window — reset counter.
    rateLimitStore.set(email, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).email !== 'string'
  ) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const email = ((body as Record<string, unknown>).email as string).trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  // Check rate limit before doing any DB work.
  if (!checkRateLimit(email)) {
    return NextResponse.json(
      { error: 'Too many resend requests. Please wait before trying again.' },
      { status: 429 },
    );
  }

  try {
    // Look up the user. If not found, return 200 anyway to prevent enumeration.
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (user && !user.emailVerified) {
      // Delete any existing tokens for this email to avoid stale tokens.
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });

      // Create a new verification token.
      const token = generateToken(32);
      const expires = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });

      // TODO (Phase 0): integrate with an email provider (e.g. Keycloak, SendGrid, Resend)
      // to actually deliver the verification email.
      // The link should be: <BASE_URL>/api/auth/verify-email?token=<token>&email=<email>
      // For now, log to server console for development convenience.
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      console.info(`[resend-verification] Verification URL for ${email}: ${verificationUrl}`);

      // Audit event for the resend action.
      await createAuditEvent({
        userId: user.id,
        userName: user.name,
        action: 'verification_email_resent',
        resourceType: 'user',
        resourceId: user.id,
        resourceDescription: `Verification email resent to ${email}`,
        ipAddress:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
        organizationId: user.organizationId,
      });
    }

    // Always return 200 — prevents email enumeration.
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[resend-verification] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/auth/sso/providers?email={email}
 *
 * Looks up SSO providers configured for the given email's domain.
 * Returns an array of provider objects the client uses to:
 *   - Auto-redirect if exactly one provider found (AC-2)
 *   - Show a selection list if multiple providers found (AC-3)
 *   - Show an error if no providers found
 *
 * Note: The sso_providers table does not yet exist in the Prisma schema
 * (pending ADR-002 approval — see plan.md). This route returns a stub empty
 * array until US-019 (SSO configuration page) lands and the table is added.
 * When US-019 ships, replace the stub query below with a real Prisma lookup.
 *
 * MCP parity note: When the MCP server is built (Phase 4), the equivalent
 * tool would be `list_sso_providers(email_domain: string)`.
 */

import { NextResponse } from 'next/server';
import type { SsoProvider, SsoProvidersResponse } from '../../../../../types/sso';

// Re-export types for convenience so callers can import from the route if preferred.
export type { SsoProvider, SsoProvidersResponse, SsoProtocol } from '../../../../../types/sso';

/**
 * Validate that a string is a plausibly-formed email address.
 * Mirrors the same pattern used in LoginForm/SsoForm for consistency.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Extract the domain portion from an email address.
 * Returns null for invalid inputs.
 */
function extractDomain(email: string): string | null {
  const parts = email.trim().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1].toLowerCase();
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') ?? '';

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'A valid email address is required.' },
      { status: 400 },
    );
  }

  const domain = extractDomain(email);
  if (!domain) {
    return NextResponse.json(
      { error: 'Could not extract domain from email.' },
      { status: 400 },
    );
  }

  // ---------------------------------------------------------------------------
  // STUB: sso_providers table does not exist yet (see ADR-002 in plan.md).
  // Replace this section with a Prisma query once US-019 adds the table:
  //
  //   const providers = await prisma.ssoProvider.findMany({
  //     where: {
  //       emailDomain: domain,
  //       status: 'LIVE',
  //       organization: { deletedAt: null },
  //     },
  //     select: { id: true, name: true, protocol: true, keycloakAlias: true },
  //   });
  // ---------------------------------------------------------------------------
  const providers: SsoProvider[] = [];

  const response: SsoProvidersResponse = { providers };
  return NextResponse.json(response, { status: 200 });
}

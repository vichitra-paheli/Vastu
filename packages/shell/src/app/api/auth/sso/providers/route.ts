/**
 * GET /api/auth/sso/providers?email={email}
 *
 * Looks up SSO providers configured for the given email's domain.
 * Returns an array of provider objects the client uses to:
 *   - Auto-redirect if exactly one provider found (AC-2)
 *   - Show a selection list if multiple providers found (AC-3)
 *   - Show an error if no providers found
 *
 * Note: The SsoProvider model in schema.prisma does not have an emailDomain
 * field, so domain-based filtering is not currently supported at the database
 * level. All enabled (status=LIVE, enabled=true) providers are returned and
 * the client can filter further if needed. A future migration adding an
 * emailDomain column would enable per-domain scoping.
 *
 * Note: The SsoProvider schema has no keycloakAlias field. The provider id
 * is used as the kc_idp_hint value until a dedicated alias column is added.
 *
 * MCP parity note: When the MCP server is built (Phase 4), the equivalent
 * tool would be `list_sso_providers(email_domain: string)`.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import type { SsoProvider, SsoProvidersResponse } from '@/types/sso';

// Re-export types for convenience so callers can import from the route if preferred.
export type { SsoProvider, SsoProvidersResponse, SsoProtocol } from '@/types/sso';

/**
 * Validate that a string is a plausibly-formed email address.
 * Mirrors the same pattern used in LoginForm/SsoForm for consistency.
 */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

  // Query all enabled, live SSO providers. Domain-based scoping is not yet
  // supported (no emailDomain column in the schema) — see file-level note.
  // The email param is validated above; future work will use the domain for
  // per-organization scoping once the schema gains an emailDomain column.
  const rows = await prisma.ssoProvider.findMany({
    where: {
      enabled: true,
      status: 'LIVE',
      deletedAt: null,
    },
    select: { id: true, name: true, type: true },
  });

  // Map Prisma rows to the API response shape. The schema type field
  // (SsoProviderType enum: SAML | OIDC) is used as the protocol value.
  // The provider id stands in for keycloakAlias until that column exists.
  const providers: SsoProvider[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    protocol: row.type as SsoProvider['protocol'],
    keycloakAlias: row.id,
  }));

  const response: SsoProvidersResponse = { providers };
  return NextResponse.json(response, { status: 200 });
}

/**
 * GET  /api/settings/sso — List all configured SSO identity providers.
 * POST /api/settings/sso — Create a new SSO identity provider.
 *
 * NOTE: The sso_providers table does not yet exist in the Prisma schema.
 * GET returns an empty array stub. POST returns a 501 stub until the table
 * is added and the real implementation is wired in (ADR-002 / US-019 follow-up).
 *
 * Authentication: requires a valid session. Admin-only (CASL gated at the
 * page level; route also checks to prevent direct API abuse).
 *
 * MCP parity note: When the MCP server ships (Phase 4), these map to:
 *   GET  → list_sso_provider_configs()
 *   POST → create_sso_provider_config(input)
 */

import { NextResponse } from 'next/server';
import { requireSessionWithAbility } from '../../../../lib/session';
import { isAdmin } from '@vastu/shared/permissions';
import type { SsoProviderListResponse } from '../../../../types/sso-provider';

export async function GET(): Promise<NextResponse> {
  try {
    const { ability } = await requireSessionWithAbility();
    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---------------------------------------------------------------------------
  // STUB: sso_providers table does not yet exist (ADR-002 pending).
  // Replace the empty array below with a Prisma query once the table is added:
  //
  //   const providers = await prisma.ssoProvider.findMany({
  //     where: { organization: { deletedAt: null } },
  //     orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  //     select: {
  //       id: true, name: true, protocol: true, status: true,
  //       isDefault: true, metadataUrl: true, clientId: true,
  //       redirectUri: true, createdAt: true, updatedAt: true,
  //     },
  //   });
  // ---------------------------------------------------------------------------

  const response: SsoProviderListResponse = { providers: [] };
  return NextResponse.json(response, { status: 200 });
}

export async function POST(_request: Request): Promise<NextResponse> {
  try {
    const { ability } = await requireSessionWithAbility();
    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---------------------------------------------------------------------------
  // STUB: sso_providers table does not yet exist.
  // When the table is added, parse the request body and create the provider:
  //
  //   const body = await _request.json() as CreateSsoProviderInput;
  //   // Validate body fields...
  //   // Encrypt clientSecret before storage.
  //   const provider = await prisma.ssoProvider.create({ data: { ...body } });
  //   await writeAuditEvent(session, 'create', 'SsoProvider', provider.id);
  //   return NextResponse.json({ provider }, { status: 201 });
  // ---------------------------------------------------------------------------

  return NextResponse.json(
    { error: 'Not implemented — sso_providers table not yet created' },
    { status: 501 },
  );
}

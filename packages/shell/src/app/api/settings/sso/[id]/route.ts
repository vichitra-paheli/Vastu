/**
 * PATCH  /api/settings/sso/[id] — Update or test an SSO identity provider.
 * DELETE /api/settings/sso/[id] — Delete an SSO identity provider.
 *
 * NOTE: The sso_providers table does not yet exist in the Prisma schema.
 * Both handlers return 501 stubs until the table is added (ADR-002).
 *
 * PATCH supports a special `_action: 'test'` body to trigger a connection test
 * without persisting any changes.
 *
 * Authentication: requires a valid session. Admin-only (CASL gated).
 *
 * MCP parity note: When the MCP server ships (Phase 4), these map to:
 *   PATCH  → update_sso_provider_config(id, input)
 *   DELETE → delete_sso_provider_config(id)
 */

import { NextResponse } from 'next/server';
import { requireSessionWithAbility } from '../../../../../lib/session';
import { isAdmin } from '@vastu/shared/permissions';

interface RouteContext {
  params: { id: string };
}

export async function PATCH(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { ability } = await requireSessionWithAbility();
    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // STUB: sso_providers table does not yet exist.
  // When the table is added, implement as follows:
  //
  //   const body = await _request.json() as UpdateSsoProviderInput & { _action?: string };
  //
  //   if (body._action === 'test') {
  //     // Run a Keycloak identity provider connectivity check.
  //     // Return { success: true, latencyMs: number } or { success: false, error: string }.
  //     return NextResponse.json({ success: true, latencyMs: 0 }, { status: 200 });
  //   }
  //
  //   // If setting as default, unset any existing default first.
  //   if (body.isDefault) {
  //     await prisma.ssoProvider.updateMany({ data: { isDefault: false } });
  //   }
  //   const provider = await prisma.ssoProvider.update({ where: { id }, data: body });
  //   await writeAuditEvent(session, 'update', 'SsoProvider', id);
  //   return NextResponse.json({ provider }, { status: 200 });
  // ---------------------------------------------------------------------------

  return NextResponse.json(
    { error: 'Not implemented — sso_providers table not yet created', id },
    { status: 501 },
  );
}

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { ability } = await requireSessionWithAbility();
    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = context.params;

  if (!id) {
    return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // STUB: sso_providers table does not yet exist.
  // When the table is added, implement as follows:
  //
  //   const provider = await prisma.ssoProvider.findUnique({ where: { id } });
  //   if (!provider) {
  //     return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  //   }
  //   await prisma.ssoProvider.delete({ where: { id } });
  //   await writeAuditEvent(session, 'delete', 'SsoProvider', id);
  //   return NextResponse.json({ success: true }, { status: 200 });
  // ---------------------------------------------------------------------------

  return NextResponse.json(
    { error: 'Not implemented — sso_providers table not yet created', id },
    { status: 501 },
  );
}

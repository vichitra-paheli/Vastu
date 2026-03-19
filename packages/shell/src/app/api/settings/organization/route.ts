/**
 * GET  /api/settings/organization — Fetch current organization details.
 * PATCH /api/settings/organization — Update organization details.
 *
 * Requires an authenticated admin session.
 *
 * PATCH request body (all fields optional):
 *   { name?, logoUrl?, workspaceUrl?, defaultTimezone?, defaultLanguage?, ssoRequired? }
 *
 * Returns:
 *   GET  200 { organization: Organization }
 *   PATCH 200 { success: true, organization: Organization }  on success
 *   400 { error: string }                              on validation failure
 *   401 { error: string }                              if not authenticated
 *   403 { error: string }                              if not an admin
 *   500 { error: string }                              on unexpected failure
 *
 * MCP tool equivalent: update_organization({ name, logoUrl, workspaceUrl, defaultTimezone, defaultLanguage, ssoRequired })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { isAdmin } from '@vastu/shared/permissions';
import type { UpdateOrganizationInput } from '@vastu/shared';
import { createAuditEvent } from '@vastu/shared/utils';
import { getSessionWithAbility } from '@/lib/session';

// ---------------------------------------------------------------------------
// Extended Prisma result type
//
// ssoRequired is added by migration 20260318000001. The Prisma client type will
// reflect this field once `prisma generate` is run after the migration. Until
// then, we cast the Prisma result to this extended type so the route compiles
// and the field is accessible at runtime (after migration is applied).
// ---------------------------------------------------------------------------

interface OrgWithSsoRequired {
  id: string;
  name: string;
  logoUrl: string | null;
  workspaceUrl: string | null;
  defaultTimezone: string;
  defaultLanguage: string;
  ssoRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const { session, ability } = await getSessionWithAbility();
  if (!session || !ability) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(ability)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    });
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json({ organization });
  } catch (err) {
    console.error('[settings/organization GET] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to load organization. Please try again.' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Body type guard
// ---------------------------------------------------------------------------

interface PatchBody {
  name?: string;
  logoUrl?: string;
  workspaceUrl?: string;
  defaultTimezone?: string;
  defaultLanguage?: string;
  ssoRequired?: boolean;
}

function isValidPatchBody(body: unknown): body is PatchBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  const stringOrUndefined = (v: unknown) => v === undefined || typeof v === 'string';
  const boolOrUndefined = (v: unknown) => v === undefined || typeof v === 'boolean';
  return (
    stringOrUndefined(b.name) &&
    stringOrUndefined(b.logoUrl) &&
    stringOrUndefined(b.workspaceUrl) &&
    stringOrUndefined(b.defaultTimezone) &&
    stringOrUndefined(b.defaultLanguage) &&
    boolOrUndefined(b.ssoRequired)
  );
}

// ---------------------------------------------------------------------------
// PATCH handler
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // Auth
  const { session, ability } = await getSessionWithAbility();
  if (!session || !ability) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(ability)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body
  let body: PatchBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidPatchBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Validate
  if (body.name !== undefined && body.name.trim().length === 0) {
    return NextResponse.json({ error: 'Organization name cannot be empty' }, { status: 400 });
  }

  if (body.workspaceUrl !== undefined) {
    const slug = body.workspaceUrl.trim();
    if (slug.length === 0) {
      return NextResponse.json({ error: 'Workspace URL cannot be empty' }, { status: 400 });
    }
    const slugPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Workspace URL must be lowercase letters, numbers, and hyphens only' },
        { status: 400 },
      );
    }
  }

  // Build update data — only include fields that were provided
  const updateData: UpdateOrganizationInput = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
  if (body.workspaceUrl !== undefined) updateData.workspaceUrl = body.workspaceUrl.trim();
  if (body.defaultTimezone !== undefined) updateData.defaultTimezone = body.defaultTimezone;
  if (body.defaultLanguage !== undefined) updateData.defaultLanguage = body.defaultLanguage;
  if (body.ssoRequired !== undefined) updateData.ssoRequired = body.ssoRequired;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    // Load current state for audit diff
    // Cast: ssoRequired added by migration 20260318000001; present once prisma generate is run.
    const before = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
    }) as OrgWithSsoRequired | null;

    // Cast: same reason as above.
    const organization = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: updateData,
    }) as OrgWithSsoRequired;

    // Audit event — best-effort, non-blocking
    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'Organization',
      resourceId: organization.id,
      resourceDescription: `Organization updated: ${organization.name}`,
      beforeState: before
        ? {
            name: before.name,
            logoUrl: before.logoUrl,
            workspaceUrl: before.workspaceUrl,
            defaultTimezone: before.defaultTimezone,
            defaultLanguage: before.defaultLanguage,
            ssoRequired: before.ssoRequired,
          }
        : undefined,
      afterState: {
        name: organization.name,
        logoUrl: organization.logoUrl,
        workspaceUrl: organization.workspaceUrl,
        defaultTimezone: organization.defaultTimezone,
        defaultLanguage: organization.defaultLanguage,
        ssoRequired: organization.ssoRequired,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: organization.id,
    }).catch((err: unknown) => {
      console.error('[settings/organization PATCH] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true, organization });
  } catch (err) {
    console.error('[settings/organization PATCH] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to update organization. Please try again.' },
      { status: 500 },
    );
  }
}

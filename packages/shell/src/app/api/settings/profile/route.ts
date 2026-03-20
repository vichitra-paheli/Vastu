/**
 * PATCH /api/settings/profile
 *
 * Updates the authenticated user's profile fields: name, language, timezone.
 * Requires an active session — returns 401 if the user is not authenticated.
 *
 * Request body (JSON):
 *   { name?: string; language?: string; timezone?: string }
 *
 * Returns:
 *   200 { success: true }          on success
 *   400 { error: string }          on validation failure
 *   401 { error: string }          if not authenticated
 *   500 { error: string }          on unexpected failure
 *
 * MCP tool equivalent: update_user_profile({ name, language, timezone })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSession } from '@/lib/session';

interface ProfilePatchBody {
  name?: string;
  language?: string;
  timezone?: string;
}

function isValidProfileBody(body: unknown): body is ProfilePatchBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    (b.name === undefined || typeof b.name === 'string') &&
    (b.language === undefined || typeof b.language === 'string') &&
    (b.timezone === undefined || typeof b.timezone === 'string')
  );
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  // Authenticate.
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body.
  let body: ProfilePatchBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidProfileBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, language, timezone } = body;

  // Validate name if provided.
  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  }

  // Nothing to update.
  if (name === undefined && language === undefined && timezone === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  try {
    const updateData: { name?: string; language?: string; timezone?: string } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (language !== undefined) updateData.language = language;
    if (timezone !== undefined) updateData.timezone = timezone;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, name: true, organizationId: true },
    });

    // Write audit event — best effort.
    createAuditEvent({
      userId: updatedUser.id,
      userName: updatedUser.name,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: updatedUser.id,
      resourceDescription: `Profile updated`,
      afterState: updateData as Record<string, unknown>,
      ipAddress:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: updatedUser.organizationId,
    }).catch((err: unknown) => {
      console.error('[profile] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[profile] Failed to update profile:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

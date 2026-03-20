/**
 * PATCH /api/settings/appearance
 *
 * Persists the authenticated user's appearance preferences.
 *
 * Accepted fields (all optional — omit fields to leave them unchanged):
 *   colorScheme  — 'light' | 'dark' | 'auto'
 *   accentColor  — hex color string (e.g. '#4C6EF5')
 *   density      — 'compact' | 'comfortable' | 'spacious'
 *
 * Returns:
 *   200 { success: true }                on success
 *   400 { error: string }               on validation failure
 *   401 { error: string }               when unauthenticated
 *   500 { error: string }               on unexpected failure
 *
 * MCP tool equivalent: update_appearance_settings({ colorScheme, accentColor, density })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSession } from '@/lib/session';

const VALID_COLOR_SCHEMES = ['light', 'dark', 'auto'] as const;
const VALID_DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

type ColorScheme = (typeof VALID_COLOR_SCHEMES)[number];
type Density = (typeof VALID_DENSITIES)[number];

interface AppearanceBody {
  colorScheme?: ColorScheme;
  accentColor?: string;
  density?: Density;
}

function isValidAppearanceBody(body: unknown): body is AppearanceBody {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;

  if ('colorScheme' in b && !VALID_COLOR_SCHEMES.includes(b.colorScheme as ColorScheme)) {
    return false;
  }
  if ('density' in b && !VALID_DENSITIES.includes(b.density as Density)) {
    return false;
  }
  if ('accentColor' in b) {
    if (typeof b.accentColor !== 'string' || !HEX_COLOR_RE.test(b.accentColor)) {
      return false;
    }
  }
  return true;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: AppearanceBody;
  try {
    const raw = (await request.json()) as unknown;
    if (!isValidAppearanceBody(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Nothing to update — treat as success.
  if (!body.colorScheme && !body.accentColor && !body.density) {
    return NextResponse.json({ success: true });
  }

  try {
    const before = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { colorScheme: true, accentColor: true, density: true },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.colorScheme !== undefined && { colorScheme: body.colorScheme }),
        ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
        ...(body.density !== undefined && { density: body.density }),
      },
    });

    createAuditEvent({
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      action: 'UPDATE',
      resourceType: 'AppearanceSettings',
      resourceId: session.user.id,
      resourceDescription: 'User updated appearance preferences',
      beforeState: before ?? undefined,
      afterState: {
        colorScheme: body.colorScheme,
        accentColor: body.accentColor,
        density: body.density,
      },
      ipAddress:
        request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      organizationId: session.user.organizationId,
    }).catch((err: unknown) => {
      console.error('[appearance] Failed to write audit event:', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[appearance] Failed to save appearance preferences:', err);
    return NextResponse.json({ error: 'Failed to save preferences. Please try again.' }, { status: 500 });
  }
}

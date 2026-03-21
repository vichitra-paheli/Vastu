/**
 * GET /api/workspace/views/[id] — get a single view
 * PATCH /api/workspace/views/[id] — update a view
 * DELETE /api/workspace/views/[id] — soft-delete a view
 *
 * US-110: View state store API routes.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { getSessionWithAbility } from '@/lib/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { session } = await getSessionWithAbility();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const view = await prisma.view.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
      deletedAt: null,
      OR: [
        { createdBy: session.user.id },
        { isShared: true },
      ],
    },
  });

  if (!view) {
    return NextResponse.json({ error: 'View not found' }, { status: 404 });
  }

  return NextResponse.json(view);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { session } = await getSessionWithAbility();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Only the creator can update a view
  const existing = await prisma.view.findFirst({
    where: {
      id,
      createdBy: session.user.id,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'View not found or not owned by you' }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    stateJson?: unknown;
    isShared?: boolean;
    colorDot?: string | null;
  };

  // Validate stateJson size if provided
  if (body.stateJson) {
    const stateSize = JSON.stringify(body.stateJson).length;
    if (stateSize > 100_000) {
      return NextResponse.json(
        { error: 'View state exceeds 100KB limit' },
        { status: 413 },
      );
    }
  }

  const view = await prisma.view.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.stateJson !== undefined && { stateJson: body.stateJson as object }),
      ...(body.isShared !== undefined && { isShared: body.isShared }),
      ...(body.colorDot !== undefined && { colorDot: body.colorDot }),
    },
  });

  return NextResponse.json(view);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { session } = await getSessionWithAbility();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Only the creator can delete a view
  const existing = await prisma.view.findFirst({
    where: {
      id,
      createdBy: session.user.id,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'View not found or not owned by you' }, { status: 404 });
  }

  // Soft-delete
  await prisma.view.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}

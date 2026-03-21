/**
 * GET /api/workspace/views?pageId=X — list views for a page (user's own + shared)
 * POST /api/workspace/views — create a new view
 *
 * US-110: View state store API routes.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId');

  if (!pageId) {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
  }

  const views = await prisma.view.findMany({
    where: {
      pageId,
      organizationId: session.user.organizationId,
      deletedAt: null,
      OR: [
        { createdBy: session.user.id },
        { isShared: true },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(views);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    name: string;
    pageId: string;
    stateJson: unknown;
    colorDot?: string;
    isShared?: boolean;
  };

  if (!body.name || !body.pageId || !body.stateJson) {
    return NextResponse.json(
      { error: 'name, pageId, and stateJson are required' },
      { status: 400 },
    );
  }

  // Validate stateJson size (warn at 100KB)
  const stateSize = JSON.stringify(body.stateJson).length;
  if (stateSize > 100_000) {
    return NextResponse.json(
      { error: 'View state exceeds 100KB limit' },
      { status: 413 },
    );
  }

  const view = await prisma.view.create({
    data: {
      name: body.name,
      pageId: body.pageId,
      stateJson: body.stateJson as object,
      createdBy: session.user.id,
      isShared: body.isShared ?? false,
      colorDot: body.colorDot ?? null,
      organizationId: session.user.organizationId,
    },
  });

  return NextResponse.json(view, { status: 201 });
}

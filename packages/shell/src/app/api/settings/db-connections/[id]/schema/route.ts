/**
 * GET /api/settings/db-connections/[id]/schema
 *
 * Returns schema information (tables + columns) for a saved DB connection.
 *
 * Phase 0 behaviour: live schema introspection requires a database driver
 * integration that will be added in Phase 1. This endpoint returns a
 * well-typed stub response with available=false so the UI can display an
 * informative message rather than a broken state.
 *
 * When Phase 1 adds a real driver the implementation here can be swapped
 * without changing the API contract or the frontend component.
 *
 * Returns:
 *   200 { available: false, reason: string }                   — Phase 0 stub
 *   200 { available: true,  tables: SchemaTable[] }            — Phase 1+
 *   401 { error: string }
 *   403 { error: string }
 *   404 { error: string }
 *   500 { error: string }
 *
 * MCP tool equivalent: get_db_schema({ id })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { requireSessionWithAbility } from '@/lib/session';

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'DbConnection')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    const connection = await prisma.dbConnection.findFirst({
      where: { id, organizationId: session.user.organizationId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Phase 0 stub: schema introspection requires a live database driver.
    // Return a structured response so the UI degrades gracefully.
    return NextResponse.json({
      available: false,
      reason:
        'Schema inspection requires an active database connection. ' +
        'This feature will be available in a later release.',
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[db-connections schema GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

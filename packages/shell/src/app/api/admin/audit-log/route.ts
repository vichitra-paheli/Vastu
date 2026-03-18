/**
 * GET /api/admin/audit-log
 *
 * Returns paginated, filtered audit events for the current organization.
 *
 * Query parameters:
 *   page        — 1-based page number (default: 1)
 *   limit       — rows per page (default: 50, max: 200)
 *   userId      — filter by user ID
 *   action      — filter by action type (Create|Update|Delete|Login|Export)
 *   resourceType — filter by resource type string
 *   dateFrom    — ISO date string (start of range, inclusive)
 *   dateTo      — ISO date string (end of range, inclusive)
 *
 * Response: { events: AuditEvent[], total: number, page: number, limit: number }
 *
 * Admin-only: returns 403 for non-admin callers.
 *
 * MCP tool equivalent: list_audit_events({ filters, page, limit })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { requireSessionWithAbility } from '../../../../lib/session';
import { isAdmin } from '@vastu/shared/permissions';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));

    const userId = searchParams.get('userId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const resourceType = searchParams.get('resourceType') ?? undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;

    const organizationId = session.user.organizationId;

    // Build createdAt filter when at least one date bound is provided
    const createdAtFilter =
      dateFrom !== undefined || dateTo !== undefined
        ? {
            createdAt: {
              ...(dateFrom !== undefined ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo !== undefined
                ? {
                    lte: (() => {
                      const d = new Date(dateTo);
                      // Include the entire end day
                      d.setHours(23, 59, 59, 999);
                      return d;
                    })(),
                  }
                : {}),
            },
          }
        : {};

    const where = {
      organizationId,
      ...(userId !== undefined ? { userId } : {}),
      ...(action !== undefined ? { action } : {}),
      ...(resourceType !== undefined ? { resourceType } : {}),
      ...createdAtFilter,
    };

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return NextResponse.json({ events, total, page, limit });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[audit-log GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/audit-log/export
 *
 * Exports filtered audit events as a CSV download.
 * Accepts the same filter query parameters as the list endpoint (no pagination).
 * Capped at 10,000 rows to prevent runaway exports.
 *
 * Admin-only: returns 403 for non-admin callers.
 *
 * MCP tool equivalent: export_audit_events({ filters, format: 'csv' })
 */

import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vastu/shared/prisma';
import { requireSessionWithAbility } from '../../../../../lib/session';
import { isAdmin } from '@vastu/shared/permissions';
import { formatTimestamp } from '@vastu/shared/utils';

const EXPORT_ROW_CAP = 10_000;

function escapeCsv(value: string | null | undefined): string {
  const str = value ?? '';
  // Wrap in quotes if it contains comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!isAdmin(ability)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
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

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: EXPORT_ROW_CAP,
    });

    // Build CSV
    const headers = [
      'Timestamp',
      'User Name',
      'User ID',
      'Action',
      'Resource Type',
      'Resource ID',
      'Resource Description',
      'IP Address',
      'User Agent',
      'Event ID',
    ];

    const rows = events.map((event) =>
      [
        escapeCsv(formatTimestamp(event.createdAt)),
        escapeCsv(event.userName),
        escapeCsv(event.userId),
        escapeCsv(event.action),
        escapeCsv(event.resourceType),
        escapeCsv(event.resourceId),
        escapeCsv(event.resourceDescription),
        escapeCsv(event.ipAddress),
        escapeCsv(event.userAgent),
        escapeCsv(event.id),
      ].join(','),
    );

    const csv = [headers.join(','), ...rows].join('\n');

    const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[audit-log export GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

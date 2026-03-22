/**
 * GET /api/workspace/records/[id]/history — fetch paginated change history for a record
 *
 * Query parameters:
 *   page     — 1-based page number (default: 1)
 *   pageSize — number of entries per page (default: 20)
 *
 * Returns:
 *   { entries: RecordHistoryEntry[], total: number, page: number, pageSize: number }
 *
 * Requires authenticated session and CASL read:Record permission.
 *
 * TODO: Replace the in-memory store with Prisma once the RecordHistory migration lands.
 * The API contract (request / response shape) will remain unchanged.
 *
 * Implements VASTU-1B-128f.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSessionWithAbility } from '@/lib/session';
import type { RecordHistoryEntry } from '@vastu/shared';

/**
 * In-memory history store.
 * Key: `{organizationId}:{recordId}`
 * Value: ordered array of history entries (oldest first).
 *
 * This is intentionally process-local and ephemeral — it is replaced by
 * Prisma persistence once the database migration is available.
 */
const historyStore = new Map<string, RecordHistoryEntry[]>();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Build a stable store key scoped to the organization. */
function storeKey(organizationId: string, recordId: string): string {
  return `${organizationId}:${recordId}`;
}

/**
 * GET /api/workspace/records/[id]/history
 *
 * Returns a paginated list of history entries for the specified record,
 * ordered from newest to oldest.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10) || 20),
    );

    const key = storeKey(session.user.organizationId, recordId);
    const allEntries = historyStore.get(key) ?? [];

    // Return newest entries first
    const sorted = [...allEntries].reverse();
    const total = sorted.length;
    const startIndex = (page - 1) * pageSize;
    const entries = sorted.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({ entries, total, page, pageSize });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[records/history GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Expose the store for test seeding only.
 * This export is consumed by unit tests and must not be used in production code.
 */
export { historyStore };

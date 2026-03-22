/**
 * GET  /api/workspace/records/[id] — fetch a single record with full fields and creator info
 * PUT  /api/workspace/records/[id] — partial update a record, returns the updated record
 * DELETE /api/workspace/records/[id] — soft-delete a record (sets deletedAt), returns 204
 *
 * All routes require an authenticated session and CASL authorization.
 *
 * TODO: Replace the in-memory store with Prisma once the Record migration lands.
 * The API contract (request / response shape) will remain unchanged.
 *
 * Implements VASTU-1B-128f.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSessionWithAbility } from '@/lib/session';
import type { VastuRecord } from '@vastu/shared';

/**
 * In-memory record store.
 * Key: `{organizationId}:{recordId}`
 * Value: VastuRecord
 *
 * This is intentionally process-local and ephemeral — it is replaced by
 * Prisma persistence once the database migration is available.
 */
const recordStore = new Map<string, VastuRecord>();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Build a stable store key scoped to the organization. */
function storeKey(organizationId: string, recordId: string): string {
  return `${organizationId}:${recordId}`;
}

/**
 * GET /api/workspace/records/[id]
 *
 * Returns the record with all fields, created/updated timestamps, and creator info.
 * Returns 404 when the record does not exist or has been soft-deleted.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;
    const key = storeKey(session.user.organizationId, recordId);
    const record = recordStore.get(key);

    if (!record || record.deletedAt !== null) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[records GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/workspace/records/[id]
 *
 * Partial update of a record's fields.
 * Expects `{ fields: Record<string, unknown> }` in the request body.
 * Returns the updated record.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('update', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;

    let body: { fields?: Record<string, unknown> };
    try {
      body = (await request.json()) as { fields?: Record<string, unknown> };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.fields || typeof body.fields !== 'object' || Array.isArray(body.fields)) {
      return NextResponse.json(
        { error: 'Request body must contain a "fields" object' },
        { status: 400 },
      );
    }

    const key = storeKey(session.user.organizationId, recordId);
    const existing = recordStore.get(key);

    if (!existing || existing.deletedAt !== null) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const now = new Date();
    const updated: VastuRecord = {
      ...existing,
      fields: { ...existing.fields, ...body.fields },
      updatedAt: now,
    };

    recordStore.set(key, updated);

    return NextResponse.json({ record: updated });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[records PUT] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspace/records/[id]
 *
 * Soft-deletes a record by setting its `deletedAt` timestamp.
 * Returns 204 No Content on success.
 * Returns 404 when the record does not exist or is already deleted.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('delete', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;
    const key = storeKey(session.user.organizationId, recordId);
    const existing = recordStore.get(key);

    if (!existing || existing.deletedAt !== null) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const deleted: VastuRecord = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    recordStore.set(key, deleted);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[records DELETE] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Expose the store for test seeding only.
 * This export is consumed by unit tests and must not be used in production code.
 */
export { recordStore };

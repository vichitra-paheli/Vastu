/**
 * GET  /api/workspace/records/[id] — fetch a single record with full fields and creator info
 * PUT  /api/workspace/records/[id] — partial update a record, returns the updated record
 * DELETE /api/workspace/records/[id] — soft-delete a record (sets deletedAt), returns 204
 *
 * All routes require an authenticated session and CASL authorization.
 * PUT and DELETE write an audit entry to the shared history store.
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
import { recordStore, storeKey, appendHistoryEntry } from './_stores';

interface RouteParams {
  params: Promise<{ id: string }>;
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
 * Writes an audit history entry on success.
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

    // Audit: record field-level diff for the history log
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const field of Object.keys(body.fields)) {
      changes[field] = { before: existing.fields[field], after: body.fields[field] };
    }

    appendHistoryEntry(key, {
      id: crypto.randomUUID(),
      recordId,
      action: 'update',
      changes,
      userId: session.user.id,
      userName: session.user.name ?? session.user.id,
      timestamp: now,
    });

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
 * Soft-deletes a record by setting its deletedAt timestamp.
 * Returns 204 No Content on success.
 * Returns 404 when the record does not exist or is already deleted.
 * Writes an audit history entry on success.
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

    // Use a single timestamp for both deletedAt and updatedAt
    const now = new Date();
    const deleted: VastuRecord = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
    };

    recordStore.set(key, deleted);

    appendHistoryEntry(key, {
      id: crypto.randomUUID(),
      recordId,
      action: 'delete',
      changes: {},
      userId: session.user.id,
      userName: session.user.name ?? session.user.id,
      timestamp: now,
    });

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

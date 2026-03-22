/**
 * GET  /api/workspace/records/[id]/notes — list all notes for a record
 * POST /api/workspace/records/[id]/notes — create a new note on a record
 *
 * GET requires CASL read:Record permission.
 * POST requires CASL update:Record permission.
 * Both return 404 when the parent record does not exist or has been soft-deleted.
 * POST writes an audit entry to the shared history store.
 *
 * TODO: Replace the in-memory store with Prisma once the RecordNote migration lands.
 * The API contract (request / response shape) will remain unchanged.
 *
 * Implements VASTU-1B-128f.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireSessionWithAbility } from '@/lib/session';
import type { RecordNote } from '@vastu/shared';
import { recordStore, notesStore, storeKey, appendHistoryEntry } from '../_stores';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workspace/records/[id]/notes
 *
 * Returns all notes for the record, ordered from oldest to newest.
 * Returns 404 when the parent record does not exist or has been soft-deleted.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;
    const key = storeKey(session.user.organizationId, recordId);

    // Verify the parent record exists and has not been soft-deleted
    const record = recordStore.get(key);
    if (!record || record.deletedAt !== null) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const notes = notesStore.get(key) ?? [];

    return NextResponse.json({ notes });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[records/notes GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/workspace/records/[id]/notes
 *
 * Creates a new note on the record.
 * Expects `{ content: string }` in the request body.
 * Returns 201 with the created note.
 * Returns 404 when the parent record does not exist or has been soft-deleted.
 * Writes an audit history entry on success.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('update', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;
    const key = storeKey(session.user.organizationId, recordId);

    // Verify the parent record exists and has not been soft-deleted
    const record = recordStore.get(key);
    if (!record || record.deletedAt !== null) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    let body: { content?: unknown };
    try {
      body = (await request.json()) as { content?: unknown };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return NextResponse.json(
        { error: 'Request body must contain a non-empty "content" string' },
        { status: 400 },
      );
    }

    const now = new Date();
    const note: RecordNote = {
      id: crypto.randomUUID(),
      recordId,
      content: body.content.trim(),
      userId: session.user.id,
      userName: session.user.name ?? session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    const existing = notesStore.get(key) ?? [];
    notesStore.set(key, [...existing, note]);

    appendHistoryEntry(key, {
      id: crypto.randomUUID(),
      recordId,
      action: 'update',
      changes: { note_added: { before: null, after: note.id } },
      userId: session.user.id,
      userName: session.user.name ?? session.user.id,
      timestamp: now,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[records/notes POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Expose the store for test seeding only.
 * This export is consumed by unit tests and must not be used in production code.
 */
export { notesStore };

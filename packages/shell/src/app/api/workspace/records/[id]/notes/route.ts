/**
 * GET  /api/workspace/records/[id]/notes — list all notes for a record
 * POST /api/workspace/records/[id]/notes — create a new note on a record
 *
 * GET requires CASL read:Record permission.
 * POST requires CASL update:Record permission.
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

/**
 * In-memory notes store.
 * Key: `{organizationId}:{recordId}`
 * Value: ordered array of notes (oldest first).
 *
 * This is intentionally process-local and ephemeral — it is replaced by
 * Prisma persistence once the database migration is available.
 */
const notesStore = new Map<string, RecordNote[]>();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Build a stable store key scoped to the organization. */
function storeKey(organizationId: string, recordId: string): string {
  return `${organizationId}:${recordId}`;
}

/** Generate a simple sequential ID for in-memory entries. */
let _noteCounter = 0;
function nextNoteId(): string {
  _noteCounter += 1;
  return `note-${_noteCounter}`;
}

/**
 * GET /api/workspace/records/[id]/notes
 *
 * Returns all notes for the record, ordered from oldest to newest.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('read', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;
    const key = storeKey(session.user.organizationId, recordId);
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
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, ability } = await requireSessionWithAbility();

    if (!ability.can('update', 'Record')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: recordId } = await params;

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
      id: nextNoteId(),
      recordId,
      content: body.content.trim(),
      userId: session.user.id,
      userName: session.user.name ?? session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    const key = storeKey(session.user.organizationId, recordId);
    const existing = notesStore.get(key) ?? [];
    notesStore.set(key, [...existing, note]);

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

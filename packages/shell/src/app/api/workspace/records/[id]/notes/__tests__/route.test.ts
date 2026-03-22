/**
 * Unit tests for GET and POST /api/workspace/records/[id]/notes
 *
 * The session helper is mocked so tests don't require a live DB or auth server.
 *
 * Covers:
 * - GET returns notes for the record
 * - GET returns empty array when no notes exist yet
 * - GET returns 404 for non-existent record
 * - GET returns 404 for soft-deleted record
 * - GET returns 401 when unauthenticated
 * - GET returns 403 when user lacks read:Record permission
 * - POST creates a new note and returns 201
 * - POST returns 400 for missing content
 * - POST returns 400 for empty content string
 * - POST returns 400 for non-string content
 * - POST returns 400 for malformed JSON
 * - POST returns 404 for non-existent record
 * - POST returns 404 for soft-deleted record
 * - POST returns 401 when unauthenticated
 * - POST returns 403 when user lacks update:Record permission
 * - POST writes an audit history entry
 * - CASL action/subject checks for each method
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { VastuRecord, RecordNote } from '@vastu/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, POST } from '../route';
import { recordStore, historyStore, notesStore, storeKey } from '../../_stores';
import { requireSessionWithAbility } from '@/lib/session';

const sessionMock = vi.mocked(requireSessionWithAbility);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAbility(canResult: boolean = true) {
  return { can: vi.fn(() => canResult) };
}

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-1',
      name: 'Test User',
      organizationId: 'org-1',
      ...overrides,
    },
  };
}

function setupAuthSession(canResult: boolean = true) {
  sessionMock.mockResolvedValueOnce({
    session: buildSession() as never,
    ability: buildAbility(canResult) as never,
  });
}

function makeGetRequest(recordId: string): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/records/${recordId}/notes`, {
    method: 'GET',
  });
}

function makePostRequest(recordId: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/records/${recordId}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeRawPostRequest(recordId: string, rawBody: string): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/records/${recordId}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: rawBody,
  });
}

function makeParams(recordId: string) {
  return { params: Promise.resolve({ id: recordId }) };
}

/** Seed a live (non-deleted) record into the record store. */
function seedRecord(recordId: string, overrides: Partial<VastuRecord> = {}): VastuRecord {
  const now = new Date();
  const record: VastuRecord = {
    id: recordId,
    pageId: 'page-1',
    organizationId: 'org-1',
    fields: { name: 'Test Record' },
    createdBy: 'user-1',
    createdByName: 'Test User',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
  recordStore.set(storeKey('org-1', recordId), record);
  return record;
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/workspace/records/[id]/notes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordStore.clear();
    notesStore.clear();
    historyStore.clear();
  });

  it('returns 200 with notes when they exist', async () => {
    seedRecord('rec-notes-200');
    // Pre-populate a note directly via the store
    const note: RecordNote = {
      id: 'note-seed',
      recordId: 'rec-notes-200',
      content: 'Seeded note',
      userId: 'user-1',
      userName: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    notesStore.set(storeKey('org-1', 'rec-notes-200'), [note]);
    setupAuthSession();

    const response = await GET(makeGetRequest('rec-notes-200'), makeParams('rec-notes-200'));
    const body = await response.json() as { notes: RecordNote[] };

    expect(response.status).toBe(200);
    expect(body.notes).toHaveLength(1);
    expect(body.notes[0].content).toBe('Seeded note');
  });

  it('returns 200 with empty array when no notes exist', async () => {
    seedRecord('rec-notes-empty');
    setupAuthSession();

    const response = await GET(makeGetRequest('rec-notes-empty'), makeParams('rec-notes-empty'));
    const body = await response.json() as { notes: RecordNote[] };

    expect(response.status).toBe(200);
    expect(body.notes).toHaveLength(0);
  });

  it('returns 404 when record does not exist', async () => {
    setupAuthSession();

    const response = await GET(makeGetRequest('nonexistent'), makeParams('nonexistent'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 404 for a soft-deleted record', async () => {
    seedRecord('rec-notes-deleted', { deletedAt: new Date() });
    setupAuthSession();

    const response = await GET(
      makeGetRequest('rec-notes-deleted'),
      makeParams('rec-notes-deleted'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await GET(makeGetRequest('any'), makeParams('any'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks read:Record permission', async () => {
    setupAuthSession(false);

    const response = await GET(makeGetRequest('any'), makeParams('any'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('checks the correct CASL action and subject for GET', async () => {
    seedRecord('rec-notes-casl-get');
    const ability = buildAbility(true);
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: ability as never,
    });

    await GET(makeGetRequest('rec-notes-casl-get'), makeParams('rec-notes-casl-get'));

    expect(ability.can).toHaveBeenCalledWith('read', 'Record');
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------

describe('POST /api/workspace/records/[id]/notes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordStore.clear();
    notesStore.clear();
    historyStore.clear();
  });

  it('creates a note and returns 201 with the created note', async () => {
    seedRecord('rec-post-201');
    setupAuthSession();

    const response = await POST(
      makePostRequest('rec-post-201', { content: 'A new note' }),
      makeParams('rec-post-201'),
    );
    const body = await response.json() as { note: RecordNote };

    expect(response.status).toBe(201);
    expect(body.note.content).toBe('A new note');
    expect(body.note.recordId).toBe('rec-post-201');
    expect(body.note.userId).toBe('user-1');
    expect(body.note.userName).toBe('Test User');
    // ID should be a UUID (not a sequential counter)
    expect(body.note.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('trims whitespace from the content before saving', async () => {
    seedRecord('rec-post-trim');
    setupAuthSession();

    const response = await POST(
      makePostRequest('rec-post-trim', { content: '  trimmed note  ' }),
      makeParams('rec-post-trim'),
    );
    const body = await response.json() as { note: RecordNote };

    expect(response.status).toBe(201);
    expect(body.note.content).toBe('trimmed note');
  });

  it('writes an audit history entry after creating a note', async () => {
    seedRecord('rec-post-audit');
    setupAuthSession();

    await POST(
      makePostRequest('rec-post-audit', { content: 'Audit test' }),
      makeParams('rec-post-audit'),
    );

    const key = storeKey('org-1', 'rec-post-audit');
    const history = historyStore.get(key) ?? [];
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe('update');
    expect(history[0].recordId).toBe('rec-post-audit');
    expect(Object.keys(history[0].changes)).toContain('note_added');
  });

  it('returns 400 for missing content field', async () => {
    seedRecord('rec-post-no-content');
    setupAuthSession();

    const response = await POST(
      makePostRequest('rec-post-no-content', {}),
      makeParams('rec-post-no-content'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('"content"');
  });

  it('returns 400 for empty content string', async () => {
    seedRecord('rec-post-empty-content');
    setupAuthSession();

    const response = await POST(
      makePostRequest('rec-post-empty-content', { content: '   ' }),
      makeParams('rec-post-empty-content'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('"content"');
  });

  it('returns 400 when content is not a string', async () => {
    seedRecord('rec-post-type-error');
    setupAuthSession();

    const response = await POST(
      makePostRequest('rec-post-type-error', { content: 42 }),
      makeParams('rec-post-type-error'),
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 for malformed JSON body', async () => {
    seedRecord('rec-post-bad-json');
    setupAuthSession();

    const response = await POST(
      makeRawPostRequest('rec-post-bad-json', 'not-valid-json{{'),
      makeParams('rec-post-bad-json'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 404 when record does not exist', async () => {
    setupAuthSession();

    const response = await POST(
      makePostRequest('nonexistent', { content: 'A note' }),
      makeParams('nonexistent'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 404 for a soft-deleted record', async () => {
    seedRecord('rec-post-deleted', { deletedAt: new Date() });
    setupAuthSession();

    const response = await POST(
      makePostRequest('rec-post-deleted', { content: 'A note' }),
      makeParams('rec-post-deleted'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await POST(
      makePostRequest('any', { content: 'A note' }),
      makeParams('any'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks update:Record permission', async () => {
    setupAuthSession(false);

    const response = await POST(
      makePostRequest('any', { content: 'A note' }),
      makeParams('any'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('checks the correct CASL action and subject for POST', async () => {
    seedRecord('rec-post-casl');
    const ability = buildAbility(true);
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: ability as never,
    });

    await POST(
      makePostRequest('rec-post-casl', { content: 'A note' }),
      makeParams('rec-post-casl'),
    );

    expect(ability.can).toHaveBeenCalledWith('update', 'Record');
  });
});

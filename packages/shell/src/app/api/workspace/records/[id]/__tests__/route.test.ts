/**
 * Unit tests for GET, PUT, and DELETE /api/workspace/records/[id]
 *
 * The session helper is mocked so tests don't require a live DB or auth server.
 *
 * Covers:
 * - GET returns record when found
 * - GET returns 404 for missing record
 * - GET returns 404 for soft-deleted record
 * - GET returns 401 when unauthenticated
 * - GET returns 403 when user lacks read:Record permission
 * - PUT updates record fields and returns 200
 * - PUT returns 400 for bad JSON
 * - PUT returns 400 when fields is missing
 * - PUT returns 404 when record does not exist
 * - PUT returns 401 when unauthenticated
 * - PUT returns 403 when user lacks update:Record permission
 * - DELETE soft-deletes the record and returns 204
 * - DELETE returns 404 when record does not exist
 * - DELETE returns 401 when unauthenticated
 * - DELETE returns 403 when user lacks delete:Record permission
 * - CASL action/subject checks for each method
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { VastuRecord } from '@vastu/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, PUT, DELETE, recordStore } from '../route';
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
  return new NextRequest(`http://localhost/api/workspace/records/${recordId}`, {
    method: 'GET',
  });
}

function makePutRequest(recordId: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/records/${recordId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeRawPutRequest(recordId: string, rawBody: string): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/records/${recordId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: rawBody,
  });
}

function makeDeleteRequest(recordId: string): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/records/${recordId}`, {
    method: 'DELETE',
  });
}

function makeParams(recordId: string) {
  return { params: Promise.resolve({ id: recordId }) };
}

/** Seed a record directly into the store for tests that need an existing record. */
function seedRecord(recordId: string, overrides: Partial<VastuRecord> = {}): VastuRecord {
  const now = new Date();
  const record: VastuRecord = {
    id: recordId,
    pageId: 'page-1',
    organizationId: 'org-1',
    fields: { name: 'Test Record', status: 'active' },
    createdBy: 'user-1',
    createdByName: 'Test User',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
  recordStore.set(`org-1:${recordId}`, record);
  return record;
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/workspace/records/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordStore.clear();
  });

  it('returns 200 with record when found', async () => {
    seedRecord('rec-get-200');
    setupAuthSession();

    const response = await GET(makeGetRequest('rec-get-200'), makeParams('rec-get-200'));
    const body = await response.json() as { record: VastuRecord };

    expect(response.status).toBe(200);
    expect(body.record.id).toBe('rec-get-200');
    expect(body.record.fields).toEqual({ name: 'Test Record', status: 'active' });
  });

  it('returns 404 when record does not exist', async () => {
    setupAuthSession();

    const response = await GET(makeGetRequest('nonexistent'), makeParams('nonexistent'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 404 for a soft-deleted record', async () => {
    seedRecord('rec-deleted', { deletedAt: new Date() });
    setupAuthSession();

    const response = await GET(makeGetRequest('rec-deleted'), makeParams('rec-deleted'));
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

  it('checks the correct CASL action and subject', async () => {
    seedRecord('rec-casl-get');
    const ability = buildAbility(true);
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: ability as never,
    });

    await GET(makeGetRequest('rec-casl-get'), makeParams('rec-casl-get'));

    expect(ability.can).toHaveBeenCalledWith('read', 'Record');
  });
});

// ---------------------------------------------------------------------------
// PUT tests
// ---------------------------------------------------------------------------

describe('PUT /api/workspace/records/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordStore.clear();
  });

  it('updates record fields and returns 200 with the updated record', async () => {
    seedRecord('rec-put-200');
    setupAuthSession();

    const response = await PUT(
      makePutRequest('rec-put-200', { fields: { status: 'completed', priority: 'high' } }),
      makeParams('rec-put-200'),
    );
    const body = await response.json() as { record: VastuRecord };

    expect(response.status).toBe(200);
    expect(body.record.fields.status).toBe('completed');
    expect(body.record.fields.priority).toBe('high');
    // Existing fields should be preserved (merged, not replaced)
    expect(body.record.fields.name).toBe('Test Record');
  });

  it('returns 400 for malformed JSON body', async () => {
    setupAuthSession();

    const response = await PUT(
      makeRawPutRequest('any', 'not-valid-json{{'),
      makeParams('any'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 when body has no fields property', async () => {
    seedRecord('rec-no-fields');
    setupAuthSession();

    const response = await PUT(makePutRequest('rec-no-fields', {}), makeParams('rec-no-fields'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('"fields"');
  });

  it('returns 400 when fields is an array instead of an object', async () => {
    seedRecord('rec-fields-array');
    setupAuthSession();

    const response = await PUT(
      makePutRequest('rec-fields-array', { fields: ['value'] }),
      makeParams('rec-fields-array'),
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 when record does not exist', async () => {
    setupAuthSession();

    const response = await PUT(
      makePutRequest('nonexistent', { fields: { status: 'done' } }),
      makeParams('nonexistent'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await PUT(
      makePutRequest('any', { fields: { status: 'done' } }),
      makeParams('any'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks update:Record permission', async () => {
    setupAuthSession(false);

    const response = await PUT(
      makePutRequest('any', { fields: { status: 'done' } }),
      makeParams('any'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('checks the correct CASL action and subject', async () => {
    seedRecord('rec-casl-put');
    const ability = buildAbility(true);
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: ability as never,
    });

    await PUT(
      makePutRequest('rec-casl-put', { fields: { status: 'done' } }),
      makeParams('rec-casl-put'),
    );

    expect(ability.can).toHaveBeenCalledWith('update', 'Record');
  });
});

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------

describe('DELETE /api/workspace/records/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordStore.clear();
  });

  it('soft-deletes the record and returns 204', async () => {
    seedRecord('rec-delete-204');
    setupAuthSession();

    const response = await DELETE(makeDeleteRequest('rec-delete-204'), makeParams('rec-delete-204'));

    expect(response.status).toBe(204);

    // Verify the record is now marked deleted in the store
    const storedRecord = recordStore.get('org-1:rec-delete-204');
    expect(storedRecord?.deletedAt).toBeInstanceOf(Date);
  });

  it('returns 404 when record does not exist', async () => {
    setupAuthSession();

    const response = await DELETE(makeDeleteRequest('nonexistent'), makeParams('nonexistent'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 404 when record is already soft-deleted', async () => {
    seedRecord('rec-already-deleted', { deletedAt: new Date() });
    setupAuthSession();

    const response = await DELETE(
      makeDeleteRequest('rec-already-deleted'),
      makeParams('rec-already-deleted'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await DELETE(makeDeleteRequest('any'), makeParams('any'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks delete:Record permission', async () => {
    setupAuthSession(false);

    const response = await DELETE(makeDeleteRequest('any'), makeParams('any'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('checks the correct CASL action and subject', async () => {
    seedRecord('rec-casl-delete');
    const ability = buildAbility(true);
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: ability as never,
    });

    await DELETE(makeDeleteRequest('rec-casl-delete'), makeParams('rec-casl-delete'));

    expect(ability.can).toHaveBeenCalledWith('delete', 'Record');
  });
});

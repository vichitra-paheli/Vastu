/**
 * Unit tests for GET /api/workspace/records/[id]/history
 *
 * The session helper is mocked so tests don't require a live DB or auth server.
 *
 * Covers:
 * - GET returns entries when found
 * - GET returns empty array when no history exists yet
 * - GET paginates with page/pageSize query parameters
 * - GET returns entries in newest-first order
 * - GET returns 404 for non-existent record
 * - GET returns 404 for soft-deleted record
 * - GET returns 401 when unauthenticated
 * - GET returns 403 when user lacks read:Record permission
 * - CASL action/subject check
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { VastuRecord, RecordHistoryEntry } from '@vastu/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, historyStore } from '../route';
import { recordStore, storeKey } from '../../_stores';
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

function makeGetRequest(recordId: string, query: Record<string, string> = {}): NextRequest {
  const url = new URL(`http://localhost/api/workspace/records/${recordId}/history`);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
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

/** Seed history entries for a record (oldest first). */
function seedHistory(recordId: string, entries: RecordHistoryEntry[]): void {
  historyStore.set(storeKey('org-1', recordId), entries);
}

function makeHistoryEntry(overrides: Partial<RecordHistoryEntry> = {}): RecordHistoryEntry {
  return {
    id: crypto.randomUUID(),
    recordId: 'rec-1',
    action: 'update',
    changes: { status: { before: 'active', after: 'completed' } },
    userId: 'user-1',
    userName: 'Test User',
    timestamp: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/workspace/records/[id]/history', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordStore.clear();
    historyStore.clear();
  });

  it('returns 200 with entries when history exists', async () => {
    seedRecord('rec-hist-200');
    const entry = makeHistoryEntry({ recordId: 'rec-hist-200' });
    seedHistory('rec-hist-200', [entry]);
    setupAuthSession();

    const response = await GET(makeGetRequest('rec-hist-200'), makeParams('rec-hist-200'));
    const body = await response.json() as {
      entries: RecordHistoryEntry[];
      total: number;
      page: number;
      pageSize: number;
    };

    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it('returns 200 with empty entries when no history exists yet', async () => {
    seedRecord('rec-hist-empty');
    setupAuthSession();

    const response = await GET(makeGetRequest('rec-hist-empty'), makeParams('rec-hist-empty'));
    const body = await response.json() as { entries: RecordHistoryEntry[]; total: number };

    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('returns entries in newest-first order', async () => {
    seedRecord('rec-hist-order');
    const older = makeHistoryEntry({
      recordId: 'rec-hist-order',
      timestamp: new Date('2024-01-01T00:00:00Z'),
    });
    const newer = makeHistoryEntry({
      recordId: 'rec-hist-order',
      timestamp: new Date('2024-06-01T00:00:00Z'),
    });
    // Seed in oldest-first order (as the store keeps them)
    seedHistory('rec-hist-order', [older, newer]);
    setupAuthSession();

    const response = await GET(makeGetRequest('rec-hist-order'), makeParams('rec-hist-order'));
    const body = await response.json() as { entries: RecordHistoryEntry[] };

    expect(response.status).toBe(200);
    expect(body.entries[0].id).toBe(newer.id);
    expect(body.entries[1].id).toBe(older.id);
  });

  it('paginates correctly using page and pageSize query parameters', async () => {
    seedRecord('rec-hist-page');
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeHistoryEntry({ recordId: 'rec-hist-page', id: `entry-${i}` }),
    );
    seedHistory('rec-hist-page', entries);
    setupAuthSession();

    const response = await GET(
      makeGetRequest('rec-hist-page', { page: '2', pageSize: '2' }),
      makeParams('rec-hist-page'),
    );
    const body = await response.json() as {
      entries: RecordHistoryEntry[];
      total: number;
      page: number;
      pageSize: number;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(5);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    // Page 2 of 2-per-page from 5 newest-first = entries at indexes [2,3] of reversed list
    expect(body.entries).toHaveLength(2);
  });

  it('returns 404 when record does not exist', async () => {
    setupAuthSession();

    const response = await GET(makeGetRequest('nonexistent'), makeParams('nonexistent'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Record not found');
  });

  it('returns 404 for a soft-deleted record', async () => {
    seedRecord('rec-hist-deleted', { deletedAt: new Date() });
    setupAuthSession();

    const response = await GET(
      makeGetRequest('rec-hist-deleted'),
      makeParams('rec-hist-deleted'),
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

  it('checks the correct CASL action and subject', async () => {
    seedRecord('rec-hist-casl');
    const ability = buildAbility(true);
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: ability as never,
    });

    await GET(makeGetRequest('rec-hist-casl'), makeParams('rec-hist-casl'));

    expect(ability.can).toHaveBeenCalledWith('read', 'Record');
  });
});

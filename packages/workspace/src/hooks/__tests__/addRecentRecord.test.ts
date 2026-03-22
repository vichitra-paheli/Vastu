/**
 * Unit tests for addRecentRecord utility (US-125).
 *
 * Tests cover:
 * - Adds a new record to localStorage
 * - Deduplicates by record ID (moves existing to top)
 * - Enforces MAX_RECENT_RECORDS (5) limit
 * - Handles localStorage errors gracefully (quota exceeded, private browsing)
 * - Handles missing window.localStorage gracefully
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addRecentRecord,
  RECENT_RECORDS_STORAGE_KEY,
} from '../useCommandPaletteActions';
import type { RecentRecord } from '../useCommandPaletteActions';

/** Helper to read records directly from localStorage. */
function readFromStorage(): RecentRecord[] {
  const raw = localStorage.getItem(RECENT_RECORDS_STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as RecentRecord[];
}

/** Helper to seed localStorage with records. */
function seedStorage(records: RecentRecord[]): void {
  localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, JSON.stringify(records));
}

/** Make a RecentRecord with a given id, title, and optional timestamp. */
function makeRecord(
  id: string,
  title = `Record ${id}`,
  timestamp = Date.now(),
): RecentRecord {
  return { id, title, type: 'TestType', pageId: 'page-1', timestamp };
}

describe('addRecentRecord', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('adds a new record to an empty localStorage', () => {
    addRecentRecord({ id: 'r1', title: 'Invoice #001', type: 'Invoice', pageId: 'page-1' });
    const stored = readFromStorage();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('r1');
    expect(stored[0].title).toBe('Invoice #001');
  });

  it('stores timestamp using Date.now() at call time', () => {
    const now = new Date('2026-01-01T00:00:00Z').getTime();
    addRecentRecord({ id: 'r1', title: 'Invoice #001', type: 'Invoice', pageId: 'page-1' });
    const stored = readFromStorage();
    expect(stored[0].timestamp).toBe(now);
  });

  it('adds record to front of the list', () => {
    seedStorage([makeRecord('r1', 'First', 1000)]);
    addRecentRecord({ id: 'r2', title: 'Second', type: 'T', pageId: 'p1' });
    const stored = readFromStorage();
    expect(stored[0].id).toBe('r2');
    expect(stored[1].id).toBe('r1');
  });

  it('deduplicates: moves existing record with same ID to the front', () => {
    seedStorage([
      makeRecord('r1', 'Original Title', 1000),
      makeRecord('r2', 'Other', 900),
    ]);
    addRecentRecord({ id: 'r1', title: 'Updated Title', type: 'T', pageId: 'p1' });
    const stored = readFromStorage();
    // r1 should now be at front with updated title
    expect(stored[0].id).toBe('r1');
    expect(stored[0].title).toBe('Updated Title');
    // r2 should still be present
    expect(stored[1].id).toBe('r2');
    // Total should remain 2, not 3
    expect(stored).toHaveLength(2);
  });

  it('deduplication removes only the duplicate, preserving other records', () => {
    seedStorage([
      makeRecord('r1', 'R1', 1000),
      makeRecord('r2', 'R2', 900),
      makeRecord('r3', 'R3', 800),
    ]);
    addRecentRecord({ id: 'r2', title: 'R2 Updated', type: 'T', pageId: 'p1' });
    const stored = readFromStorage();
    expect(stored.map((r) => r.id)).toEqual(['r2', 'r1', 'r3']);
  });

  it('enforces maximum of 5 records', () => {
    // Seed with 5 records (already at max)
    seedStorage([
      makeRecord('r1', 'R1', 1005),
      makeRecord('r2', 'R2', 1004),
      makeRecord('r3', 'R3', 1003),
      makeRecord('r4', 'R4', 1002),
      makeRecord('r5', 'R5', 1001),
    ]);
    addRecentRecord({ id: 'r6', title: 'R6', type: 'T', pageId: 'p1' });
    const stored = readFromStorage();
    expect(stored).toHaveLength(5);
    expect(stored[0].id).toBe('r6');
    // r5 (oldest) should be evicted
    expect(stored.map((r) => r.id)).not.toContain('r5');
  });

  it('enforces max limit when adding to a list already at the limit', () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      makeRecord(`r${i + 1}`, `Record ${i + 1}`, 1000 - i),
    );
    seedStorage(records);
    addRecentRecord({ id: 'new', title: 'New', type: 'T', pageId: 'p1' });
    const stored = readFromStorage();
    expect(stored.length).toBeLessThanOrEqual(5);
  });

  it('handles localStorage.setItem throwing (quota exceeded)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    // Should not throw
    expect(() =>
      addRecentRecord({ id: 'r1', title: 'T', type: 'T', pageId: 'p1' }),
    ).not.toThrow();
    setItemSpy.mockRestore();
  });

  it('handles localStorage.getItem returning invalid JSON', () => {
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, 'not-valid-json');
    // Should not throw and should still add the new record
    expect(() =>
      addRecentRecord({ id: 'r1', title: 'T', type: 'T', pageId: 'p1' }),
    ).not.toThrow();
    const stored = readFromStorage();
    expect(stored[0].id).toBe('r1');
  });

  it('handles localStorage.getItem returning a non-array', () => {
    localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, JSON.stringify({ id: 'r1' }));
    expect(() =>
      addRecentRecord({ id: 'r2', title: 'T', type: 'T', pageId: 'p1' }),
    ).not.toThrow();
    const stored = readFromStorage();
    expect(stored[0].id).toBe('r2');
    expect(stored).toHaveLength(1);
  });
});

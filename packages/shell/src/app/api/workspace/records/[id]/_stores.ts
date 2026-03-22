/**
 * Shared in-memory stores for the record API routes.
 *
 * All three route modules (record, history, notes) import from this file so
 * that mutation routes (PUT, DELETE, notes POST) can write audit entries to
 * the history store without creating circular imports.
 *
 * This module is intentionally process-local and ephemeral.
 * It will be replaced by Prisma persistence once the database migrations land.
 *
 * Stores are keyed by `{organizationId}:{recordId}`.
 */

import type { VastuRecord, RecordHistoryEntry, RecordNote } from '@vastu/shared';

/** In-memory record store. Value: VastuRecord. */
export const recordStore = new Map<string, VastuRecord>();

/**
 * In-memory history store.
 * Value: ordered array of history entries (oldest first).
 * The GET handler returns entries in newest-first order.
 */
export const historyStore = new Map<string, RecordHistoryEntry[]>();

/** In-memory notes store. Value: ordered array of notes (oldest first). */
export const notesStore = new Map<string, RecordNote[]>();

/** Build a stable store key scoped to the organization. */
export function storeKey(organizationId: string, recordId: string): string {
  return `${organizationId}:${recordId}`;
}

/**
 * Append a history entry for a record using the pre-built store key.
 * Route handlers call this after every successful mutation.
 */
export function appendHistoryEntry(key: string, entry: RecordHistoryEntry): void {
  const existing = historyStore.get(key) ?? [];
  historyStore.set(key, [...existing, entry]);
}

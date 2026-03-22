/**
 * Record types — represents a data record within a workspace page.
 *
 * These types are intentionally minimal for Phase 1B.
 * Full Prisma-backed fields will be added once the Record migration lands.
 *
 * The main record type is named VastuRecord to avoid shadowing TypeScript's
 * built-in Record<K, V> utility type.
 *
 * TODO: Replace placeholder `fields` with a proper Prisma model once
 * the Record table migration is available.
 */

/** Alias to avoid shadowing the built-in TypeScript Record utility type. */
type FieldMap = { [key: string]: unknown };

/**
 * A single data record within a page/view.
 * The `fields` map holds the dynamic column values for the record.
 *
 * Named VastuRecord (not Record) to avoid conflicting with TypeScript's
 * built-in Record<K, V> utility type.
 */
export interface VastuRecord {
  /** Surrogate primary key. */
  id: string;
  /** FK to the page this record belongs to. */
  pageId: string;
  /** FK to the owning organization. */
  organizationId: string;
  /** Dynamic field values keyed by field name. */
  fields: FieldMap;
  /** User ID of the creator. */
  createdBy: string;
  /** Display name of the creator. */
  createdByName: string;
  /** Timestamp when the record was created. */
  createdAt: Date;
  /** Timestamp when the record was last updated. */
  updatedAt: Date;
  /** Soft-delete timestamp; null when not deleted. */
  deletedAt: Date | null;
}

/**
 * A single entry in the history log for a record.
 * Tracks what changed, who changed it, and when.
 */
export interface RecordHistoryEntry {
  /** Surrogate primary key. */
  id: string;
  /** FK to the record this entry belongs to. */
  recordId: string;
  /** The CRUD action performed: 'create' | 'update' | 'delete'. */
  action: 'create' | 'update' | 'delete';
  /** Field-level diff stored as JSON. Shape: `{ field: { before, after } }`. */
  changes: FieldMap;
  /** User ID of the actor. */
  userId: string;
  /** Display name of the actor. */
  userName: string;
  /** Timestamp when the change occurred. */
  timestamp: Date;
}

/**
 * A note attached to a record by a user.
 */
export interface RecordNote {
  /** Surrogate primary key. */
  id: string;
  /** FK to the record this note belongs to. */
  recordId: string;
  /** Plain-text or markdown content of the note. */
  content: string;
  /** User ID of the note author. */
  userId: string;
  /** Display name of the note author. */
  userName: string;
  /** Timestamp when the note was created. */
  createdAt: Date;
  /** Timestamp when the note was last updated. */
  updatedAt: Date;
}

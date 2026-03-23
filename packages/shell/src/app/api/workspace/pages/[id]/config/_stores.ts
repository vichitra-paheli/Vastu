/**
 * In-memory stores for page configuration API.
 *
 * Extracted from route.ts because Next.js App Router route files may only
 * export HTTP method handlers (GET, POST, PUT, DELETE, etc.).
 *
 * TODO: Replace with Prisma once the PageConfiguration migration lands.
 */

import type { PageConfiguration, AuditEvent } from '@vastu/shared';

/**
 * In-memory config store.
 * Key: `{organizationId}:{pageId}`
 * Value: PageConfiguration record.
 */
export const configStore = new Map<string, PageConfiguration>();

/**
 * In-memory audit event store for page config saves.
 * Key: `{organizationId}:{pageId}`
 * Value: ordered array of audit events (oldest first).
 *
 * TODO: Replace with Prisma AuditEvent model once the migration lands.
 */
export const configAuditStore = new Map<string, AuditEvent[]>();

/** Build a stable store key scoped to the organization. */
export function storeKey(organizationId: string, pageId: string): string {
  return `${organizationId}:${pageId}`;
}

/**
 * Append an audit event for a config save.
 */
export function appendConfigAuditEvent(key: string, event: AuditEvent): void {
  const existing = configAuditStore.get(key) ?? [];
  configAuditStore.set(key, [...existing, event]);
}

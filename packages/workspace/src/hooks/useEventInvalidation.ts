'use client';

/**
 * useEventInvalidation — invalidates TanStack Query caches on SSE events.
 *
 * Listens for workspace events and triggers targeted cache invalidations so
 * that affected queries refetch without requiring a full page reload.
 *
 * Invalidation strategy:
 * - record.created / record.updated / record.deleted
 *     → invalidate all queries with key prefix ['workspace', 'data', table]
 * - view.saved
 *     → invalidate all view-related queries ['workspace', 'views']
 * - config.changed
 *     → invalidate all page configuration queries ['workspace', 'pages']
 *
 * This hook should be mounted once inside WorkspaceProviders so it runs
 * throughout the lifetime of the workspace session.
 *
 * Implements US-207 AC-6 (dashboard auto-refresh via TanStack Query invalidation).
 */

import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceEvent } from '@vastu/shared';
import { useWorkspaceEvents } from './useWorkspaceEvents';

export function useEventInvalidation(): void {
  const queryClient = useQueryClient();

  useWorkspaceEvents((event: WorkspaceEvent) => {
    switch (event.type) {
      case 'record.created':
      case 'record.updated':
      case 'record.deleted':
        // Invalidate all queries that depend on this table.
        void queryClient.invalidateQueries({
          queryKey: ['workspace', 'data', event.table],
        });
        break;

      case 'view.saved':
        // Invalidate view queries (view list, view config).
        void queryClient.invalidateQueries({
          queryKey: ['workspace', 'views'],
        });
        break;

      case 'config.changed':
        // Invalidate page configuration queries.
        void queryClient.invalidateQueries({
          queryKey: ['workspace', 'pages'],
        });
        break;

      default:
        // Unknown event type — no action needed.
        break;
    }
  });
}

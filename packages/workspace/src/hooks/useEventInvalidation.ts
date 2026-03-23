'use client';

/**
 * useEventInvalidation — bridges the SSE event bus and TanStack Query.
 *
 * Subscribes to workspace events via useWorkspaceEvents and invalidates
 * relevant query cache keys when record-mutation or view/config events arrive.
 *
 * Cache invalidation strategy (per event type):
 *
 *   record.created / record.updated / record.deleted
 *     → invalidate query key: ['records', event.table]
 *       (catches all queries loading data for that Prisma model)
 *     → if event.recordId present, also invalidate ['record', event.table, event.recordId]
 *       (catches detail-view queries for that specific record)
 *
 *   view.saved
 *     → invalidate query key: ['views']
 *       (catches list-of-views queries on any page)
 *
 *   config.changed
 *     → invalidate query key: ['pages']
 *       (catches page-configuration queries)
 *
 * This hook is intentionally side-effect-only — it returns nothing.
 * Mount it once near the top of the workspace provider tree via
 * WorkspaceProviders, NOT per-component.
 *
 * Implements US-207 AC-6, AC-7, AC-8.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceEvents } from './useWorkspaceEvents';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Side-effect hook that invalidates TanStack Query caches in response to
 * SSE workspace events.  Mount once inside a QueryClientProvider.
 */
export function useEventInvalidation(): void {
  const queryClient = useQueryClient();

  useWorkspaceEvents((event: WorkspaceEvent) => {
    switch (event.type) {
      case 'record.created':
      case 'record.updated':
      case 'record.deleted': {
        if (event.table) {
          // Invalidate all queries for this table (list views, aggregates, etc.)
          void queryClient.invalidateQueries({ queryKey: ['records', event.table] });

          // Invalidate the specific record detail query if we know its ID.
          if (event.recordId) {
            void queryClient.invalidateQueries({
              queryKey: ['record', event.table, event.recordId],
            });
          }
        }
        break;
      }

      case 'view.saved': {
        void queryClient.invalidateQueries({ queryKey: ['views'] });
        break;
      }

      case 'config.changed': {
        void queryClient.invalidateQueries({ queryKey: ['pages'] });
        break;
      }

      default: {
        // Unknown event type — no-op (defensive; TS exhausts the union above).
        break;
      }
    }
  });
}

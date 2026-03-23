'use client';

/**
 * useEventInvalidation — bridges the SSE event bus and TanStack Query.
 *
 * Subscribes to workspace events via the shared SSEProvider context and
 * invalidates relevant query cache keys when record-mutation or
 * view/config events arrive.
 *
 * Cache invalidation strategy (per event type):
 *
 *   record.created / record.updated / record.deleted
 *     → invalidate query key: ['records', event.table]
 *     → if event.recordId present, also invalidate ['record', event.table, event.recordId]
 *
 *   view.saved
 *     → invalidate query key: ['views']
 *
 *   config.changed
 *     → invalidate query key: ['pages']
 *
 * This hook is intentionally side-effect-only — it returns nothing.
 * Mount it once near the top of the workspace provider tree via
 * WorkspaceProviders, NOT per-component.
 *
 * Implements US-207 AC-6, AC-7, AC-8.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSSEContext } from '../providers/SSEProvider';
import type { WorkspaceEvent } from '@vastu/shared';

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Side-effect hook that invalidates TanStack Query caches in response to
 * SSE workspace events.  Mount once inside an SSEProvider + QueryClientProvider.
 */
export function useEventInvalidation(): void {
  const queryClient = useQueryClient();
  const { subscribe } = useSSEContext();

  useEffect(() => {
    const unsubscribe = subscribe((event: WorkspaceEvent) => {
      switch (event.type) {
        case 'record.created':
        case 'record.updated':
        case 'record.deleted': {
          if (event.table) {
            void queryClient.invalidateQueries({ queryKey: ['records', event.table] });
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

        default:
          break;
      }
    });

    return unsubscribe;
  }, [subscribe, queryClient]);
}

'use client';

/**
 * useEventInvalidation — invalidates TanStack Query caches on SSE events.
 *
 * Listens for workspace events via the shared SSEContext (established by
 * SSEProvider) and triggers targeted cache invalidations so that affected
 * queries refetch without requiring a full page reload.
 *
 * Note: This hook consumes from SSEContext rather than calling
 * useWorkspaceEvents directly. This ensures a single SSE connection is
 * shared across all consumers (SSEStatusIndicator, useEventInvalidation,
 * and any future consumers).
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

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WorkspaceEvent } from '@vastu/shared';
import { useSSEContext } from '../providers/SSEProvider';

export function useEventInvalidation(): void {
  const queryClient = useQueryClient();
  const { subscribe } = useSSEContext();

  useEffect(() => {
    return subscribe((event: WorkspaceEvent) => {
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
    // subscribe is stable (useCallback with no deps in SSEProvider).
    // queryClient is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

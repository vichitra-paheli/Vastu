'use client';

/**
 * WorkspaceProviders — wraps the workspace with all required client-side providers.
 *
 * Provider order (outer → inner):
 * 1. QueryClientProvider — TanStack Query for server data fetching and caching.
 * 2. SSEProvider — establishes a single SSE connection for the workspace session
 *    and exposes event subscriptions via SSEContext. Placed inside
 *    QueryClientProvider so that consumers (e.g. useEventInvalidation) can
 *    call useQueryClient() from within event handlers.
 *
 * SSE event bus wiring:
 *   EventInvalidationWatcher subscribes to the shared SSEContext and triggers
 *   TanStack Query cache invalidations when relevant workspace events arrive.
 *   Because SSEProvider holds the single EventSource, no duplicate connections
 *   are created regardless of how many components read from SSEContext.
 *
 * Note: MantineProvider is intentionally excluded here. The root layout in
 * packages/shell already wraps the entire app (including /workspace) with
 * MantineProvider + vastuTheme. Adding a second MantineProvider would break
 * theme inheritance and cause duplicate context errors.
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SSEProvider } from './SSEProvider';
import { useEventInvalidation } from '../hooks/useEventInvalidation';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 60 seconds before considering it stale
        staleTime: 60_000,
        // Retry failed requests up to 2 times before showing an error
        retry: 2,
      },
    },
  });
}

interface WorkspaceProvidersProps {
  children: React.ReactNode;
}

/**
 * Inner component that must live inside both QueryClientProvider and
 * SSEProvider so that useEventInvalidation can call both useQueryClient()
 * and useSSEContext().
 */
function EventInvalidationWatcher() {
  useEventInvalidation();
  return null;
}

export function WorkspaceProviders({ children }: WorkspaceProvidersProps) {
  // Create a stable QueryClient instance per component mount.
  // Using useState ensures we don't recreate the client on every render.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/*
       * SSEProvider establishes exactly one SSE connection for the workspace
       * session. All components that need events (useEventInvalidation,
       * SSEStatusIndicator via sseConnectionStore) share this connection.
       */}
      <SSEProvider>
        {/* Wire SSE events to TanStack Query cache invalidation (US-207). */}
        <EventInvalidationWatcher />
        {children}
      </SSEProvider>
    </QueryClientProvider>
  );
}

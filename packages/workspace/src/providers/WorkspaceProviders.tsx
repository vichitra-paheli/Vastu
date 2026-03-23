'use client';

/**
 * WorkspaceProviders — wraps the workspace with all required client-side providers.
 *
 * Provides:
 * - QueryClientProvider: TanStack Query for server data fetching and caching.
 * - SSEProvider: shared SSE connection for real-time events.
 * - useEventInvalidation: bridges SSE events → TanStack Query cache invalidation.
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
 * Inner component that mounts inside SSEProvider + QueryClientProvider so that
 * useEventInvalidation can call both useQueryClient() and useSSEContext().
 */
function WorkspaceInner({ children }: { children: React.ReactNode }) {
  // Mount the SSE → TanStack Query invalidation bridge once per workspace.
  useEventInvalidation();
  return <>{children}</>;
}

export function WorkspaceProviders({ children }: WorkspaceProvidersProps) {
  // Create a stable QueryClient instance per component mount.
  // Using useState ensures we don't recreate the client on every render.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SSEProvider>
        <WorkspaceInner>{children}</WorkspaceInner>
      </SSEProvider>
    </QueryClientProvider>
  );
}

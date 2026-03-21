/**
 * TestProviders — wraps children with all providers needed for workspace tests.
 *
 * Provides:
 * - MantineProvider with a bare theme for design token support
 * - QueryClientProvider with a fresh QueryClient (no retries in tests)
 *
 * Usage:
 *   render(<MyComponent />, { wrapper: TestProviders })
 */

import React from 'react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests so failures surface immediately
        retry: false,
        // Disable stale time so queries re-fetch predictably
        staleTime: 0,
      },
    },
  });
}

interface TestProvidersProps {
  children: React.ReactNode;
}

export function TestProviders({ children }: TestProvidersProps) {
  const [queryClient] = React.useState(() => createTestQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

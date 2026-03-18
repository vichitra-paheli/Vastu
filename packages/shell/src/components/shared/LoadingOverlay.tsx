'use client';

/**
 * LoadingOverlay — Overlay for refetch/stale content loading states.
 * Patterns Library §6.3 — Transition rules (refetch behaviour).
 *
 * Keeps stale content visible with a subtle overlay while new data loads.
 * Never use full skeleton during refetch — layout is already known.
 */

import { Box, LoadingOverlay as MantineLoadingOverlay } from '@mantine/core';
import type { ReactNode } from 'react';

export interface LoadingOverlayProps {
  loading: boolean;
  children: ReactNode;
}

export function LoadingOverlay({ loading, children }: LoadingOverlayProps) {
  return (
    <Box pos="relative">
      <MantineLoadingOverlay
        visible={loading}
        overlayProps={{ blur: 1, backgroundOpacity: 0.3 }}
        loaderProps={{ size: 'sm' }}
      />
      {children}
    </Box>
  );
}

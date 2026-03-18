/**
 * PageSkeleton — Generic page-level skeleton for the shell layout.
 * Patterns Library §6 — Loading state choreography.
 *
 * Used for first-load states before data is available.
 * Shows skeleton rows matching the general page layout.
 */

import { Group, Skeleton, Stack } from '@mantine/core';

export interface PageSkeletonProps {
  /** Number of content rows to show */
  rows?: number;
  /** Show a header skeleton */
  showHeader?: boolean;
  /** Show action buttons skeleton */
  showActions?: boolean;
}

export function PageSkeleton({
  rows = 5,
  showHeader = true,
  showActions = true,
}: PageSkeletonProps) {
  return (
    <Stack gap="md">
      {showHeader && (
        <Group justify="space-between">
          <Skeleton height={28} width={200} />
          {showActions && <Skeleton height={36} width={120} radius="md" />}
        </Group>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={20} radius="sm" />
      ))}
    </Stack>
  );
}

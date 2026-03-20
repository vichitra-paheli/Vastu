/**
 * TableSkeleton — Skeleton for table views.
 * Patterns Library §6 — Loading state choreography.
 *
 * Renders a header row and data rows with alternating column widths
 * to suggest varying data lengths.
 */

import { Group, Skeleton, Stack } from '@mantine/core';

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 4, rows = 5 }: TableSkeletonProps) {
  return (
    <Stack gap="xs">
      {/* Header row */}
      <Group gap="md">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} height={16} style={{ flex: 1 }} radius="sm" />
        ))}
      </Group>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <Group key={`row-${rowIdx}`} gap="md">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} height={14} style={{ flex: 1 }} radius="sm" />
          ))}
        </Group>
      ))}
    </Stack>
  );
}

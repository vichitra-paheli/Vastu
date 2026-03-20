/**
 * FormSkeleton — Skeleton for form pages.
 * Patterns Library §6 — Loading state choreography.
 *
 * Used for profile, organization, and other form-based settings pages.
 * Each field shows a label skeleton above an input skeleton.
 */

import { Skeleton, Stack } from '@mantine/core';

export interface FormSkeletonProps {
  fields?: number;
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <Stack gap="lg">
      {Array.from({ length: fields }).map((_, i) => (
        <Stack key={i} gap={4}>
          <Skeleton height={14} width={80} radius="sm" />
          <Skeleton height={36} radius="md" />
        </Stack>
      ))}
      <Skeleton height={36} width={100} radius="md" />
    </Stack>
  );
}

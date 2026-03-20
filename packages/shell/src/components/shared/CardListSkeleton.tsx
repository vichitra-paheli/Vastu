/**
 * CardListSkeleton — Skeleton for card list views.
 * Patterns Library §6 — Loading state choreography.
 *
 * Used for DB connections, roles, tenants, and other card-based list pages.
 */

import { Card, Group, Skeleton, Stack } from '@mantine/core';

export interface CardListSkeletonProps {
  cards?: number;
}

export function CardListSkeleton({ cards = 3 }: CardListSkeletonProps) {
  return (
    <Stack gap="md">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i} padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Skeleton height={20} width={180} radius="sm" />
            <Skeleton height={24} width={60} radius="xl" />
          </Group>
          <Skeleton height={14} width="60%" radius="sm" mb="xs" />
          <Skeleton height={14} width="40%" radius="sm" />
        </Card>
      ))}
    </Stack>
  );
}

'use client';

/**
 * TemplateSkeleton — shared loading skeleton for all template types.
 *
 * Renders a layout-appropriate skeleton while the template config or data loads.
 * Each variant matches the expected visual shape of its template so the page
 * feels stable during load (skeleton → content pattern from design principles).
 *
 * All spacing and color via --v-* CSS custom properties.
 * Implements VASTU-1B-INFRA.
 */

import React from 'react';
import { Skeleton, Stack, Group, SimpleGrid } from '@mantine/core';
import type { TemplateType } from './types';
import { t } from '../lib/i18n';

export interface TemplateSkeletonProps {
  /** Controls which skeleton layout is rendered. */
  variant: TemplateType;
}

// ── Individual skeleton layouts ──────────────────────────────────────────────

function TableListingSkeleton() {
  return (
    <Stack
      gap="xs"
      p="md"
      aria-label={t('template.skeleton.loading')}
      aria-busy="true"
      role="status"
    >
      {/* Header row */}
      <Group gap="sm" mb="xs">
        <Skeleton height={32} width={120} radius="sm" aria-label={t('template.skeleton.tableHeader')} />
        <Skeleton height={32} width={80} radius="sm" />
        <Skeleton height={32} width={100} radius="sm" />
      </Group>
      {/* Table rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton
          key={i}
          height={40}
          radius="sm"
          aria-label={t('template.skeleton.tableRows')}
        />
      ))}
    </Stack>
  );
}

function DashboardSkeleton() {
  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, lg: 3 }}
      spacing="md"
      p="md"
      aria-label={t('template.skeleton.loading')}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton
          key={i}
          height={160}
          radius="md"
          aria-label={t('template.skeleton.dashboardCards')}
        />
      ))}
    </SimpleGrid>
  );
}

function DetailSkeleton() {
  return (
    <Stack
      gap="md"
      p="md"
      aria-label={t('template.skeleton.loading')}
      aria-busy="true"
      role="status"
    >
      {/* Header block */}
      <Group gap="md">
        <Skeleton height={48} width={48} radius="md" aria-label={t('template.skeleton.detailHeader')} />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Skeleton height={20} width="40%" radius="sm" />
          <Skeleton height={14} width="25%" radius="sm" />
        </Stack>
      </Group>
      {/* Tab bar */}
      <Group gap="xs" aria-label={t('template.skeleton.detailTabs')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={32} width={80} radius="sm" />
        ))}
      </Group>
      {/* Content area */}
      <Skeleton height={280} radius="md" />
    </Stack>
  );
}

function FormSkeleton() {
  return (
    <Stack
      gap="lg"
      p="md"
      maw={640}
      aria-label={t('template.skeleton.loading')}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Stack key={i} gap="xs">
          <Skeleton height={14} width={100} radius="sm" aria-label={t('template.skeleton.formFields')} />
          <Skeleton height={36} radius="sm" />
        </Stack>
      ))}
      {/* Submit button placeholder */}
      <Skeleton height={36} width={120} radius="sm" />
    </Stack>
  );
}

function TimelineSkeleton() {
  return (
    <Stack
      gap="md"
      p="md"
      aria-label={t('template.skeleton.loading')}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Group key={i} gap="md" align="flex-start">
          <Skeleton height={32} width={32} radius="xl" aria-label={t('template.skeleton.timelineItems')} />
          <Stack gap="xs" style={{ flex: 1 }}>
            <Skeleton height={14} width="60%" radius="sm" />
            <Skeleton height={12} width="30%" radius="sm" />
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

/**
 * Renders a skeleton layout appropriate for the given template variant.
 * Mount this while config is loading (loading === true from useTemplateConfig).
 */
export function TemplateSkeleton({ variant }: TemplateSkeletonProps) {
  switch (variant) {
    case 'table-listing':
    case 'data-explorer':
      return <TableListingSkeleton />;

    case 'summary-dashboard':
    case 'dashboard':
      return <DashboardSkeleton />;

    case 'multi-tab-detail':
      return <DetailSkeleton />;

    case 'form-page':
      return <FormSkeleton />;

    case 'timeline-activity':
      return <TimelineSkeleton />;

    default: {
      // Exhaustiveness check — TypeScript will error if a new TemplateType is
      // added without updating this switch.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustive: never = variant;
      return <TableListingSkeleton />;
    }
  }
}

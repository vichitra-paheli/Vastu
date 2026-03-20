/**
 * Admin — Audit Log page.
 * US-024: Audit log (admin-only, CASL-gated via parent layout).
 *
 * Server component: fetches user list and distinct resource types for
 * filter dropdowns, then renders AuditLogTable (client component).
 *
 * The actual event rows are fetched client-side (AuditLogTable) so filters
 * and pagination work without full page refreshes.
 */

import type { Metadata } from 'next';
import { Stack, Text, Title } from '@mantine/core';
import { prisma } from '@vastu/shared/prisma';
import { getSessionWithAbility } from '@/lib/session';
import { notFound } from 'next/navigation';
import { isAdmin } from '@vastu/shared/permissions';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Audit Log — Vastu',
  description: 'Immutable audit trail of all user actions.',
};

export default async function AuditLogPage() {
  const { session, ability } = await getSessionWithAbility();

  if (!session || !ability || !isAdmin(ability)) {
    notFound();
  }

  const organizationId = session.user.organizationId;

  // Fetch users for the user filter dropdown
  const users = await prisma.user.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  // Fetch distinct resource types observed in this org's audit log
  const resourceTypeRows = await prisma.auditEvent.findMany({
    where: { organizationId },
    select: { resourceType: true },
    distinct: ['resourceType'],
    orderBy: { resourceType: 'asc' },
  });

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.email})`,
  }));

  const resourceTypeOptions = resourceTypeRows.map((r) => r.resourceType);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={3} style={{ color: 'var(--v-text-primary)' }}>
          {t('auditLog.title')}
        </Title>
        <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
          {t('auditLog.description')}
        </Text>
      </Stack>

      <AuditLogTable
        userOptions={userOptions}
        resourceTypeOptions={resourceTypeOptions}
      />
    </Stack>
  );
}

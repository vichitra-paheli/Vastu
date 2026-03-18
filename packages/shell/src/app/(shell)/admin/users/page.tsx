/**
 * Admin — Users page.
 *
 * Server component: fetches the list of roles for the organization so the
 * invite modal and edit drawer have them ready without a secondary round-trip.
 *
 * Renders UserList (client component) with pre-loaded role options.
 *
 * CASL gate: handled by the parent admin layout — only admins reach this page.
 */

import type { Metadata } from 'next';
import { Stack, Title } from '@mantine/core';
import { prisma } from '@vastu/shared/prisma';
import { requireSession } from '../../../../lib/session';
import { UserList } from '../../../../components/admin/UserList';
import { t } from '../../../../lib/i18n';

export const metadata: Metadata = {
  title: t('users.pageTitle'),
};

export default async function AdminUsersPage() {
  const session = await requireSession();

  // Fetch the available roles for this organization to pass to the client
  // components (invite modal, edit drawer) without an extra fetch.
  const roles = await prisma.role.findMany({
    where: { organizationId: session.user.organizationId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  return (
    <Stack gap="lg">
      <Title order={2} fz="var(--v-text-xl)" fw={500} style={{ color: 'var(--v-text-primary)' }}>
        {t('users.heading')}
      </Title>

      <UserList roles={roleOptions} />
    </Stack>
  );
}

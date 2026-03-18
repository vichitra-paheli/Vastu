/**
 * Settings — Organization page.
 * US-015 AC-1: /settings/organization — admin-only, CASL-gated.
 *
 * Server component. Loads org data from Prisma, checks admin permission
 * via CASL ability, then renders OrganizationForm.
 *
 * Loading state: skeleton → content | error (per patterns library §6).
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Stack, Text, Title } from '@mantine/core';
import { prisma } from '@vastu/shared/prisma';
import { isAdmin } from '@vastu/shared/permissions';
import { requireSessionWithAbility } from '../../../../lib/session';
import { t } from '../../../../lib/i18n';
import { OrganizationForm } from '../../../../components/settings/OrganizationForm';

export const metadata: Metadata = {
  title: 'Organization — Vastu',
  description: 'Manage your organization details, logo, and workspace settings',
};

export default async function OrganizationPage() {
  // Auth + permission check
  const { session, ability } = await requireSessionWithAbility().catch(() => {
    redirect('/login');
    // Unreachable but satisfies TypeScript
    return { session: null as never, ability: null as never };
  });

  if (!isAdmin(ability)) {
    // Non-admin users are redirected to profile — the side nav hides this link
    // for them, but direct URL access must also be blocked.
    redirect('/settings/profile');
  }

  // Load the organization for this user's org
  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  if (!organization) {
    // Highly unlikely but guard against it
    redirect('/login');
  }

  return (
    <Stack gap="xl">
      <Stack gap={4}>
        <Title
          order={2}
          fz="var(--v-text-xl)"
          fw={500}
          c="var(--v-text-primary)"
        >
          {t('org.title')}
        </Title>
        <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
          {t('org.subtitle')}
        </Text>
      </Stack>

      <OrganizationForm organization={organization} />
    </Stack>
  );
}

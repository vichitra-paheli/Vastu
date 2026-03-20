/**
 * Settings — Profile page.
 *
 * Server component: loads the current user's profile data from the database
 * using the session userId, then renders the ProfileForm client component.
 *
 * Loading state: FormSkeleton shown via Suspense (or directly via skeleton).
 * Error state: redirects to login if the session is missing.
 *
 * MCP tool equivalent: get_user_profile() / update_user_profile()
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Stack, Text } from '@mantine/core';
import { prisma } from '@vastu/shared/prisma';
import { requireSession } from '@/lib/session';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { t } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Profile — Vastu',
  description: 'Manage your profile information and security settings',
};

export default async function ProfilePage() {
  const session = await requireSession().catch(() => {
    redirect('/login');
    // Unreachable — redirect() throws. Satisfies TypeScript.
    return null as never;
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      language: true,
      timezone: true,
      mfaEnabled: true,
      organizationId: true,
      // Detect SSO users: they have at least one linked Account record.
      accounts: {
        select: { provider: true },
        take: 1,
      },
    },
  });

  if (!user) {
    // User record was deleted after session creation.
    redirect('/login');
  }

  // SSO users have an "account" linked from an external provider (keycloak).
  // For SSO users the email field is read-only.
  const isSsoUser = user.accounts.length > 0;

  return (
    <Stack gap="xl">
      <Text
        fw={500}
        fz="var(--v-text-xl)"
        c="var(--v-text-primary)"
        component="h1"
        style={{ margin: 0 }}
      >
        {t('profile.title')}
      </Text>

      <ProfileForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          language: user.language,
          timezone: user.timezone,
          mfaEnabled: user.mfaEnabled,
          organizationId: user.organizationId,
        }}
        isSsoUser={isSsoUser}
      />
    </Stack>
  );
}

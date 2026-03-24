'use client';

/**
 * Login page for demo-f1.
 *
 * Simple sign-in page that initiates Keycloak SSO.
 * For a full-featured login form, use the shell's LoginForm component.
 */

import { Button, Stack, Text, Title } from '@mantine/core';
import { signIn } from 'next-auth/react';
import { t } from '@/lib/i18n';

export default function LoginPage() {
  return (
    <Stack align="center" gap="md" p="xl">
      <Title order={2} fw={500}>
        {t('login.title')}
      </Title>
      <Text c="dimmed" size="sm">
        {t('login.subtitle')}
      </Text>
      <Button
        onClick={() => void signIn('keycloak', { callbackUrl: '/workspace' })}
        size="md"
        fullWidth
        maw={320}
      >
        {t('login.sso')}
      </Button>
    </Stack>
  );
}

'use client';

/**
 * LoginForm — Client-side login form component.
 *
 * Handles email/password credential submission and SSO (Keycloak) sign-in.
 * Renders within the auth split layout's form panel.
 *
 * Design: Patterns Library §9 (Forms) — inline validation on blur, `*` for required fields.
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import {
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Stack,
  Text,
  Divider,
  Alert,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { t } from '@/lib/i18n';
import { showWarning } from '@/lib/notifications';

interface LoginFormValues {
  email: string;
  password: string;
}

/**
 * Validate an email string.
 * Returns an error message string if invalid, null if valid.
 */
function validateEmail(value: string): string | null {
  if (!value.trim()) {
    return 'Email is required';
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value)) {
    return 'Enter a valid email address';
  }
  return null;
}

/**
 * Validate a password string.
 * Returns an error message string if invalid, null if valid.
 */
function validatePassword(value: string): string | null {
  if (!value) {
    return 'Password is required';
  }
  return null;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') ?? '/workspace';
  const isExpired = searchParams.get('expired') === 'true';

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Show session-expired toast once on mount when ?expired=true is present.
  useEffect(() => {
    if (isExpired) {
      showWarning(t('error.sessionExpired'));
    }
    // Only run on mount — isExpired is derived from search params which don't change mid-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<LoginFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
    },
    validateInputOnBlur: true,
    validate: {
      email: validateEmail,
      password: validatePassword,
    },
  });

  async function handleSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        // Never reveal which field is wrong — generic message per AC-7.
        setAuthError(t('error.invalidCredentials'));
      } else if (result?.ok) {
        // Navigate to the redirect target after successful sign-in.
        window.location.href = redirectUrl;
      }
    } catch {
      setAuthError(t('error.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSsoSignIn() {
    await signIn('keycloak', { callbackUrl: redirectUrl });
  }

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* Title */}
      <Stack gap="xs">
        <Text
          fw={500}
          fz="var(--v-text-2xl)"
          c="var(--v-text-primary)"
          component="h1"
          style={{ margin: 0 }}
        >
          {t('login.title')}
        </Text>
        <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
          {t('login.subtitle')}
        </Text>
      </Stack>

      {/* Auth error alert — generic, never reveals which field */}
      {authError !== null && (
        <Alert
          variant="light"
          role="alert"
          style={{
            borderColor: 'var(--v-status-error)',
            backgroundColor: 'var(--v-status-error-light)',
            color: 'var(--v-status-error)',
          }}
        >
          {authError}
        </Alert>
      )}

      {/* Credential form */}
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label={t('login.email.label')}
            placeholder={t('login.email.placeholder')}
            type="email"
            autoComplete="email"
            required
            withAsterisk
            {...form.getInputProps('email')}
          />

          <Stack gap="xs">
            <PasswordInput
              label={t('login.password.label')}
              placeholder={t('login.password.placeholder')}
              autoComplete="current-password"
              required
              withAsterisk
              {...form.getInputProps('password')}
            />
            {/* Forgot password link — right-aligned, below password field */}
            <Group justify="flex-end">
              <Anchor
                component={Link}
                href="/forgot-password"
                fz="var(--v-text-sm)"
                c="var(--v-accent-primary)"
              >
                {t('login.forgotPassword')}
              </Anchor>
            </Group>
          </Stack>

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
            style={{
              backgroundColor: 'var(--v-accent-primary)',
              marginTop: 'var(--v-space-2)',
            }}
          >
            {t('login.submit')}
          </Button>
        </Stack>
      </form>

      {/* Divider */}
      <Divider
        label="or"
        labelPosition="center"
        styles={{
          label: { color: 'var(--v-text-tertiary)', fontSize: 'var(--v-text-sm)' },
        }}
      />

      {/* SSO sign-in */}
      <Button
        variant="outline"
        fullWidth
        onClick={handleSsoSignIn}
        style={{ borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' }}
      >
        {t('login.sso')}
      </Button>

      {/* Create account link */}
      <Text ta="center" fz="var(--v-text-sm)" c="var(--v-text-secondary)">
        <Anchor
          component={Link}
          href="/register"
          c="var(--v-accent-primary)"
          fz="var(--v-text-sm)"
        >
          {t('login.createAccount')}
        </Anchor>
      </Text>
    </Stack>
  );
}

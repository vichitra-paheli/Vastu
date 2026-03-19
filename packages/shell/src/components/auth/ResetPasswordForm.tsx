'use client';

/**
 * ResetPasswordForm — Client-side reset password form component.
 *
 * Reads ?token= from the query string and calls POST /api/auth/reset-password.
 * Displays an error state for expired or invalid tokens.
 * Design: Patterns Library §9 (Forms) — inline validation on blur.
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PasswordInput, Button, Stack, Text, Alert, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { t } from '@/lib/i18n';

interface ResetPasswordFormValues {
  password: string;
  confirmPassword: string;
}

/**
 * Validate a new password string.
 * Returns an error message string if invalid, null if valid.
 */
function validatePassword(value: string): string | null {
  if (!value) {
    return 'Password is required';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validateInputOnBlur: true,
    validate: {
      password: validatePassword,
      confirmPassword: (value, values) => {
        if (!value) {
          return 'Please confirm your password';
        }
        if (value !== values.password) {
          return 'Passwords do not match';
        }
        return null;
      },
    },
  });

  async function handleSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      setTokenError(t('resetPassword.error.missingToken'));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setTokenError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      });

      if (response.status === 400) {
        // Token is expired or invalid.
        setTokenError(t('resetPassword.error.invalidToken'));
      } else if (!response.ok) {
        setSubmitError(t('error.generic'));
      } else {
        setIsSuccess(true);
      }
    } catch {
      setSubmitError(t('error.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // No token present in URL — show an error immediately.
  if (!token) {
    return (
      <Stack gap="lg" style={{ width: '100%' }}>
        <Stack gap="xs">
          <Text
            fw={500}
            fz="var(--v-text-2xl)"
            c="var(--v-text-primary)"
            component="h1"
            style={{ margin: 0 }}
          >
            {t('resetPassword.title')}
          </Text>
        </Stack>

        <Alert
          variant="light"
          role="alert"
          style={{
            borderColor: 'var(--v-status-error)',
            backgroundColor: 'var(--v-status-error-light)',
            color: 'var(--v-status-error)',
          }}
        >
          {t('resetPassword.error.missingToken')}
        </Alert>

        <Anchor
          component={Link}
          href="/login"
          fz="var(--v-text-sm)"
          c="var(--v-accent-primary)"
        >
          {t('forgotPassword.backToLogin')}
        </Anchor>
      </Stack>
    );
  }

  if (isSuccess) {
    return (
      <Stack gap="lg" style={{ width: '100%' }}>
        <Stack gap="xs">
          <Text
            fw={500}
            fz="var(--v-text-2xl)"
            c="var(--v-text-primary)"
            component="h1"
            style={{ margin: 0 }}
          >
            {t('resetPassword.title')}
          </Text>
        </Stack>

        <Alert
          variant="light"
          role="status"
          style={{
            borderColor: 'var(--v-status-success)',
            backgroundColor: 'var(--v-status-success-light)',
            color: 'var(--v-status-success)',
          }}
        >
          {t('resetPassword.successMessage')}
        </Alert>

        <Anchor
          component={Link}
          href="/login"
          fz="var(--v-text-sm)"
          c="var(--v-accent-primary)"
        >
          {t('forgotPassword.backToLogin')}
        </Anchor>
      </Stack>
    );
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
          {t('resetPassword.title')}
        </Text>
        <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
          {t('resetPassword.subtitle')}
        </Text>
      </Stack>

      {/* Token error alert (expired / invalid) */}
      {tokenError !== null && (
        <Alert
          variant="light"
          role="alert"
          style={{
            borderColor: 'var(--v-status-error)',
            backgroundColor: 'var(--v-status-error-light)',
            color: 'var(--v-status-error)',
          }}
        >
          {tokenError}
        </Alert>
      )}

      {/* Generic submit error alert */}
      {submitError !== null && (
        <Alert
          variant="light"
          role="alert"
          style={{
            borderColor: 'var(--v-status-error)',
            backgroundColor: 'var(--v-status-error-light)',
            color: 'var(--v-status-error)',
          }}
        >
          {submitError}
        </Alert>
      )}

      {/* Password reset form */}
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <PasswordInput
            label={t('resetPassword.password.label')}
            placeholder={t('resetPassword.password.placeholder')}
            autoComplete="new-password"
            required
            withAsterisk
            {...form.getInputProps('password')}
          />

          <PasswordInput
            label={t('resetPassword.confirmPassword.label')}
            placeholder={t('resetPassword.confirmPassword.placeholder')}
            autoComplete="new-password"
            required
            withAsterisk
            {...form.getInputProps('confirmPassword')}
          />

          <Button
            type="submit"
            fullWidth
            loading={isSubmitting}
            style={{
              backgroundColor: 'var(--v-accent-primary)',
              marginTop: 'var(--v-space-2)',
            }}
          >
            {t('resetPassword.submit')}
          </Button>
        </Stack>
      </form>

      <Anchor
        component={Link}
        href="/login"
        fz="var(--v-text-sm)"
        c="var(--v-accent-primary)"
      >
        {t('forgotPassword.backToLogin')}
      </Anchor>
    </Stack>
  );
}

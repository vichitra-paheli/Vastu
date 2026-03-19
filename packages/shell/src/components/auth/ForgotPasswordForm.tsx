'use client';

/**
 * ForgotPasswordForm — Client-side forgot password form component.
 *
 * Accepts an email address and calls POST /api/auth/forgot-password.
 * Always shows a success state after submit to prevent email enumeration.
 * Design: Patterns Library §9 (Forms) — inline validation on blur.
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React from 'react';
import Link from 'next/link';
import { TextInput, Button, Stack, Text, Alert, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { t } from '@/lib/i18n';

interface ForgotPasswordFormValues {
  email: string;
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

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
    },
    validateInputOnBlur: true,
    validate: {
      email: validateEmail,
    },
  });

  async function handleSubmit(values: ForgotPasswordFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      if (!response.ok) {
        setSubmitError(t('error.generic'));
      } else {
        // Always show success to prevent email enumeration.
        setIsSuccess(true);
      }
    } catch {
      setSubmitError(t('error.generic'));
    } finally {
      setIsSubmitting(false);
    }
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
            {t('forgotPassword.title')}
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
          {t('forgotPassword.successMessage')}
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
          {t('forgotPassword.title')}
        </Text>
        <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
          {t('forgotPassword.subtitle')}
        </Text>
      </Stack>

      {/* Submit error alert */}
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

      {/* Email form */}
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label={t('forgotPassword.email.label')}
            placeholder={t('forgotPassword.email.placeholder')}
            type="email"
            autoComplete="email"
            required
            withAsterisk
            {...form.getInputProps('email')}
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
            {t('forgotPassword.submit')}
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

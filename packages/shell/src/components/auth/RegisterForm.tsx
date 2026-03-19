'use client';

/**
 * RegisterForm — Client-side registration form component.
 *
 * Fields: full name, organization name, work email, password (with
 * PasswordStrengthBar), confirm password, terms and privacy policy checkbox.
 *
 * On submit: POSTs to /api/auth/register to create user + org + tenant.
 * On success: redirects to /verify-email.
 *
 * Design: Patterns Library §9 (Forms) — validateInputOnBlur, * for required fields.
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React from 'react';
import Link from 'next/link';
import {
  TextInput,
  PasswordInput,
  Button,
  Anchor,
  Stack,
  Text,
  Alert,
  Checkbox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { t } from '@/lib/i18n';
import { PasswordStrengthBar } from './PasswordStrengthBar';

/**
 * Validate an email string format.
 * Mirrors `isValidEmail` from @vastu/shared/utils — inlined to keep this
 * component testable in Vitest's jsdom environment.
 */
function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface RegisterFormValues {
  name: string;
  orgName: string;
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

function validateName(value: string): string | null {
  if (!value.trim()) {
    return 'Full name is required';
  }
  return null;
}

function validateOrgName(value: string): string | null {
  if (!value.trim()) {
    return 'Organization name is required';
  }
  return null;
}

function validateEmail(value: string): string | null {
  if (!value.trim()) {
    return 'Work email is required';
  }
  if (!isValidEmailFormat(value)) {
    return 'Enter a valid email address';
  }
  return null;
}

function validatePassword(value: string): string | null {
  if (!value) {
    return 'Password is required';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

function validateConfirmPassword(value: string, values: RegisterFormValues): string | null {
  if (!value) {
    return 'Please confirm your password';
  }
  if (value !== values.password) {
    return 'Passwords do not match';
  }
  return null;
}

function validateTerms(value: boolean): string | null {
  if (!value) {
    return 'You must accept the Terms of Service to continue';
  }
  return null;
}

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: '',
      orgName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
    validateInputOnBlur: true,
    validate: {
      name: validateName,
      orgName: validateOrgName,
      email: validateEmail,
      password: validatePassword,
      confirmPassword: validateConfirmPassword,
      terms: validateTerms,
    },
  });

  // Track password value for PasswordStrengthBar (controlled separately to
  // avoid bypassing useForm's uncontrolled mode).
  const [passwordValue, setPasswordValue] = React.useState('');

  async function handleSubmit(values: RegisterFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          orgName: values.orgName,
          email: values.email,
          password: values.password,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        if (response.status === 409) {
          setSubmitError(t('register.error.emailTaken'));
        } else {
          setSubmitError(data.error ?? t('error.generic'));
        }
        return;
      }

      // Success: redirect to email verification page with the registered email.
      const encodedEmail = encodeURIComponent(values.email);
      window.location.href = `/verify-email?email=${encodedEmail}`;
    } catch {
      setSubmitError(t('error.generic'));
    } finally {
      setIsSubmitting(false);
    }
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
          {t('register.title')}
        </Text>
        <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
          {t('register.subtitle')}
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

      {/* Registration form */}
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label={t('register.name.label')}
            placeholder="Jane Smith"
            autoComplete="name"
            required
            withAsterisk
            {...form.getInputProps('name')}
          />

          <TextInput
            label={t('register.orgName.label')}
            placeholder="Acme Corp"
            autoComplete="organization"
            required
            withAsterisk
            {...form.getInputProps('orgName')}
          />

          <TextInput
            label={t('register.email.label')}
            placeholder="jane@company.com"
            type="email"
            autoComplete="email"
            required
            withAsterisk
            {...form.getInputProps('email')}
          />

          <Stack gap="xs">
            <PasswordInput
              label={t('register.password.label')}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              withAsterisk
              {...form.getInputProps('password')}
              onChange={(event) => {
                // Keep local state in sync for PasswordStrengthBar.
                setPasswordValue(event.currentTarget.value);
                // Let mantine form handle its own state.
                form.getInputProps('password').onChange(event);
              }}
            />
            <PasswordStrengthBar password={passwordValue} />
          </Stack>

          <PasswordInput
            label={t('register.confirmPassword.label')}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
            withAsterisk
            {...form.getInputProps('confirmPassword')}
          />

          <Checkbox
            label={
              <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
                {t('register.terms')}
              </Text>
            }
            {...form.getInputProps('terms', { type: 'checkbox' })}
            styles={{
              input: {
                cursor: 'pointer',
              },
            }}
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
            {t('register.submit')}
          </Button>
        </Stack>
      </form>

      {/* Sign in link */}
      <Text ta="center" fz="var(--v-text-sm)" c="var(--v-text-secondary)">
        <Anchor
          component={Link}
          href="/login"
          c="var(--v-accent-primary)"
          fz="var(--v-text-sm)"
        >
          {t('login.alreadyHaveAccount')}
        </Anchor>
      </Text>
    </Stack>
  );
}

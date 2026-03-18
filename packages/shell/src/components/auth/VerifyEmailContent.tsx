'use client';

/**
 * VerifyEmailContent — Client-side email verification page component.
 *
 * Displays a "Check your email" message with:
 * - The email address (read from the ?email= query param)
 * - A "Resend email" button with rate limiting (max 3 resends, then disabled)
 * - A countdown until the next resend is permitted
 * - A "← Back to sign in" link
 *
 * Design: Patterns Library §9 (Forms). All colors via --v-* CSS tokens.
 * All strings via t().
 */

import React, { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Stack, Text, Anchor, Alert } from '@mantine/core';
import { IconMail } from '@tabler/icons-react';
import { t } from '../../lib/i18n';

/** Maximum number of resend requests allowed before the button is disabled. */
const MAX_RESENDS = 3;

/** Duration in seconds that must elapse before the button is re-enabled after each click. */
const COOLDOWN_SECONDS = 60;

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [resendCount, setResendCount] = React.useState(0);
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);
  const [isResending, setIsResending] = React.useState(false);
  const [resendError, setResendError] = React.useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  // Countdown timer — decrements cooldownRemaining once per second.
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timerId = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [cooldownRemaining]);

  const isDisabled = resendCount >= MAX_RESENDS || cooldownRemaining > 0;

  const handleResend = useCallback(async () => {
    if (isDisabled || !email) return;

    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        setResendError(t('verifyEmail.resendRateLimited'));
        // Force-disable button if the server says rate limited.
        setResendCount(MAX_RESENDS);
        return;
      }

      if (!response.ok) {
        setResendError(t('error.generic'));
        return;
      }

      setResendCount((prev) => prev + 1);
      setCooldownRemaining(COOLDOWN_SECONDS);
      setResendSuccess(true);
    } catch {
      setResendError(t('error.generic'));
    } finally {
      setIsResending(false);
    }
  }, [email, isDisabled]);

  const resendLimitReached = resendCount >= MAX_RESENDS;

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* Icon */}
      <IconMail
        size={48}
        aria-hidden="true"
        style={{ color: 'var(--v-accent-primary)', alignSelf: 'flex-start' }}
      />

      {/* Title and description */}
      <Stack gap="xs">
        <Text
          fw={500}
          fz="var(--v-text-2xl)"
          c="var(--v-text-primary)"
          component="h1"
          style={{ margin: 0 }}
        >
          {t('verifyEmail.title')}
        </Text>

        {email && (
          <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
            {t('verifyEmail.subtitle')}{' '}
            <Text component="span" fw={500} c="var(--v-text-primary)">
              {email}
            </Text>
          </Text>
        )}

        <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
          {t('verifyEmail.instructions')}
        </Text>
      </Stack>

      {/* Success alert */}
      {resendSuccess && !resendError && (
        <Alert
          color="green"
          variant="light"
          role="status"
          style={{
            borderColor: 'var(--v-status-success)',
            backgroundColor: 'var(--v-status-success-light)',
            color: 'var(--v-status-success)',
          }}
        >
          {t('verifyEmail.resendSuccess')}
        </Alert>
      )}

      {/* Error alert */}
      {resendError !== null && (
        <Alert
          color="red"
          variant="light"
          role="alert"
          style={{
            borderColor: 'var(--v-status-error)',
            backgroundColor: 'var(--v-status-error-light)',
            color: 'var(--v-status-error)',
          }}
        >
          {resendError}
        </Alert>
      )}

      {/* Resend button */}
      <Stack gap="xs">
        <Button
          variant="outline"
          onClick={handleResend}
          loading={isResending}
          disabled={isDisabled}
          style={{
            borderColor: isDisabled ? 'var(--v-border-default)' : 'var(--v-accent-primary)',
            color: isDisabled ? 'var(--v-text-tertiary)' : 'var(--v-accent-primary)',
          }}
          aria-disabled={isDisabled}
        >
          {resendLimitReached ? t('verifyEmail.resendDisabled') : t('verifyEmail.resend')}
        </Button>

        {/* Countdown hint — only visible during the cooldown window */}
        {cooldownRemaining > 0 && !resendLimitReached && (
          <Text fz="var(--v-text-xs)" c="var(--v-text-tertiary)" ta="center">
            {t('verifyEmail.resendCooldown')} {cooldownRemaining}s
          </Text>
        )}

        {/* Resend count hint */}
        {resendCount > 0 && !resendLimitReached && (
          <Text fz="var(--v-text-xs)" c="var(--v-text-tertiary)" ta="center">
            {resendCount} / {MAX_RESENDS} resends used
          </Text>
        )}
      </Stack>

      {/* Back to sign in */}
      <Anchor
        component={Link}
        href="/login"
        fz="var(--v-text-sm)"
        c="var(--v-accent-primary)"
      >
        {t('verifyEmail.backToLogin')}
      </Anchor>
    </Stack>
  );
}

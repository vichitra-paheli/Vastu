'use client';

/**
 * MfaChallengeForm — Client-side MFA challenge form component.
 *
 * Renders the MFA challenge step that users encounter after a successful
 * password sign-in when their account has MFA enabled.
 *
 * Modes:
 *  - TOTP mode (default): Uses OtpInput (6-digit, 3-3 pattern). Auto-submits
 *    when all 6 digits are entered.
 *  - Recovery mode: Single text input for an 8-character recovery code.
 *    Toggled via the "Use a recovery code" link.
 *
 * On success: redirects to /workspace (or the ?redirect param).
 * On error: shows an inline error alert and allows retry.
 *
 * Design: Patterns Library §9 (Forms), §10 (Toasts).
 * All colors via --v-* CSS tokens. All strings via t().
 *
 * MCP tool equivalent: mfa_challenge({ code, type: 'totp' | 'recovery' }) → { success }
 */

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TextInput, Button, Stack, Text, Alert, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { OtpInput } from './OtpInput';
import { t } from '@/lib/i18n';

type Mode = 'totp' | 'recovery';

interface RecoveryFormValues {
  recoveryCode: string;
}

/**
 * Validate a recovery code input.
 * Returns an error string if invalid, null if valid.
 */
function validateRecoveryCode(value: string): string | null {
  if (!value.trim()) {
    return t('mfa.challenge.recoveryCodeRequired');
  }
  return null;
}

export function MfaChallengeForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') ?? '/workspace';

  const [mode, setMode] = React.useState<Mode>('totp');
  const [otpValue, setOtpValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Recovery code form — only used in 'recovery' mode.
  const recoveryForm = useForm<RecoveryFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      recoveryCode: '',
    },
    validateInputOnBlur: true,
    validate: {
      recoveryCode: validateRecoveryCode,
    },
  });

  // Use a ref to track the submitting state inside the auto-submit effect
  // without causing the effect to re-run when isSubmitting changes.
  const isSubmittingRef = React.useRef(false);

  async function submitTotp(rawValue: string) {
    // Strip spaces (empty-slot sentinels) to get the clean 6-digit code.
    const code = rawValue.replace(/ /g, '');
    if (code.length !== 6 || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, type: 'totp' }),
      });

      if (response.ok) {
        window.location.href = redirectUrl;
      } else {
        const data = (await response.json()) as { error?: string };
        setAuthError(data.error ?? t('mfa.challenge.error.invalidCode'));
        // Reset OTP input on error so the user can retry.
        setOtpValue('');
      }
    } catch {
      setAuthError(t('mfa.challenge.error.generic'));
      setOtpValue('');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // Auto-submit when all 6 TOTP digits are entered.
  React.useEffect(() => {
    if (mode !== 'totp') return;
    // The OtpInput component pads the value with spaces as empty-slot sentinels.
    // A complete code has 6 non-space characters.
    const clean = otpValue.replace(/ /g, '');
    if (clean.length === 6) {
      void submitTotp(otpValue);
    }
    // submitTotp is a stable function reference — it does not depend on mutable
    // state directly (it reads isSubmitting via isSubmittingRef to avoid stale
    // closures triggering unnecessary re-runs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValue, mode]);

  async function handleRecoverySubmit(values: RecoveryFormValues) {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: values.recoveryCode.trim().toUpperCase(), type: 'recovery' }),
      });

      if (response.ok) {
        window.location.href = redirectUrl;
      } else {
        const data = (await response.json()) as { error?: string };
        setAuthError(data.error ?? t('mfa.challenge.error.invalidRecovery'));
      }
    } catch {
      setAuthError(t('mfa.challenge.error.generic'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchToRecovery() {
    setMode('recovery');
    setAuthError(null);
    setOtpValue('');
  }

  function switchToTotp() {
    setMode('totp');
    setAuthError(null);
    recoveryForm.reset();
  }

  const isRecoveryMode = mode === 'recovery';

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
          {isRecoveryMode ? t('mfa.challenge.recoveryTitle') : t('mfa.title')}
        </Text>
        <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
          {isRecoveryMode ? t('mfa.challenge.recoverySubtitle') : t('mfa.subtitle')}
        </Text>
      </Stack>

      {/* Auth error alert */}
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

      {/* TOTP mode — OTP input with auto-submit */}
      {!isRecoveryMode && (
        <Stack gap="md">
          <OtpInput
            value={otpValue}
            onChange={setOtpValue}
            disabled={isSubmitting}
            label={t('mfa.challenge.otpLabel')}
          />

          {/* Loading indicator shown while auto-submit is in progress */}
          {isSubmitting && (
            <Text fz="var(--v-text-sm)" c="var(--v-text-tertiary)" ta="center">
              {t('mfa.challenge.verifying')}
            </Text>
          )}

          {/* Toggle to recovery mode */}
          <Anchor
            component="button"
            type="button"
            fz="var(--v-text-sm)"
            c="var(--v-accent-primary)"
            onClick={switchToRecovery}
          >
            {t('mfa.useRecovery')}
          </Anchor>
        </Stack>
      )}

      {/* Recovery code mode — text input with manual submit */}
      {isRecoveryMode && (
        <form onSubmit={recoveryForm.onSubmit(handleRecoverySubmit)} noValidate>
          <Stack gap="md">
            <TextInput
              label={t('mfa.challenge.recoveryCode.label')}
              placeholder={t('mfa.challenge.recoveryCode.placeholder')}
              autoComplete="off"
              required
              withAsterisk
              style={{ fontFamily: 'var(--v-font-mono)' }}
              {...recoveryForm.getInputProps('recoveryCode')}
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
              {t('mfa.challenge.recoverySubmit')}
            </Button>

            {/* Toggle back to TOTP mode */}
            <Anchor
              component="button"
              type="button"
              fz="var(--v-text-sm)"
              c="var(--v-accent-primary)"
              onClick={switchToTotp}
            >
              {t('mfa.challenge.useTotpInstead')}
            </Anchor>
          </Stack>
        </form>
      )}

      {/* Back to sign in link */}
      <Anchor
        component={Link}
        href="/login"
        fz="var(--v-text-sm)"
        c="var(--v-accent-primary)"
      >
        {t('mfa.backToSignIn')}
      </Anchor>
    </Stack>
  );
}

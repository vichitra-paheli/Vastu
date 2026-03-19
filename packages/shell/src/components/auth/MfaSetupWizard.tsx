'use client';

/**
 * MfaSetupWizard — Multi-step MFA setup wizard.
 *
 * Step 1: QR Code + manual secret — user scans with their authenticator app.
 * Step 2: Verify — user enters the 6-digit TOTP code to confirm setup.
 * Step 3: Recovery codes — user is shown 6 recovery codes to save offline.
 *
 * Design: Patterns Library §9 (Forms), §10 (Toasts).
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React, { useEffect, useState } from 'react';
import {
  Stack,
  Text,
  Button,
  Group,
  Stepper,
  Image,
  CopyButton,
  ActionIcon,
  Tooltip,
  Skeleton,
  Alert,
  Box,
} from '@mantine/core';
import { IconCopy, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { showSuccess } from '../../lib/notifications';
import { OtpInput } from './OtpInput';
import { RecoveryCodes } from './RecoveryCodes';

interface SetupData {
  qrCodeDataUrl: string;
  secret: string;
}

interface VerifyResult {
  recoveryCodes: string[];
}

export interface MfaSetupWizardProps {
  /** Called when the wizard is completed (MFA fully enabled). */
  onComplete?: () => void;
  /** Called when the user cancels/closes the wizard. */
  onCancel?: () => void;
}

export function MfaSetupWizard({ onComplete, onCancel }: MfaSetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Step 1 state
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Step 2 state
  const [otpValue, setOtpValue] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Step 3 state
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Fetch QR code + secret on mount.
  useEffect(() => {
    async function fetchSetup() {
      setSetupLoading(true);
      setSetupError(null);
      try {
        const response = await fetch('/api/auth/mfa/setup', { method: 'POST' });
        if (!response.ok) {
          throw new Error(t('mfa.setup.fetchError'));
        }
        const data = (await response.json()) as SetupData;
        setSetupData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('error.generic');
        setSetupError(message);
      } finally {
        setSetupLoading(false);
      }
    }

    void fetchSetup();
  }, []);

  async function handleVerify() {
    if (otpValue.replace(/\s/g, '').length < 6) {
      setVerifyError(t('mfa.verify.codeRequired'));
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpValue }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? t('mfa.verify.invalidCode'));
      }

      const data = (await response.json()) as VerifyResult;
      setRecoveryCodes(data.recoveryCodes);
      setActiveStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.generic');
      setVerifyError(message);
    } finally {
      setVerifyLoading(false);
    }
  }

  function handleComplete() {
    showSuccess(t('mfa.setup.success'));
    onComplete?.();
  }

  return (
    <Stack gap="xl" style={{ width: '100%', maxWidth: '480px' }}>
      {/* Title */}
      <Stack gap="xs">
        <Text fw={500} fz="var(--v-text-2xl)" c="var(--v-text-primary)" component="h2" style={{ margin: 0 }}>
          {t('mfa.setup.title')}
        </Text>
        <Text fz="var(--v-text-md)" c="var(--v-text-secondary)">
          {t('mfa.setup.subtitle')}
        </Text>
      </Stack>

      {/* Stepper */}
      <Stepper
        active={activeStep}
        size="sm"
        styles={{
          stepLabel: { fontSize: 'var(--v-text-sm)', color: 'var(--v-text-primary)' },
          stepDescription: { fontSize: 'var(--v-text-xs)', color: 'var(--v-text-secondary)' },
        }}
      >
        <Stepper.Step label={t('mfa.setup.step1.label')} description={t('mfa.setup.step1.desc')} />
        <Stepper.Step label={t('mfa.setup.step2.label')} description={t('mfa.setup.step2.desc')} />
        <Stepper.Step label={t('mfa.setup.step3.label')} description={t('mfa.setup.step3.desc')} />
      </Stepper>

      {/* ── Step 1: QR Code ──────────────────────────────────────────────────── */}
      {activeStep === 0 && (
        <Stack gap="md">
          <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
            {t('mfa.setup.step1.instruction')}
          </Text>

          {/* QR code area */}
          <Box
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 'var(--v-space-4)',
              border: '1px solid var(--v-border-default)',
              borderRadius: '8px',
              backgroundColor: 'var(--v-bg-secondary)',
              minHeight: '200px',
              alignItems: 'center',
            }}
          >
            {setupLoading && <Skeleton height={180} width={180} />}
            {setupError && (
              <Alert
                icon={<IconAlertCircle size={18} style={{ color: 'var(--v-status-error)' }} />}
                variant="light"
                style={{
                  width: '100%',
                  borderColor: 'var(--v-status-error)',
                  backgroundColor: 'var(--v-status-error-light)',
                  color: 'var(--v-status-error)',
                }}
              >
                {setupError}
              </Alert>
            )}
            {setupData && !setupLoading && (
              <Image
                src={setupData.qrCodeDataUrl}
                alt={t('mfa.setup.qrAlt')}
                width={180}
                height={180}
                style={{ imageRendering: 'pixelated' }}
              />
            )}
          </Box>

          {/* Manual secret key */}
          {setupData && (
            <Stack gap="xs">
              <Text fz="var(--v-text-xs)" c="var(--v-text-secondary)">
                {t('mfa.setup.step1.manualEntry')}
              </Text>
              <Group
                gap="xs"
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--v-border-default)',
                  borderRadius: '6px',
                  backgroundColor: 'var(--v-bg-secondary)',
                }}
              >
                <Text
                  fz="var(--v-text-sm)"
                  fw={400}
                  c="var(--v-text-primary)"
                  style={{ fontFamily: 'var(--v-font-mono)', flex: 1, letterSpacing: '0.1em' }}
                >
                  {setupData.secret}
                </Text>
                <CopyButton value={setupData.secret} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? t('common.copied') : t('common.copy')} withArrow>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={copy}
                        aria-label={t('common.copy')}
                        style={{ color: copied ? 'var(--v-status-success)' : 'var(--v-text-secondary)' }}
                      >
                        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          )}

          <Group justify="space-between" mt="sm">
            {onCancel && (
              <Button
                variant="subtle"
                onClick={onCancel}
                style={{ color: 'var(--v-text-secondary)' }}
              >
                {t('common.cancel')}
              </Button>
            )}
            <Button
              onClick={() => setActiveStep(1)}
              disabled={!setupData || setupLoading}
              style={{ backgroundColor: 'var(--v-accent-primary)', marginLeft: 'auto' }}
            >
              {t('common.continue')}
            </Button>
          </Group>
        </Stack>
      )}

      {/* ── Step 2: Verify Code ───────────────────────────────────────────────── */}
      {activeStep === 1 && (
        <Stack gap="md">
          <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
            {t('mfa.setup.step2.instruction')}
          </Text>

          <OtpInput
            value={otpValue}
            onChange={(val) => {
              setOtpValue(val);
              if (verifyError) setVerifyError(null);
            }}
            disabled={verifyLoading}
            error={verifyError ?? undefined}
            label={t('mfa.verify.codeLabel')}
          />

          <Group justify="space-between" mt="sm">
            <Button
              variant="subtle"
              onClick={() => setActiveStep(0)}
              style={{ color: 'var(--v-text-secondary)' }}
              disabled={verifyLoading}
            >
              {t('common.back')}
            </Button>
            <Button
              onClick={handleVerify}
              loading={verifyLoading}
              disabled={otpValue.replace(/\D/g, '').length < 6}
              style={{ backgroundColor: 'var(--v-accent-primary)' }}
            >
              {t('mfa.verify.submit')}
            </Button>
          </Group>
        </Stack>
      )}

      {/* ── Step 3: Recovery Codes ────────────────────────────────────────────── */}
      {activeStep === 2 && (
        <Stack gap="md">
          <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
            {t('mfa.setup.step3.instruction')}
          </Text>

          <RecoveryCodes codes={recoveryCodes} />

          <Group justify="flex-end" mt="sm">
            <Button
              onClick={handleComplete}
              style={{ backgroundColor: 'var(--v-accent-primary)' }}
            >
              {t('mfa.setup.done')}
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}

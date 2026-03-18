'use client';

/**
 * RecoveryCodes — Displays MFA recovery codes after setup.
 *
 * Shows 6 recovery codes in a 2-column grid with monospace styling.
 * Provides:
 * - "Copy all" button: copies all codes as newline-separated text to clipboard
 * - "Download" button: triggers download of a plain text file with the codes
 *
 * Design: Patterns Library §9 (Forms), §10 (Toasts).
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React from 'react';
import { Stack, Text, SimpleGrid, Box, Button, Group, Alert } from '@mantine/core';
import { IconCopy, IconDownload, IconAlertTriangle } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { showSuccess, showError } from '../../lib/notifications';

export interface RecoveryCodesProps {
  codes: string[];
}

export function RecoveryCodes({ codes }: RecoveryCodesProps) {
  async function handleCopyAll() {
    const text = codes.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(t('mfa.recovery.copied'));
    } catch {
      showError(t('mfa.recovery.copyFailed'));
    }
  }

  function handleDownload() {
    const content = [
      t('mfa.recovery.fileHeader'),
      '',
      ...codes,
      '',
      t('mfa.recovery.fileFooter'),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'vastu-recovery-codes.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Stack gap="md">
      {/* Warning alert */}
      <Alert
        icon={<IconAlertTriangle size={18} />}
        color="yellow"
        variant="light"
        style={{
          borderColor: 'var(--v-accent-tertiary)',
          backgroundColor: 'var(--v-accent-tertiary-light)',
        }}
      >
        <Text fz="var(--v-text-sm)" c="var(--v-text-primary)">
          {t('mfa.recovery.warning')}
        </Text>
      </Alert>

      {/* Code grid */}
      <Box
        style={{
          border: '1px solid var(--v-border-default)',
          borderRadius: '8px',
          padding: 'var(--v-space-4)',
          backgroundColor: 'var(--v-bg-secondary)',
        }}
      >
        <SimpleGrid cols={2} spacing="sm">
          {codes.map((code, index) => (
            <Text
              key={index}
              fz="var(--v-text-sm)"
              fw={400}
              c="var(--v-text-primary)"
              style={{
                fontFamily: 'var(--v-font-mono)',
                letterSpacing: '0.05em',
                padding: '4px 0',
              }}
              aria-label={`${t('mfa.recovery.codeLabel')} ${index + 1}: ${code}`}
            >
              {code}
            </Text>
          ))}
        </SimpleGrid>
      </Box>

      {/* Actions */}
      <Group gap="sm">
        <Button
          variant="outline"
          leftSection={<IconCopy size={16} />}
          onClick={handleCopyAll}
          style={{ borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' }}
        >
          {t('mfa.recovery.copyAll')}
        </Button>
        <Button
          variant="outline"
          leftSection={<IconDownload size={16} />}
          onClick={handleDownload}
          style={{ borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' }}
        >
          {t('mfa.recovery.download')}
        </Button>
      </Group>
    </Stack>
  );
}

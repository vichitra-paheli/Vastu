'use client';

/**
 * KeyDisplayModal — Shows the newly generated API key exactly once.
 *
 * Displays the raw key in a copyable monospace field with a prominent warning
 * banner: "This key won't be shown again". Once closed, the key is gone.
 *
 * Patterns Library §10 — Toast for copy confirmation.
 * All colors via --v-* tokens. All strings via t().
 */

import { Alert, Button, CopyButton, Group, Modal, Text, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy } from '@tabler/icons-react';
import type { ApiKeyWithPrefix } from '@vastu/shared/types';
import { t } from '../../lib/i18n';

export interface KeyDisplayModalProps {
  opened: boolean;
  onClose: () => void;
  apiKey: ApiKeyWithPrefix | null;
}

export function KeyDisplayModal({ opened, onClose, apiKey }: KeyDisplayModalProps) {
  if (!apiKey) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('apiKeys.display.title')}
      size="md"
      closeOnClickOutside={false}
    >
      {/* Warning banner */}
      <Alert
        icon={<IconAlertTriangle size={16} />}
        color="yellow"
        mb="md"
        style={{ borderColor: 'var(--v-status-warning)' }}
      >
        <Text fz="var(--v-text-sm)" fw={500}>
          {t('apiKeys.display.warning')}
        </Text>
      </Alert>

      <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)" mb="xs">
        {t('apiKeys.display.keyLabel')}
      </Text>

      {/* Key display + copy button */}
      <Group gap="xs" mb="xl" align="flex-end">
        <TextInput
          value={apiKey.fullKey}
          readOnly
          aria-label={t('apiKeys.display.keyLabel')}
          style={{ flex: 1 }}
          styles={{
            input: {
              fontFamily: 'var(--v-font-mono)',
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-text-primary)',
              backgroundColor: 'var(--v-bg-secondary)',
            },
          }}
        />
        <CopyButton value={apiKey.fullKey} timeout={2000}>
          {({ copied, copy }) => (
            <Button
              variant={copied ? 'filled' : 'outline'}
              size="sm"
              leftSection={
                copied ? <IconCheck size={14} /> : <IconCopy size={14} />
              }
              onClick={copy}
              aria-label={t('common.copy')}
              style={
                copied
                  ? { backgroundColor: 'var(--v-status-success)', color: 'var(--v-text-inverse)' }
                  : undefined
              }
            >
              {copied ? t('common.copied') : t('common.copy')}
            </Button>
          )}
        </CopyButton>
      </Group>

      <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)" mb="xl">
        {t('apiKeys.display.nameLabel')}{' '}
        <Text component="span" fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
          {apiKey.name}
        </Text>
      </Text>

      <Group justify="flex-end">
        <Button onClick={onClose}>{t('apiKeys.display.done')}</Button>
      </Group>
    </Modal>
  );
}

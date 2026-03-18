'use client';

/**
 * SsoProviderModal — Add / edit SSO identity provider modal.
 * US-019, AC-3: Protocol selector (SAML/OIDC), metadata URL or manual config,
 * client ID/secret, redirect URI, "Test connection" button.
 *
 * Design: Patterns Library §9 (Forms) — inline validation on blur, * for required fields.
 * All colors via --v-* CSS tokens. All strings via t().
 */

import React from 'react';
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlugConnected } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { showError, showSuccess } from '../../lib/notifications';
import type { SsoProviderConfig, CreateSsoProviderInput } from '../../types/sso-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalMode = 'add' | 'edit';

export interface SsoProviderModalProps {
  opened: boolean;
  onClose: () => void;
  /** When provided, the modal is in edit mode pre-populated with this provider. */
  provider?: SsoProviderConfig;
  onSave: (input: CreateSsoProviderInput, id?: string) => Promise<void>;
}

interface SsoProviderFormValues {
  name: string;
  protocol: 'SAML' | 'OIDC';
  metadataUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateName(value: string): string | null {
  if (!value.trim()) return t('sso.config.form.name.required');
  if (value.trim().length > 100) return t('sso.config.form.name.maxLength');
  return null;
}

function validateMetadataUrl(value: string): string | null {
  if (!value.trim()) return null; // optional
  try {
    const url = new URL(value.trim());
    if (!['https:', 'http:'].includes(url.protocol)) {
      return t('sso.config.form.metadataUrl.invalid');
    }
    return null;
  } catch {
    return t('sso.config.form.metadataUrl.invalid');
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SsoProviderModal({ opened, onClose, provider, onSave }: SsoProviderModalProps) {
  const mode: ModalMode = provider ? 'edit' : 'add';
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);

  const form = useForm<SsoProviderFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      name: provider?.name ?? '',
      protocol: provider?.protocol ?? 'OIDC',
      metadataUrl: provider?.metadataUrl ?? '',
      clientId: provider?.clientId ?? '',
      clientSecret: '',
      redirectUri: provider?.redirectUri ?? '',
    },
    validateInputOnBlur: true,
    validate: {
      name: validateName,
      metadataUrl: validateMetadataUrl,
    },
  });

  // Re-populate form when the provider prop changes (switching from add to edit).
  React.useEffect(() => {
    if (opened) {
      form.setValues({
        name: provider?.name ?? '',
        protocol: provider?.protocol ?? 'OIDC',
        metadataUrl: provider?.metadataUrl ?? '',
        clientId: provider?.clientId ?? '',
        clientSecret: '',
        redirectUri: provider?.redirectUri ?? '',
      });
    }
    // We intentionally run this only when opened/provider changes, not on form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, provider]);

  async function handleSubmit(values: SsoProviderFormValues) {
    setIsSaving(true);
    try {
      const input: CreateSsoProviderInput = {
        name: values.name.trim(),
        protocol: values.protocol,
        ...(values.metadataUrl.trim() && { metadataUrl: values.metadataUrl.trim() }),
        ...(values.clientId.trim() && { clientId: values.clientId.trim() }),
        ...(values.clientSecret.trim() && { clientSecret: values.clientSecret.trim() }),
        ...(values.redirectUri.trim() && { redirectUri: values.redirectUri.trim() }),
      };
      await onSave(input, provider?.id);
      showSuccess(
        mode === 'add' ? t('sso.config.toast.created') : t('sso.config.toast.updated'),
      );
      form.reset();
      onClose();
    } catch {
      showError(t('error.generic'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    if (!provider?.id) return;
    setIsTesting(true);
    try {
      const res = await fetch(`/api/settings/sso/${provider.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _action: 'test' }) });
      if (res.ok) {
        showSuccess(t('sso.config.toast.testSuccess'));
      } else {
        showError(t('sso.config.toast.testFailed'));
      }
    } catch {
      showError(t('sso.config.toast.testFailed'));
    } finally {
      setIsTesting(false);
    }
  }

  const protocolOptions = [
    { value: 'OIDC', label: 'OIDC (OpenID Connect)' },
    { value: 'SAML', label: 'SAML 2.0' },
  ];

  const title = mode === 'add' ? t('sso.config.modal.addTitle') : t('sso.config.modal.editTitle');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size="lg"
      closeOnClickOutside={!isSaving}
      closeOnEscape={!isSaving}
    >
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          {/* Provider name */}
          <TextInput
            label={t('sso.config.form.name.label')}
            placeholder={t('sso.config.form.name.placeholder')}
            required
            withAsterisk
            {...form.getInputProps('name')}
          />

          {/* Protocol selector */}
          <Select
            label={t('sso.config.form.protocol.label')}
            data={protocolOptions}
            required
            withAsterisk
            allowDeselect={false}
            {...form.getInputProps('protocol')}
          />

          {/* Metadata URL */}
          <TextInput
            label={t('sso.config.form.metadataUrl.label')}
            placeholder={t('sso.config.form.metadataUrl.placeholder')}
            description={t('sso.config.form.metadataUrl.description')}
            type="url"
            {...form.getInputProps('metadataUrl')}
          />

          {/* Client ID */}
          <TextInput
            label={t('sso.config.form.clientId.label')}
            placeholder={t('sso.config.form.clientId.placeholder')}
            {...form.getInputProps('clientId')}
          />

          {/* Client secret */}
          <PasswordInput
            label={t('sso.config.form.clientSecret.label')}
            placeholder={
              mode === 'edit'
                ? t('sso.config.form.clientSecret.editPlaceholder')
                : t('sso.config.form.clientSecret.placeholder')
            }
            description={
              mode === 'edit' ? t('sso.config.form.clientSecret.editDescription') : undefined
            }
            {...form.getInputProps('clientSecret')}
          />

          {/* Redirect URI */}
          <TextInput
            label={t('sso.config.form.redirectUri.label')}
            placeholder={t('sso.config.form.redirectUri.placeholder')}
            description={t('sso.config.form.redirectUri.description')}
            type="url"
            {...form.getInputProps('redirectUri')}
          />

          {/* Footer actions */}
          <Group justify="space-between" mt="sm">
            {/* Test connection — only in edit mode when provider exists */}
            {mode === 'edit' && provider ? (
              <Button
                variant="outline"
                leftSection={<IconPlugConnected size={16} />}
                onClick={handleTestConnection}
                loading={isTesting}
                disabled={isSaving}
                style={{ borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' }}
              >
                {t('sso.config.modal.testConnection')}
              </Button>
            ) : (
              <span />
            )}

            <Group gap="sm">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                style={{ borderColor: 'var(--v-border-default)', color: 'var(--v-text-primary)' }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                loading={isSaving}
                style={{ backgroundColor: 'var(--v-accent-primary)' }}
              >
                {mode === 'add' ? t('sso.config.modal.add') : t('common.save')}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>

      {/* Status line shown when there's a note about the secret */}
      {mode === 'edit' && (
        <Text fz="var(--v-text-xs)" c="var(--v-text-tertiary)" mt="xs">
          {t('sso.config.form.encryptedNote')}
        </Text>
      )}
    </Modal>
  );
}

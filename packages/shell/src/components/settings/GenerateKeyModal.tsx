'use client';

/**
 * GenerateKeyModal — Modal for creating a new API key.
 *
 * Fields: name (required), scope (Full access / Read only), description (optional).
 * On submit, calls POST /api/settings/api-keys and passes the result (including the
 * full raw key) up to the parent via onGenerated so KeyDisplayModal can show it.
 *
 * All colors via --v-* tokens. All strings via t(). Form validation via @mantine/form.
 */

import { useState } from 'react';
import { Button, Group, Modal, Select, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import type { ApiKeyWithPrefix } from '@vastu/shared/types';
import { showError } from '@/lib/notifications';
import { t } from '@/lib/i18n';

export interface GenerateKeyModalProps {
  opened: boolean;
  onClose: () => void;
  onGenerated: (key: ApiKeyWithPrefix) => void;
}

interface FormValues {
  name: string;
  scope: string;
  description: string;
}

export function GenerateKeyModal({ opened, onClose, onGenerated }: GenerateKeyModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      scope: 'full',
      description: '',
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? t('apiKeys.generate.name.required') : null,
    },
    validateInputOnBlur: true,
  });

  function handleClose() {
    form.reset();
    onClose();
  }

  async function handleSubmit(values: FormValues) {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          scope: values.scope,
          description: values.description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'), t('apiKeys.generate.errorTitle'));
        return;
      }

      const data = (await response.json()) as { key: ApiKeyWithPrefix };
      form.reset();
      onGenerated(data.key);
    } catch {
      showError(t('error.networkError'), t('apiKeys.generate.errorTitle'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('apiKeys.generate.title')}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label={t('apiKeys.generate.name.label')}
          placeholder={t('apiKeys.generate.name.placeholder')}
          required
          mb="md"
          {...form.getInputProps('name')}
        />

        <Select
          label={t('apiKeys.generate.scope.label')}
          data={[
            { value: 'full', label: t('apiKeys.scope.full') },
            { value: 'read_only', label: t('apiKeys.scope.readOnly') },
          ]}
          allowDeselect={false}
          mb="md"
          {...form.getInputProps('scope')}
        />

        <Textarea
          label={t('apiKeys.generate.description.label')}
          placeholder={t('apiKeys.generate.description.placeholder')}
          rows={3}
          mb="xl"
          {...form.getInputProps('description')}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('apiKeys.generate.submit')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}

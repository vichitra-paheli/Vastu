'use client';

/**
 * DbConnectionModal — Add / Edit database connection form modal.
 *
 * Implements US-016 AC-3, AC-4, AC-7.
 *
 * Fields: name, host, port, database, username, password (masked), SSL toggle.
 * "Test connection" button performs an inline test against the saved connection
 * (edit mode) and shows success/failure inline.
 *
 * The parent passes a `key` prop equal to `connection?.id ?? 'new'` to force
 * remounting when switching between add/edit modes, which resets form state.
 */

import { useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  PasswordInput,
  Switch,
  Group,
  Button,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconAlertCircle, IconPlugConnected } from '@tabler/icons-react';
import type { DbConnection } from '@vastu/shared/types';
import { t } from '../../lib/i18n';

export interface DbConnectionModalProps {
  opened: boolean;
  /** When provided the modal is in edit mode; null = add mode. */
  connection: DbConnection | null;
  onClose: () => void;
  /** Called with the saved/updated connection after a successful API call. */
  onSaved: (connection: DbConnection) => void;
}

interface FormValues {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled: boolean;
  protocol: string;
}

interface TestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export function DbConnectionModal({
  opened,
  connection,
  onClose,
  onSaved,
}: DbConnectionModalProps) {
  const isEditing = connection !== null;

  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      name: connection?.name ?? '',
      host: connection?.host ?? '',
      port: connection?.port ?? 5432,
      database: connection?.database ?? '',
      username: connection?.username ?? '',
      password: '',
      sslEnabled: connection?.sslEnabled ?? false,
      protocol: connection?.protocol ?? 'postgresql',
    },
    validate: {
      name: (v) => (v.trim() ? null : t('databases.name.required')),
      host: (v) => (v.trim() ? null : t('databases.host.required')),
      port: (v) =>
        Number.isInteger(v) && v >= 1 && v <= 65535
          ? null
          : t('databases.port.invalid'),
      database: (v) => (v.trim() ? null : t('databases.database.required')),
      username: (v) => (v.trim() ? null : t('databases.username.required')),
      // Password required only on add; blank on edit = keep existing
      password: (v) =>
        !isEditing && !v.trim() ? t('databases.password.required') : null,
    },
  });

  function handleClose() {
    form.reset();
    setTestResult(null);
    onClose();
  }

  async function handleSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const url = isEditing
        ? `/api/settings/db-connections/${connection.id}`
        : '/api/settings/db-connections';
      const method = isEditing ? 'PATCH' : 'POST';

      const body: Record<string, unknown> = {
        name: values.name.trim(),
        host: values.host.trim(),
        port: values.port,
        database: values.database.trim(),
        username: values.username.trim(),
        sslEnabled: values.sslEnabled,
        protocol: values.protocol,
      };

      // Include password if provided (edit: skip if blank to keep existing)
      if (values.password.trim() || !isEditing) {
        body.password = values.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        form.setErrors({ name: data.error ?? t('error.generic') });
        return;
      }

      const data = (await res.json()) as { connection: DbConnection };
      form.reset();
      onSaved(data.connection);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest() {
    const validation = form.validate();
    if (validation.hasErrors) return;

    setTesting(true);
    setTestResult(null);

    try {
      if (isEditing) {
        const res = await fetch(`/api/settings/db-connections/${connection.id}/test`, {
          method: 'POST',
        });
        const data = (await res.json()) as TestResult;
        setTestResult(data);
        return;
      }

      // For unsaved connections, inform the user to save first
      setTestResult({
        success: false,
        error: 'Save the connection first to run a connectivity test.',
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEditing ? t('databases.modal.edit.title') : t('databases.modal.add.title')}
      size="md"
    >
      <form onSubmit={form.onSubmit((v) => { void handleSubmit(v); })}>
        <Stack gap="md">
          <TextInput
            label={t('databases.modal.name.label')}
            placeholder={t('databases.modal.name.placeholder')}
            required
            {...form.getInputProps('name')}
          />

          <Group grow align="flex-start">
            <TextInput
              label={t('databases.modal.host.label')}
              placeholder={t('databases.modal.host.placeholder')}
              required
              style={{ flex: 3 }}
              {...form.getInputProps('host')}
            />
            <NumberInput
              label={t('databases.modal.port.label')}
              min={1}
              max={65535}
              required
              style={{ flex: 1 }}
              {...form.getInputProps('port')}
            />
          </Group>

          <TextInput
            label={t('databases.modal.database.label')}
            placeholder={t('databases.modal.database.placeholder')}
            required
            {...form.getInputProps('database')}
          />

          <TextInput
            label={t('databases.modal.username.label')}
            placeholder={t('databases.modal.username.placeholder')}
            required
            {...form.getInputProps('username')}
          />

          <PasswordInput
            label={t('databases.modal.password.label')}
            placeholder={
              isEditing
                ? 'Leave blank to keep existing password'
                : t('databases.modal.password.placeholder')
            }
            required={!isEditing}
            {...form.getInputProps('password')}
          />

          <Switch
            label={t('databases.modal.ssl.label')}
            checked={form.values.sslEnabled}
            onChange={(e) => form.setFieldValue('sslEnabled', e.currentTarget.checked)}
          />

          {testResult !== null && (
            <Alert
              icon={
                testResult.success ? (
                  <IconCheck size={16} />
                ) : (
                  <IconAlertCircle size={16} />
                )
              }
              color={testResult.success ? 'green' : 'red'}
              variant="light"
            >
              {testResult.success
                ? `${t('databases.modal.test.success')}${testResult.latencyMs !== undefined ? ` (${testResult.latencyMs}ms)` : ''}`
                : (testResult.error ?? t('databases.modal.test.failure'))}
            </Alert>
          )}

          <Group justify="space-between" mt="sm">
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconPlugConnected size={14} />}
              onClick={() => { void handleTest(); }}
              loading={testing}
              disabled={submitting}
              style={{ color: 'var(--v-accent-primary)' }}
            >
              {t('databases.modal.test')}
            </Button>

            <Group gap="sm">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="filled"
                size="sm"
                loading={submitting}
                style={{ backgroundColor: 'var(--v-accent-primary)' }}
              >
                {submitting
                  ? t('databases.modal.submit.saving')
                  : isEditing
                    ? t('databases.modal.submit.edit')
                    : t('databases.modal.submit.add')}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

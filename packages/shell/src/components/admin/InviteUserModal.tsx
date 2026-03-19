'use client';

/**
 * InviteUserModal — Modal for inviting one or more users to the organization.
 *
 * Accepts comma-separated email addresses, a role selector, and an optional
 * personal message. Submits to POST /api/admin/users.
 *
 * Validation via @mantine/form.
 * All user-facing strings through t().
 */

import { useState } from 'react';
import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { isValidEmail } from '@vastu/shared/utils';
import { t } from '../../lib/i18n';
import { showSuccess, showError } from '../../lib/notifications';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleOption {
  value: string;
  label: string;
}

export interface InviteUserModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleOption[];
}

interface FormValues {
  emails: string;
  roleId: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InviteUserModal({ opened, onClose, onSuccess, roles }: InviteUserModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      emails: '',
      roleId: '',
      message: '',
    },
    validate: {
      emails: (value) => {
        const parsed = parseEmails(value);
        if (parsed.length === 0) return t('users.invite.validation.emails');
        const invalid = parsed.filter((e) => !isValidEmail(e));
        if (invalid.length > 0) {
          return `${t('users.invite.validation.emails')} Invalid: ${invalid.join(', ')}`;
        }
        return null;
      },
      roleId: (value) => {
        if (!value) return t('users.invite.validation.role');
        return null;
      },
    },
    validateInputOnBlur: true,
  });

  function handleClose() {
    form.reset();
    onClose();
  }

  async function handleSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const emails = parseEmails(values.emails);

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          roleId: values.roleId,
          message: values.message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('users.invite.error'));
        return;
      }

      showSuccess(t('users.invite.success'));
      form.reset();
      onSuccess();
    } catch {
      showError(t('users.invite.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('users.invite.title')}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t('users.invite.emails.label')}
            placeholder={t('users.invite.emails.placeholder')}
            description={t('users.invite.emails.description')}
            {...form.getInputProps('emails')}
            required
          />

          <Select
            label={t('users.invite.role.label')}
            data={roles}
            placeholder={t('users.filter.role')}
            {...form.getInputProps('roleId')}
            required
          />

          <Textarea
            label={t('users.invite.message.label')}
            placeholder={t('users.invite.message.placeholder')}
            minRows={3}
            {...form.getInputProps('message')}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={submitting}>
              {t('users.invite.submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

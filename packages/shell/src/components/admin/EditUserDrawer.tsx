'use client';

/**
 * EditUserDrawer — Right-hand drawer for editing an existing user.
 *
 * Fields: name, email (read-only), role dropdown, deactivate toggle.
 * Actions: "Send password reset email", "Remove from organization" (destructive).
 *
 * Submits PATCH /api/admin/users/[id] for updates.
 * Submits DELETE /api/admin/users/[id] for removal.
 *
 * Validation via @mantine/form.
 * All user-facing strings through t().
 */

import { useEffect, useState } from 'react';
import { Button, Divider, Drawer, Group, Select, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { t } from '../../lib/i18n';
import { showSuccess, showError } from '../../lib/notifications';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import type { UserListItem } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleOption {
  value: string;
  label: string;
}

export interface EditUserDrawerProps {
  user: UserListItem | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleOption[];
}

interface FormValues {
  name: string;
  roleId: string;
  deactivated: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditUserDrawer({
  user,
  opened,
  onClose,
  onSuccess,
  roles,
}: EditUserDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [removingUser, setRemovingUser] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      name: user?.name ?? '',
      roleId: user?.roles[0]?.id ?? '',
      deactivated: user?.deletedAt !== null && user?.deletedAt !== undefined,
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? t('users.edit.name.label') + ' is required' : null),
      roleId: (value) => (!value ? t('users.invite.validation.role') : null),
    },
    validateInputOnBlur: true,
  });

  // Sync form values when user changes (e.g. a different row is clicked)
  useEffect(() => {
    if (user) {
      form.setValues({
        name: user.name,
        roleId: user.roles[0]?.id ?? '',
        deactivated: user.deletedAt !== null && user.deletedAt !== undefined,
      });
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function handleClose() {
    form.reset();
    onClose();
  }

  async function handleSubmit(values: FormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          roleId: values.roleId,
          deactivated: values.deactivated,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('users.edit.error'));
        return;
      }

      showSuccess(t('users.edit.success'));
      onSuccess();
      handleClose();
    } catch {
      showError(t('users.edit.error'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!user) return;
    setResetPasswordLoading(true);
    try {
      // Trigger Keycloak password reset email via the forgot-password endpoint
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        showError(t('users.edit.resetPassword.error'));
        return;
      }

      showSuccess(t('users.edit.resetPassword.success'));
    } catch {
      showError(t('users.edit.resetPassword.error'));
    } finally {
      setResetPasswordLoading(false);
    }
  }

  async function handleRemoveUser() {
    if (!user) return;
    setRemovingUser(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('users.edit.remove.error'));
        return;
      }

      showSuccess(t('users.edit.remove.success'));
      setRemoveConfirmOpen(false);
      onSuccess();
      handleClose();
    } catch {
      showError(t('users.edit.remove.error'));
    } finally {
      setRemovingUser(false);
    }
  }

  return (
    <>
      <Drawer
        opened={opened}
        onClose={handleClose}
        title={t('users.edit.title')}
        position="right"
        size="md"
        padding="lg"
      >
        {user && (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md" h="100%">
              <TextInput
                label={t('users.edit.name.label')}
                {...form.getInputProps('name')}
                required
              />

              <TextInput
                label={t('users.edit.email.label')}
                value={user.email}
                readOnly
                styles={{
                  input: {
                    color: 'var(--v-text-tertiary)',
                    cursor: 'not-allowed',
                    backgroundColor: 'var(--v-bg-surface)',
                  },
                }}
              />

              <Select
                label={t('users.edit.role.label')}
                data={roles}
                {...form.getInputProps('roleId')}
                required
              />

              <Stack gap="xs">
                <Switch
                  label={t('users.edit.deactivate.label')}
                  description={t('users.edit.deactivate.description')}
                  checked={form.values.deactivated}
                  onChange={(e) => form.setFieldValue('deactivated', e.currentTarget.checked)}
                />
              </Stack>

              <Group justify="flex-end" gap="sm" mt="sm">
                <Button variant="outline" onClick={handleClose} disabled={submitting}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" loading={submitting}>
                  {t('users.edit.save')}
                </Button>
              </Group>

              <Divider my="sm" />

              {/* Utility actions */}
              <Stack gap="sm">
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={handleResetPassword}
                  loading={resetPasswordLoading}
                  style={{ justifyContent: 'flex-start', color: 'var(--v-text-secondary)' }}
                >
                  {t('users.edit.resetPassword')}
                </Button>

                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setRemoveConfirmOpen(true)}
                  style={{ justifyContent: 'flex-start', color: 'var(--v-status-error)' }}
                >
                  {t('users.edit.remove')}
                </Button>
              </Stack>

              <Text fz="var(--v-text-xs)" style={{ color: 'var(--v-text-tertiary)' }}>
                {t('users.edit.lastAdmin')}
              </Text>
            </Stack>
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        opened={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        onConfirm={handleRemoveUser}
        title={t('users.edit.remove.confirm.title')}
        message={t('users.edit.remove.confirm.message')}
        confirmLabel={t('users.edit.remove.confirm.label')}
        variant="destructive"
        loading={removingUser}
      />
    </>
  );
}

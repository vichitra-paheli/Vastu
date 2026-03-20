'use client';

/**
 * EditRoleDrawer — Right-side drawer to edit a custom role's permissions.
 *
 * Shows:
 *   - Name (editable)
 *   - Description (editable)
 *   - Permission checklist: CRUD per resource type (checkboxes)
 *
 * On save: PATCH /api/admin/roles/[id] and calls onUpdated with the result.
 * System roles: this drawer should never be opened for them (RoleCard prevents it).
 *
 * Patterns Library §9 (Forms), §10 (Toasts)
 */

import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Drawer,
  Divider,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { t } from '@/lib/i18n';
import { showSuccess, showError } from '@/lib/notifications';
import { resources, actions } from '@vastu/shared/permissions';
import type { RoleCardRole } from './RoleCard';

const PERMISSION_RESOURCES = resources.filter((r) => r !== 'all');
const PERMISSION_ACTIONS = actions.filter(
  (a) => a !== 'manage',
) as Array<'create' | 'read' | 'update' | 'delete' | 'export' | 'configure'>;

export interface EditRolePermission {
  resource: string;
  action: string;
  granted: boolean;
}

export interface EditRoleRole extends RoleCardRole {
  permissions: EditRolePermission[];
}

export interface EditRoleDrawerProps {
  opened: boolean;
  onClose: () => void;
  onUpdated: (role: EditRoleRole) => void;
  role: EditRoleRole | null;
}

interface FormValues {
  name: string;
  description: string;
  permissions: Record<string, Record<string, boolean>>;
}

function buildPermissionState(permissions: EditRolePermission[]): Record<string, Record<string, boolean>> {
  const state: Record<string, Record<string, boolean>> = {};
  for (const resource of PERMISSION_RESOURCES) {
    state[resource] = {};
    for (const action of PERMISSION_ACTIONS) {
      state[resource][action] = false;
    }
  }
  const allowedActions = new Set<string>(PERMISSION_ACTIONS);
  for (const perm of permissions) {
    if (state[perm.resource] !== undefined && allowedActions.has(perm.action)) {
      state[perm.resource][perm.action] = perm.granted;
    }
  }
  return state;
}

export function EditRoleDrawer({ opened, onClose, onUpdated, role }: EditRoleDrawerProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      description: '',
      permissions: {},
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? t('roles.create.name.required') : null,
      description: (value) =>
        value.length > 500 ? t('roles.create.description.tooLong') : null,
    },
    validateInputOnBlur: true,
  });

  // Re-populate when a different role is opened
  useEffect(() => {
    if (role) {
      form.setValues({
        name: role.name,
        description: role.description ?? '',
        permissions: buildPermissionState(role.permissions),
      });
    }
    // Reset form errors on open
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit(values: FormValues) {
    if (!role) return;
    setSubmitting(true);

    const permissions: EditRolePermission[] = [];
    for (const [resource, actionMap] of Object.entries(values.permissions)) {
      for (const [action, granted] of Object.entries(actionMap)) {
        permissions.push({ resource, action, granted });
      }
    }

    try {
      const response = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description.trim() || null,
          permissions,
        }),
      });

      if (response.status === 409) {
        form.setFieldError('name', t('roles.create.name.conflict'));
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'), t('roles.edit.errorTitle'));
        return;
      }

      const data = (await response.json()) as {
        role: EditRoleRole & { _count?: { userRoles: number }; userCount?: number };
      };
      const updatedRole: EditRoleRole = {
        id: data.role.id,
        name: data.role.name,
        description: data.role.description,
        isSystem: data.role.isSystem,
        userCount: data.role.userCount ?? 0,
        permissions: data.role.permissions,
      };

      showSuccess(
        t('roles.edit.success').replace('{name}', updatedRole.name),
        t('roles.edit.successTitle'),
      );
      onUpdated(updatedRole);
      handleClose();
    } catch {
      showError(t('error.generic'), t('roles.edit.errorTitle'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={
        <Title order={4} fw={500} style={{ color: 'var(--v-text-primary)' }}>
          {t('roles.edit.title')}
        </Title>
      }
      position="right"
      size="lg"
    >
      {role && (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label={t('roles.create.name.label')}
              required
              {...form.getInputProps('name')}
            />

            <Textarea
              label={t('roles.create.description.label')}
              placeholder={t('roles.create.description.placeholder')}
              maxLength={500}
              autosize
              minRows={2}
              maxRows={4}
              {...form.getInputProps('description')}
            />

            <Divider
              label={
                <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
                  {t('roles.create.permissions.label')}
                </Text>
              }
              labelPosition="left"
            />

            {/* Permission checklist */}
            <Stack gap="xs">
              {/* Header row */}
              <Group gap={0} align="center">
                <Text
                  fz="var(--v-text-xs)"
                  fw={500}
                  style={{ color: 'var(--v-text-secondary)', width: 140, flexShrink: 0 }}
                >
                  {t('roles.permissions.resource')}
                </Text>
                {PERMISSION_ACTIONS.map((action) => (
                  <Text
                    key={action}
                    fz="var(--v-text-xs)"
                    fw={500}
                    ta="center"
                    style={{
                      color: 'var(--v-text-secondary)',
                      width: 72,
                      flexShrink: 0,
                      textTransform: 'capitalize',
                    }}
                  >
                    {action}
                  </Text>
                ))}
              </Group>

              {/* Resource rows */}
              {PERMISSION_RESOURCES.map((resource) => (
                <Group key={resource} gap={0} align="center">
                  <Text
                    fz="var(--v-text-sm)"
                    style={{ color: 'var(--v-text-primary)', width: 140, flexShrink: 0 }}
                  >
                    {resource}
                  </Text>
                  {PERMISSION_ACTIONS.map((action) => (
                    <Group key={action} justify="center" style={{ width: 72, flexShrink: 0 }}>
                      <Checkbox
                        aria-label={`${resource} ${action}`}
                        checked={form.values.permissions[resource]?.[action] ?? false}
                        onChange={(event) => {
                          form.setFieldValue(
                            `permissions.${resource}.${action}`,
                            event.currentTarget.checked,
                          );
                        }}
                        size="sm"
                      />
                    </Group>
                  ))}
                </Group>
              ))}
            </Stack>

            <Group justify="flex-end" gap="sm" mt="md">
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={submitting}>
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Drawer>
  );
}

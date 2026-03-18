'use client';

/**
 * CreateRoleModal — Modal form to create a new custom role.
 *
 * Fields:
 *   - Name (required, unique within org)
 *   - Description (optional, max 500 chars)
 *   - Base role (inherit from) — select from existing roles
 *   - Permission overrides — per resource × action checkboxes
 *
 * On success: calls onCreated with the new role, closes the modal.
 * On conflict (409): shows an inline error on the name field.
 *
 * Patterns Library §9 (Forms), §10 (Toasts)
 */

import { useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Select,
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

// Resources we expose in permission overrides (exclude meta-resources)
const PERMISSION_RESOURCES = resources.filter((r) => r !== 'all');
// Actions we expose
const PERMISSION_ACTIONS = actions.filter(
  (a) => a !== 'manage',
) as Array<'create' | 'read' | 'update' | 'delete' | 'export' | 'configure'>;

export interface CreatedRole extends RoleCardRole {
  permissions: Array<{ resource: string; action: string; granted: boolean }>;
}

export interface CreateRoleModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated: (role: CreatedRole) => void;
  /** Existing roles that can be selected as the base role. */
  existingRoles: RoleCardRole[];
}

interface FormValues {
  name: string;
  description: string;
  baseRoleId: string;
  permissions: Record<string, Record<string, boolean>>;
}

function buildInitialPermissions(): Record<string, Record<string, boolean>> {
  const perms: Record<string, Record<string, boolean>> = {};
  for (const resource of PERMISSION_RESOURCES) {
    perms[resource] = {};
    for (const action of PERMISSION_ACTIONS) {
      perms[resource][action] = false;
    }
  }
  return perms;
}

export function CreateRoleModal({
  opened,
  onClose,
  onCreated,
  existingRoles,
}: CreateRoleModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      description: '',
      baseRoleId: '',
      permissions: buildInitialPermissions(),
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? t('roles.create.name.required') : null,
      description: (value) =>
        value.length > 500 ? t('roles.create.description.tooLong') : null,
    },
  });

  const baseRoleOptions = existingRoles.map((r) => ({
    value: r.id,
    label: r.name,
  }));

  function handleClose() {
    form.reset();
    onClose();
  }

  async function handleSubmit(values: FormValues) {
    setSubmitting(true);

    // Collect permission overrides that are explicitly set (granted = true)
    const permissions: Array<{ resource: string; action: string; granted: boolean }> = [];
    for (const [resource, actionMap] of Object.entries(values.permissions)) {
      for (const [action, granted] of Object.entries(actionMap)) {
        if (granted) {
          permissions.push({ resource, action, granted: true });
        }
      }
    }

    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          baseRoleId: values.baseRoleId || undefined,
          permissions,
        }),
      });

      if (response.status === 409) {
        form.setFieldError('name', t('roles.create.name.conflict'));
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'), t('roles.create.errorTitle'));
        return;
      }

      const data = (await response.json()) as { role: CreatedRole };
      showSuccess(
        t('roles.create.success').replace('{name}', data.role.name),
        t('roles.create.successTitle'),
      );
      onCreated(data.role);
      handleClose();
    } catch {
      showError(t('error.generic'), t('roles.create.errorTitle'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Title order={4} fw={500} style={{ color: 'var(--v-text-primary)' }}>
          {t('roles.create.title')}
        </Title>
      }
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t('roles.create.name.label')}
            placeholder={t('roles.create.name.placeholder')}
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

          <Select
            label={t('roles.create.baseRole.label')}
            placeholder={t('roles.create.baseRole.placeholder')}
            data={baseRoleOptions}
            clearable
            {...form.getInputProps('baseRoleId')}
          />

          <Divider
            label={
              <Text fz="var(--v-text-sm)" style={{ color: 'var(--v-text-secondary)' }}>
                {t('roles.create.permissions.label')}
              </Text>
            }
            labelPosition="left"
          />

          {/* Permission overrides grid */}
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
              {t('roles.create.submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

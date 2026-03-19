'use client';

/**
 * OrganizationForm — Settings form for organization details.
 * US-015: Organization settings (admin-only).
 *
 * Fields:
 *   - Logo upload (avatar with initials fallback)
 *   - Organization name
 *   - Workspace URL (read-only with edit toggle)
 *   - Default timezone dropdown
 *   - Default language dropdown
 *
 * Includes a "Delete organization" button guarded by ConfirmDialog.
 *
 * All strings through t(). All colors via --v-* tokens.
 * Validation via @mantine/form. Save is optimistic with toast feedback.
 *
 * MCP tool equivalent: update_organization({ name, logoUrl, workspaceUrl, defaultTimezone, defaultLanguage })
 */

import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  FileButton,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPencil } from '@tabler/icons-react';
import type { Organization } from '@vastu/shared';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { showError, showSuccess } from '@/lib/notifications';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese (Simplified)' },
];

// ---------------------------------------------------------------------------
// Form values
// ---------------------------------------------------------------------------

interface OrganizationFormValues {
  name: string;
  workspaceUrl: string;
  defaultTimezone: string;
  defaultLanguage: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface OrganizationFormProps {
  organization: Organization;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(organization.logoUrl);
  const [workspaceUrlEditable, setWorkspaceUrlEditable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<OrganizationFormValues>({
    initialValues: {
      name: organization.name,
      workspaceUrl: organization.workspaceUrl ?? '',
      defaultTimezone: organization.defaultTimezone,
      defaultLanguage: organization.defaultLanguage,
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? t('org.name.required') : null,
      workspaceUrl: (value) => {
        if (!workspaceUrlEditable) return null;
        if (value.trim().length === 0) return t('org.workspaceUrl.required');
        // Allow simple slug-style values or full URLs
        const slugPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        if (!slugPattern.test(value.trim())) return t('org.workspaceUrl.invalid');
        return null;
      },
    },
    validateInputOnBlur: true,
  });

  // Derive initials from org name for avatar fallback
  const initials = organization.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  function handleLogoChange(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  async function handleSubmit(values: OrganizationFormValues) {
    setIsSaving(true);
    try {
      const body: Record<string, string> = {
        name: values.name.trim(),
        defaultTimezone: values.defaultTimezone,
        defaultLanguage: values.defaultLanguage,
      };
      if (workspaceUrlEditable && values.workspaceUrl.trim()) {
        body.workspaceUrl = values.workspaceUrl.trim();
      }

      const response = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'));
        return;
      }

      showSuccess(t('org.saved'));
      // Disable workspace URL editing after successful save
      setWorkspaceUrlEditable(false);
    } catch {
      showError(t('error.generic'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/settings/organization', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        showError(data.error ?? t('error.generic'));
        setDeleteDialogOpen(false);
        return;
      }

      // Redirect to a logout/goodbye page after deletion
      window.location.href = '/login';
    } catch {
      showError(t('error.generic'));
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  const isDirty = form.isDirty();

  return (
    <Box maw={560}>
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="lg">
          {/* Logo upload */}
          <Stack gap="xs">
            <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
              {t('org.logo.change')}
            </Text>
            <Group gap="md" align="center">
              <Avatar
                src={logoPreview}
                size={64}
                radius="md"
                style={{ border: '1px solid var(--v-border-subtle)' }}
              >
                <Text fz="var(--v-text-lg)" fw={500} c="var(--v-text-primary)">
                  {initials}
                </Text>
              </Avatar>
              <FileButton onChange={handleLogoChange} accept="image/png,image/jpeg,image/webp">
                {(props) => (
                  <Button
                    {...props}
                    variant="outline"
                    size="sm"
                    style={{
                      borderColor: 'var(--v-border-default)',
                      color: 'var(--v-text-primary)',
                    }}
                  >
                    {t('org.logo.change')}
                  </Button>
                )}
              </FileButton>
            </Group>
          </Stack>

          {/* Organization name */}
          <TextInput
            label={t('org.name.label')}
            placeholder={t('org.name.label')}
            required
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { color: 'var(--v-text-primary)', borderColor: 'var(--v-border-default)' },
            }}
            {...form.getInputProps('name')}
          />

          {/* Workspace URL — read-only with edit toggle */}
          <Stack gap={4}>
            <Group justify="space-between" align="center">
              <Text fz="var(--v-text-sm)" fw={500} c="var(--v-text-primary)">
                {t('org.workspaceUrl.label')}
              </Text>
              {!workspaceUrlEditable && (
                <UnstyledButton
                  onClick={() => setWorkspaceUrlEditable(true)}
                  aria-label={t('common.edit')}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <IconPencil size={14} color="var(--v-accent-primary)" />
                  <Text fz="var(--v-text-xs)" c="var(--v-accent-primary)">
                    {t('common.edit')}
                  </Text>
                </UnstyledButton>
              )}
            </Group>
            <TextInput
              readOnly={!workspaceUrlEditable}
              placeholder={t('org.workspaceUrl.placeholder')}
              styles={{
                input: {
                  color: workspaceUrlEditable ? 'var(--v-text-primary)' : 'var(--v-text-secondary)',
                  borderColor: 'var(--v-border-default)',
                  backgroundColor: workspaceUrlEditable
                    ? undefined
                    : 'var(--v-bg-secondary)',
                },
              }}
              {...form.getInputProps('workspaceUrl')}
            />
          </Stack>

          {/* Default timezone */}
          <Select
            label={t('org.timezone.label')}
            data={TIMEZONE_OPTIONS}
            searchable
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { color: 'var(--v-text-primary)', borderColor: 'var(--v-border-default)' },
            }}
            {...form.getInputProps('defaultTimezone')}
          />

          {/* Default language */}
          <Select
            label={t('org.language.label')}
            data={LANGUAGE_OPTIONS}
            styles={{
              label: { color: 'var(--v-text-primary)', fontWeight: 500 },
              input: { color: 'var(--v-text-primary)', borderColor: 'var(--v-border-default)' },
            }}
            {...form.getInputProps('defaultLanguage')}
          />

          {/* Save button */}
          <Group>
            <Button
              type="submit"
              loading={isSaving}
              disabled={!isDirty}
              style={{ backgroundColor: 'var(--v-accent-primary)' }}
            >
              {t('common.save')}
            </Button>
          </Group>

          <Divider style={{ borderColor: 'var(--v-border-subtle)' }} />

          {/* Danger zone: Delete organization */}
          <Stack gap="xs">
            <Text fz="var(--v-text-sm)" fw={500} c="var(--v-status-error)">
              {t('org.dangerZone.title')}
            </Text>
            <Text fz="var(--v-text-sm)" c="var(--v-text-secondary)">
              {t('org.dangerZone.description')}
            </Text>
            <Box>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                style={{
                  borderColor: 'var(--v-status-error)',
                  color: 'var(--v-status-error)',
                }}
              >
                {t('org.delete')}
              </Button>
            </Box>
          </Stack>
        </Stack>
      </form>

      <ConfirmDialog
        opened={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('org.delete')}
        message={t('org.delete.confirm')}
        confirmLabel={t('org.delete')}
        variant="destructive"
        loading={isDeleting}
      />
    </Box>
  );
}

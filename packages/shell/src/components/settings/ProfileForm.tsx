'use client';

/**
 * ProfileForm — Client component for editing user profile settings.
 *
 * Fields:
 *   - Avatar upload (AvatarUpload component)
 *   - Full name (required)
 *   - Email (read-only for SSO users, editable for credential users)
 *   - Language dropdown
 *   - Timezone dropdown
 *
 * Save button is disabled until the user makes at least one change.
 * Validates on blur via @mantine/form.
 * All strings via t(). All colors via --v-* tokens.
 *
 * Patterns Library §9 — Forms.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Stack,
  TextInput,
  Select,
  Button,
  Text,
  Anchor,
  Divider,
  Group,
  Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShieldCheck } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { showSuccess, showError } from '../../lib/notifications';
import { AvatarUpload } from './AvatarUpload';

// ---------------------------------------------------------------------------
// Static option lists
// ---------------------------------------------------------------------------

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileFormProps {
  /** The current user's profile data loaded from the server. */
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    language: string;
    timezone: string;
    mfaEnabled: boolean;
    organizationId: string;
  };
  /**
   * When true, the email field is read-only.
   * SSO users cannot change their email address here.
   */
  isSsoUser: boolean;
}

interface ProfileFormValues {
  name: string;
  language: string;
  timezone: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileForm({ user, isSsoUser }: ProfileFormProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    initialValues: {
      name: user.name,
      language: user.language,
      timezone: user.timezone,
    },
    validateInputOnBlur: true,
    validate: {
      name: (value) => (!value.trim() ? t('profile.name.required') : null),
    },
  });

  // The save button is disabled until the user has made at least one change.
  // form.isDirty() detects changes to form fields; avatarFile tracks avatar changes.
  const hasChanges = avatarFile !== null || form.isDirty();

  function handleAvatarChange(file: File) {
    setAvatarFile(file);
    setAvatarError(null);
  }

  async function handleSubmit(values: ProfileFormValues) {
    setIsSaving(true);

    try {
      // Step 1: Upload avatar if a new file was selected.
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadRes = await fetch('/api/settings/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          setAvatarError(t('avatarUpload.uploadError'));
          setIsSaving(false);
          return;
        }
      }

      // Step 2: Update profile fields.
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          language: values.language,
          timezone: values.timezone,
        }),
      });

      if (!res.ok) {
        showError(t('profile.saveError'));
        return;
      }

      showSuccess(t('profile.saved'));
      setAvatarFile(null);
    } catch {
      showError(t('error.generic'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Stack gap="xl" style={{ maxWidth: 480 }}>
      {/* Avatar */}
      <AvatarUpload
        avatarUrl={user.avatarUrl}
        name={user.name}
        onChange={handleAvatarChange}
        error={avatarError}
      />

      {/* Profile fields */}
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label={t('profile.name.label')}
            placeholder={t('profile.name.placeholder')}
            required
            withAsterisk
            {...form.getInputProps('name')}
          />

          <TextInput
            label={t('profile.email.label')}
            value={user.email}
            readOnly
            disabled={isSsoUser}
            description={isSsoUser ? t('profile.email.readOnly') : undefined}
            styles={{
              input: {
                color: 'var(--v-text-secondary)',
                backgroundColor: 'var(--v-bg-secondary)',
                cursor: 'default',
              },
            }}
          />

          <Select
            label={t('profile.language.label')}
            data={LANGUAGE_OPTIONS}
            comboboxProps={{ keepMounted: false }}
            {...form.getInputProps('language')}
          />

          <Select
            label={t('profile.timezone.label')}
            data={TIMEZONE_OPTIONS}
            searchable
            comboboxProps={{ keepMounted: false }}
            {...form.getInputProps('timezone')}
          />

          <Button
            type="submit"
            loading={isSaving}
            disabled={!hasChanges}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: hasChanges ? 'var(--v-accent-primary)' : undefined,
            }}
          >
            {t('common.save')}
          </Button>
        </Stack>
      </form>

      {/* Security section */}
      <Divider />

      <Stack gap="sm">
        <Text
          fw={500}
          fz="var(--v-text-md)"
          c="var(--v-text-primary)"
        >
          {t('profile.security.heading')}
        </Text>

        <Group gap="md">
          <Anchor
            component={Link}
            href="/settings/change-password"
            fz="var(--v-text-sm)"
            c="var(--v-accent-primary)"
          >
            {t('profile.changePassword')}
          </Anchor>

          {user.mfaEnabled ? (
            <Group gap="xs">
              <Anchor
                component={Link}
                href="/mfa/setup"
                fz="var(--v-text-sm)"
                c="var(--v-accent-primary)"
              >
                {t('profile.setupMfa')}
              </Anchor>
              <Badge
                size="xs"
                variant="light"
                leftSection={<IconShieldCheck size={10} />}
                style={{
                  backgroundColor: 'var(--v-status-success-light)',
                  color: 'var(--v-status-success)',
                }}
              >
                {t('profile.mfaEnabled')}
              </Badge>
            </Group>
          ) : (
            <Anchor
              component={Link}
              href="/mfa/setup"
              fz="var(--v-text-sm)"
              c="var(--v-accent-primary)"
            >
              {t('profile.setupMfa')}
            </Anchor>
          )}
        </Group>
      </Stack>
    </Stack>
  );
}

'use client';

/**
 * AvatarUpload — Circle avatar with initials fallback and click-to-upload.
 *
 * Design:
 * - Circle avatar (80px diameter)
 * - Shows uploaded image when an avatarUrl is provided or a file has been selected
 * - Falls back to user initials when no image is available
 * - Click opens a hidden file input; accepts JPG and PNG only, max 2MB
 * - Invalid file: shows inline error (format or size)
 *
 * All colors via --v-* CSS tokens. All strings via t().
 * Patterns Library §9 — inline validation on blur / on change.
 */

import React, { useRef, useState } from 'react';
import { Avatar, Box, Text, ActionIcon, Tooltip } from '@mantine/core';
import { IconCamera } from '@tabler/icons-react';
import { t } from '@/lib/i18n';

const AVATAR_SIZE = 80;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

/**
 * Derive initials from a full name (up to two characters).
 * "Alice Smith" → "AS", "Alice" → "A", "" → "?"
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export interface AvatarUploadProps {
  /** Current avatar URL (from DB). Pass null/undefined when no avatar is set. */
  avatarUrl?: string | null;
  /** The user's full name — used to derive initials when no image is available. */
  name: string;
  /** Called when the user selects a valid file. */
  onChange: (file: File) => void;
  /** Error message to display below the avatar (e.g. from the server). */
  error?: string | null;
}

export function AvatarUpload({ avatarUrl, name, onChange, error: externalError }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const displaySrc = preview ?? avatarUrl ?? undefined;
  const initials = getInitials(name);
  const displayError = inlineError ?? externalError ?? null;

  function handleClick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input value so re-selecting the same file triggers onChange again.
    e.target.value = '';
    setInlineError(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setInlineError(t('avatarUpload.error.format'));
      return;
    }

    if (file.size > MAX_BYTES) {
      setInlineError(t('avatarUpload.error.size'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange(file);
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--v-space-2)' }}>
      <Box style={{ position: 'relative', display: 'inline-flex' }}>
        <Avatar
          src={displaySrc}
          size={AVATAR_SIZE}
          radius={AVATAR_SIZE}
          style={{
            backgroundColor: 'var(--v-accent-primary-light)',
            color: 'var(--v-accent-primary)',
            fontWeight: 'var(--v-font-medium)',
            fontSize: 'var(--v-text-xl)',
            border: '2px solid var(--v-border-default)',
          }}
        >
          {displaySrc ? null : initials}
        </Avatar>

        {/* Overlay camera icon */}
        <Tooltip label={t('profile.avatar.change')}>
          <ActionIcon
            onClick={handleClick}
            variant="filled"
            radius="xl"
            size={28}
            aria-label={t('profile.avatar.change')}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: 'var(--v-accent-primary)',
              color: 'var(--v-text-inverse)',
              border: '2px solid var(--v-bg-primary)',
            }}
          >
            <IconCamera size={14} />
          </ActionIcon>
        </Tooltip>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
        />
      </Box>

      {displayError && (
        <Text
          fz="var(--v-text-sm)"
          c="var(--v-status-error)"
          role="alert"
        >
          {displayError}
        </Text>
      )}
    </Box>
  );
}

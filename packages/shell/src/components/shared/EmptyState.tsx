'use client';

/**
 * EmptyState — Contextual empty data state component.
 * Patterns Library §8 — Empty states.
 *
 * Shows an icon, a message, and an optional action button.
 * Never generic: always explain the context and what the user can do.
 */

import { Button, Stack, Text } from '@mantine/core';
import type { ElementType } from 'react';

export interface EmptyStateProps {
  /** A Tabler icon component (e.g. IconTable, IconSearch). Rendered at 32px. */
  icon: ElementType;
  /** One sentence explaining what's empty and why. */
  message: string;
  /** Label for the optional action button. */
  actionLabel?: string;
  /** Callback fired when the action button is clicked. */
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Stack align="center" gap="sm" py="xl">
      <Icon
        size={32}
        stroke={1.5}
        style={{ color: 'var(--v-text-tertiary)' }}
        aria-hidden="true"
      />
      <Text
        size="md"
        ta="center"
        style={{ color: 'var(--v-text-secondary)' }}
      >
        {message}
      </Text>
      {actionLabel !== undefined && onAction !== undefined && (
        <Button variant="filled" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
}

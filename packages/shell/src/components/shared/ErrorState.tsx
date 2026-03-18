'use client';

/**
 * ErrorState — Error state with retry action.
 * Patterns Library §6.3 — Transition rules (error after loading).
 *
 * Content disappears and this error message fades in.
 * Never show both stale content and an error simultaneously.
 */

import { Button, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Stack align="center" gap="md" py="xl">
      <IconAlertCircle
        size={32}
        stroke={1.5}
        style={{ color: 'var(--v-status-error)' }}
        aria-hidden="true"
      />
      <Text ta="center" style={{ color: 'var(--v-text-secondary)' }}>
        {message}
      </Text>
      {onRetry && (
        <Button variant="light" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Stack>
  );
}

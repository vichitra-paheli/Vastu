'use client';

/**
 * ConfirmDialog — Confirmation dialog for destructive or warning actions.
 * Style Guide SS 9.1 Modal + Patterns Library §10.
 *
 * Uses Mantine Modal with title, description, cancel, and confirm buttons.
 * Destructive variant uses --v-status-error for the confirm button.
 * Warning variant uses --v-status-warning for the confirm button.
 */

import { Button, Group, Modal, Text } from '@mantine/core';

export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  opened: boolean;
  /** Called when the dialog should close (cancel or backdrop click). */
  onClose: () => void;
  /** Called when the user confirms the action. */
  onConfirm: () => void;
  /** Dialog title. */
  title: string;
  /** Description or impact text shown in the dialog body. */
  message: string;
  /** Label for the confirm button. Default: "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Default: "Cancel". */
  cancelLabel?: string;
  /** Visual variant affecting the confirm button color. Default: "destructive". */
  variant?: 'destructive' | 'warning';
  /** When true the confirm button shows a loading spinner and is disabled. */
  loading?: boolean;
}

const CONFIRM_BUTTON_COLOR: Record<'destructive' | 'warning', string> = {
  destructive: 'var(--v-status-error)',
  warning: 'var(--v-status-warning)',
};

export function ConfirmDialog({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <Text size="md" style={{ color: 'var(--v-text-secondary)' }} mb="lg">
        {message}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant="filled"
          onClick={onConfirm}
          loading={loading}
          style={{ backgroundColor: CONFIRM_BUTTON_COLOR[variant] }}
        >
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}

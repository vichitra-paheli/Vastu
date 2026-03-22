'use client';

/**
 * ConfirmDialog — shared confirmation modal for destructive actions.
 *
 * Three variants:
 *   - delete  : red action button (irreversible actions: delete view, record, etc.)
 *   - warning : amber action button (caution-level actions)
 *   - info    : blue action button (informational confirmations)
 *
 * Implements US-138 (AC-1, AC-3, AC-4, AC-5) for view-engine fixes (US-121 AC-7).
 *
 * Focus is trapped inside the dialog. The action button is NOT auto-focused to
 * prevent accidental Enter confirmation (AC-5). Escape and click-outside cancel.
 */

import React from 'react';
import { Modal, Button, Group, Text } from '@mantine/core';
import { t } from '../../lib/i18n';
import classes from './ConfirmDialog.module.css';

export type ConfirmDialogVariant = 'delete' | 'warning' | 'info';

export interface ConfirmDialogProps {
  /** Whether the dialog is visible. */
  opened: boolean;
  /** Title shown at the top of the dialog. */
  title: string;
  /**
   * Impact description — explains what will happen.
   * Displayed as body text below the title.
   */
  description: string;
  /** Label for the confirm action button. Defaults to a variant-specific i18n string. */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to the i18n cancel string. */
  cancelLabel?: string;
  /** Visual variant that controls the confirm button color. */
  variant?: ConfirmDialogVariant;
  /** Called when the user confirms the action. */
  onConfirm: () => void;
  /** Called when the user cancels (Escape, click-outside, or Cancel button). */
  onCancel: () => void;
}

/** Map variant to Mantine button color. */
const VARIANT_COLOR: Record<ConfirmDialogVariant, string> = {
  delete: 'red',
  warning: 'yellow',
  info: 'blue',
};

/** Map variant to the i18n key for the default confirm label. */
const VARIANT_LABEL_KEY: Record<ConfirmDialogVariant, string> = {
  delete: 'confirm.delete.label',
  warning: 'confirm.warning.label',
  info: 'confirm.info.label',
};

export function ConfirmDialog({
  opened,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const actionLabel = confirmLabel ?? t(VARIANT_LABEL_KEY[variant]);
  const resolvedCancelLabel = cancelLabel ?? t('confirm.cancel.label');
  const actionColor = VARIANT_COLOR[variant];

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      centered
      size="sm"
      trapFocus
      // Do NOT auto-focus the confirm button (AC-5).
      // Modal will focus the close (×) button by default, keeping Enter safe.
      className={classes.modal}
      overlayProps={{ backgroundOpacity: 0.4 }}
    >
      <Text size="sm" c="var(--v-text-secondary)" className={classes.description}>
        {description}
      </Text>

      <Group justify="flex-end" mt="md" gap="sm">
        <Button
          variant="subtle"
          size="sm"
          onClick={onCancel}
          className={classes.cancelButton}
          // Cancel gets focus first — safer default for keyboard users.
          data-autofocus
        >
          {resolvedCancelLabel}
        </Button>
        <Button
          color={actionColor}
          size="sm"
          onClick={onConfirm}
          className={classes.actionButton}
        >
          {actionLabel}
        </Button>
      </Group>
    </Modal>
  );
}

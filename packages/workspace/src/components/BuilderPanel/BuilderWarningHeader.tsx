'use client';

/**
 * BuilderWarningHeader — amber warning bar shown at the top of the builder panel.
 *
 * Displays:
 *   "Page configuration — changes apply to all users. Requires builder or admin role."
 *
 * With "Discard" and "Save config" action buttons on the right.
 *
 * Discard requires confirmation via a warning-variant ConfirmDialog before
 * calling the onDiscard prop (AC-3).
 *
 * Implements US-136 AC-3.
 */

import React from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { useConfirmDialog } from '../ConfirmDialog/useConfirmDialog';
import { TruncatedText } from '../TruncatedText';
import classes from './BuilderPanel.module.css';

export interface BuilderWarningHeaderProps {
  /** Whether the config has unsaved changes (enables discard). */
  isDirty: boolean;
  /** Whether a save is in progress. */
  isSaving: boolean;
  /** Called when user clicks "Discard" and confirms the dialog. */
  onDiscard: () => void;
  /** Called when user clicks "Save config". */
  onSave: () => void;
}

export function BuilderWarningHeader({
  isDirty,
  isSaving,
  onDiscard,
  onSave,
}: BuilderWarningHeaderProps) {
  const confirm = useConfirmDialog();

  async function handleDiscard() {
    const confirmed = await confirm({
      title: t('builder.warning.discardConfirmTitle'),
      description: t('builder.warning.discardConfirmDescription'),
      variant: 'warning',
      confirmLabel: t('builder.warning.discardConfirmLabel'),
    });
    if (confirmed) {
      onDiscard();
    }
  }

  return (
    <div className={classes.warningHeader} role="banner" aria-label={t('builder.warning.ariaLabel')}>
      <div className={classes.warningContent}>
        <IconAlertTriangle size={16} className={classes.warningIcon} aria-hidden="true" />
        <span className={classes.warningText}>
          <TruncatedText>{t('builder.warning.message')}</TruncatedText>
        </span>
      </div>
      <div className={classes.warningActions}>
        <button
          type="button"
          className={classes.discardButton}
          onClick={() => void handleDiscard()}
          disabled={!isDirty || isSaving}
          aria-label={t('builder.warning.discardAriaLabel')}
        >
          {t('builder.warning.discard')}
        </button>
        <button
          type="button"
          className={classes.saveButton}
          onClick={onSave}
          disabled={!isDirty || isSaving}
          aria-label={t('builder.warning.saveAriaLabel')}
        >
          {isSaving ? t('builder.warning.saving') : t('builder.warning.save')}
        </button>
      </div>
    </div>
  );
}

'use client';

/**
 * EditGridMode — banner shown when dashboard edit mode is active.
 *
 * Provides:
 * - Edit mode active indicator / banner
 * - "Done editing" / "Add card" buttons in the banner
 *
 * The actual drag-to-reorder and resize controls are handled by DashboardCard.
 *
 * Implements US-137 AC-6.
 */

import React from 'react';
import { Button } from '@mantine/core';
import { IconPlus, IconCheck } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import classes from './DashboardTemplate.module.css';

export interface EditGridModeBannerProps {
  /** Called when "Done editing" is clicked. */
  onDone: () => void;
  /** Called when "Add card" is clicked inside the banner. */
  onAddCard: () => void;
}

export function EditGridModeBanner({ onDone, onAddCard }: EditGridModeBannerProps) {
  return (
    <div className={classes.editModeBanner} data-testid="edit-mode-banner" role="status">
      <span>{t('dashboard.editMode.active')}</span>
      <div className={classes.editModeBannerActions}>
        <Button
          size="xs"
          variant="white"
          color="dark"
          leftSection={<IconPlus size={14} aria-hidden="true" />}
          onClick={onAddCard}
          aria-label={t('dashboard.addCard.ariaLabel')}
          data-testid="edit-mode-add-card"
        >
          {t('dashboard.addCard.label')}
        </Button>
        <Button
          size="xs"
          variant="white"
          color="dark"
          leftSection={<IconCheck size={14} aria-hidden="true" />}
          onClick={onDone}
          aria-label={t('dashboard.editMode.doneAriaLabel')}
          data-testid="edit-mode-done"
        >
          {t('dashboard.editMode.done')}
        </Button>
      </div>
    </div>
  );
}

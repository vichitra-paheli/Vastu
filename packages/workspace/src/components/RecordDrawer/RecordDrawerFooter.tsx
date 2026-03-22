'use client';

/**
 * RecordDrawerFooter — sticky footer bar for the record detail drawer.
 *
 * Shows:
 * - "Last modified by {user} on {date}" metadata text (always visible).
 * - "Save" and "Cancel" action buttons (only when the form is dirty).
 *
 * Implements US-128e.
 */

import React, { useCallback, useState } from 'react';
import { Button } from '@mantine/core';
import { t } from '../../lib/i18n';
import type { RecordDetail } from './RecordDrawer';
import classes from './RecordDrawerFooter.module.css';

interface RecordDrawerFooterProps {
  record: RecordDetail | null;
  /** Whether the form has unsaved changes. Controls Save/Cancel visibility. */
  dirty: boolean;
  /** Called when the user clicks Save. Should persist changes and mark clean. */
  onSave: () => void | Promise<void>;
  /** Called when the user clicks Cancel. Should discard changes. */
  onCancel: () => void;
}

/** Format ISO date to short human-readable. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function RecordDrawerFooter({
  record,
  dirty,
  onSave,
  onCancel,
}: RecordDrawerFooterProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const modifiedText = record
    ? t('drawer.footer.modifiedBy', {
        user: record.updatedBy ?? t('drawer.footer.unknownUser'),
        date: formatDate(record.updatedAt),
      })
    : '';

  return (
    <div className={classes.footer}>
      {/* Last-modified meta */}
      {record && (
        <span className={classes.meta}>
          <span className={classes.metaLabel}>{t('drawer.footer.modifiedLabel')} </span>
          {modifiedText}
        </span>
      )}

      {/* Save / Cancel (only shown when dirty) */}
      {dirty && (
        <div className={classes.editActions}>
          <Button
            size="xs"
            variant="subtle"
            onClick={onCancel}
            disabled={saving}
            aria-label={t('drawer.footer.cancelAriaLabel')}
          >
            {t('drawer.footer.cancel')}
          </Button>
          <Button
            size="xs"
            onClick={handleSave}
            loading={saving}
            aria-label={t('drawer.footer.saveAriaLabel')}
          >
            {t('drawer.footer.save')}
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * RecordDrawerHeader — title, badge, navigation, and close button.
 *
 * Features:
 * - Inline-editable title (click to edit, Enter or blur to confirm)
 * - Record type badge
 * - Prev / Next navigation arrows (driven by drawerStore.navigationStack)
 * - Actions dropdown: "Open in panel", "Copy link", "Delete" (see RecordDrawerActions)
 * - Close (X) button
 *
 * Implements US-128b.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Skeleton, Tooltip } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';
import { useDrawerStore } from '../../stores/drawerStore';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../TruncatedText';
import type { RecordDetail } from './RecordDrawer';
import { RecordDrawerActions } from './RecordDrawerActions';
import classes from './RecordDrawerHeader.module.css';

interface RecordDrawerHeaderProps {
  record: RecordDetail | null;
  loading: boolean;
  onClose: () => void;
  /** Called when the user saves an edited title. */
  onRenameRecord?: (id: string, newTitle: string) => Promise<void>;
  /** Called when the user confirms deletion of the record. */
  onDeleteRecord?: (id: string) => Promise<void>;
}

export function RecordDrawerHeader({
  record,
  loading,
  onClose,
  onRenameRecord,
  onDeleteRecord,
}: RecordDrawerHeaderProps) {
  const navigationStack = useDrawerStore((s) => s.navigationStack);
  const navigationIndex = useDrawerStore((s) => s.navigationIndex);
  const goBack = useDrawerStore((s) => s.goBack);
  const goForward = useDrawerStore((s) => s.goForward);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const hasPrev = navigationStack.length > 0 && navigationIndex > 0;
  const hasNext = navigationStack.length > 0 && navigationIndex < navigationStack.length - 1;

  // ── Inline title edit ──────────────────────────────────────────────────

  const startEditing = useCallback(() => {
    if (!record) return;
    setTitleValue(record.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }, [record]);

  const commitEdit = useCallback(async () => {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (!record || !trimmed || trimmed === record.title) return;
    await onRenameRecord?.(record.id, trimmed);
  }, [record, titleValue, onRenameRecord]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') {
        setEditingTitle(false);
        setTitleValue('');
      }
    },
    [commitEdit],
  );

  if (loading) {
    return (
      <div className={classes.headerSkeleton}>
        <Skeleton height={12} width="40%" />
        <Skeleton height={18} width="70%" />
      </div>
    );
  }

  return (
    <div className={classes.header}>
      {/* Top row: navigation + actions + close */}
      <div className={classes.topRow}>
        {/* Prev / Next navigation */}
        {navigationStack.length > 0 && (
          <div className={classes.navGroup}>
            <Tooltip label={t('drawer.nav.prev')} withArrow position="bottom">
              <button
                className={classes.iconButton}
                onClick={goBack}
                disabled={!hasPrev}
                aria-label={t('drawer.nav.prev')}
              >
                <IconChevronLeft size={16} aria-hidden="true" />
              </button>
            </Tooltip>

            <span className={classes.navCounter} aria-live="polite">
              {navigationIndex + 1} / {navigationStack.length}
            </span>

            <Tooltip label={t('drawer.nav.next')} withArrow position="bottom">
              <button
                className={classes.iconButton}
                onClick={goForward}
                disabled={!hasNext}
                aria-label={t('drawer.nav.next')}
              >
                <IconChevronRight size={16} aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        )}

        {/* Actions dropdown + close */}
        <div className={classes.actionsGroup}>
          <RecordDrawerActions
            record={record}
            onClose={onClose}
            onDeleteRecord={onDeleteRecord}
          />

          {/* Close button */}
          <Tooltip label={t('drawer.close')} withArrow position="bottom">
            <button
              className={classes.iconButton}
              onClick={onClose}
              aria-label={t('drawer.close')}
              // autoFocus so focus lands on a safe, visible element when drawer opens
              autoFocus
            >
              <IconX size={16} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Title row */}
      <div className={classes.titleRow}>
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className={classes.titleInput}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleTitleKeyDown}
            aria-label={t('drawer.title.editAriaLabel')}
          />
        ) : (
          <button
            className={classes.title}
            onClick={startEditing}
            title={record?.title ?? ''}
            aria-label={t('drawer.title.editAriaLabel')}
          >
            <TruncatedText>{record?.title ?? '—'}</TruncatedText>
          </button>
        )}

        {record?.type && (
          <span className={classes.typeBadge}>{record.type}</span>
        )}
      </div>
    </div>
  );
}

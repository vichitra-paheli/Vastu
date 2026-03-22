'use client';

/**
 * RecordDrawerHeader — title, badge, navigation, actions, and close button.
 *
 * Features:
 * - Inline-editable title (click to edit, Enter or blur to confirm)
 * - Record type badge
 * - Prev / Next navigation arrows (driven by drawerStore.navigationStack)
 * - Actions dropdown: "Open in panel", "Copy link", "Delete"
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
  IconExternalLink,
  IconLink,
  IconTrash,
  IconDots,
} from '@tabler/icons-react';
import { useDrawerStore } from '../../stores/drawerStore';
import { useConfirmDialog } from '../ConfirmDialog/useConfirmDialog';
import { useDrawerToPanel } from '../../hooks/useDrawerToPanel';
import { t } from '../../lib/i18n';
import type { RecordDetail } from './RecordDrawer';
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const confirm = useConfirmDialog();
  const openInPanel = useDrawerToPanel();

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

  // ── Actions menu ───────────────────────────────────────────────────────

  const toggleActions = useCallback(() => {
    setActionsOpen((v) => !v);
  }, []);

  const handleOpenInPanel = useCallback(() => {
    setActionsOpen(false);
    if (record) openInPanel(record.id);
  }, [record, openInPanel]);

  const handleCopyLink = useCallback(() => {
    setActionsOpen(false);
    if (!record) return;
    const url = `${window.location.origin}/records/${record.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [record]);

  const handleDelete = useCallback(async () => {
    setActionsOpen(false);
    if (!record) return;
    const ok = await confirm({
      title: t('drawer.delete.title'),
      description: t('drawer.delete.description'),
      variant: 'delete',
    });
    if (ok) {
      await onDeleteRecord?.(record.id);
      onClose();
    }
  }, [record, confirm, onDeleteRecord, onClose]);

  // Close actions menu on outside click
  const handleActionsMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionsOpen(false);
        actionsButtonRef.current?.focus();
      }
    },
    [],
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
          {/* Actions menu */}
          <div style={{ position: 'relative' }}>
            <Tooltip label={t('drawer.actions.menuAriaLabel')} withArrow position="bottom">
              <button
                ref={actionsButtonRef}
                className={classes.iconButton}
                onClick={toggleActions}
                aria-label={t('drawer.actions.menuAriaLabel')}
                aria-haspopup="menu"
                aria-expanded={actionsOpen}
              >
                <IconDots size={16} aria-hidden="true" />
              </button>
            </Tooltip>

            {actionsOpen && (
              <>
                {/* Click-outside capture */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 1 }}
                  onClick={() => setActionsOpen(false)}
                  aria-hidden="true"
                />
                <div
                  ref={actionsMenuRef}
                  role="menu"
                  aria-label={t('drawer.actions.menuAriaLabel')}
                  onKeyDown={handleActionsMenuKeyDown}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    zIndex: 2,
                    background: 'var(--v-bg-elevated)',
                    border: '1px solid var(--v-border-default)',
                    borderRadius: 'var(--v-radius-lg)',
                    boxShadow: 'var(--v-shadow-lg)',
                    minWidth: 180,
                    padding: '4px 0',
                  }}
                >
                  <ActionMenuItem
                    icon={<IconExternalLink size={14} />}
                    label={t('drawer.actions.openInPanel')}
                    onClick={handleOpenInPanel}
                  />
                  <ActionMenuItem
                    icon={<IconLink size={14} />}
                    label={t('drawer.actions.copyLink')}
                    onClick={handleCopyLink}
                  />
                  <div
                    style={{
                      height: 1,
                      margin: '4px 0',
                      background: 'var(--v-border-subtle)',
                    }}
                    role="separator"
                  />
                  <ActionMenuItem
                    icon={<IconTrash size={14} />}
                    label={t('drawer.actions.delete')}
                    onClick={handleDelete}
                    destructive
                  />
                </div>
              </>
            )}
          </div>

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
            {record?.title ?? '—'}
          </button>
        )}

        {record?.type && (
          <span className={classes.typeBadge}>{record.type}</span>
        )}
      </div>
    </div>
  );
}

// ── ActionMenuItem ────────────────────────────────────────────────────────

interface ActionMenuItemProps {
  icon: React.ReactElement;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function ActionMenuItem({ icon, label, onClick, destructive = false }: ActionMenuItemProps) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 12px',
        fontSize: 'var(--v-text-sm)',
        fontFamily: 'var(--v-font-sans)',
        fontWeight: 'var(--v-font-regular)',
        color: destructive ? 'var(--v-status-error)' : 'var(--v-text-primary)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color var(--v-duration-fast) var(--v-ease-default)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = destructive
          ? 'var(--v-status-error-light)'
          : 'var(--v-interactive-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', color: 'inherit' }} aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}

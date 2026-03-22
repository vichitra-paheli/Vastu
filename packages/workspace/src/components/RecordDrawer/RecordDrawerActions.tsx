'use client';

/**
 * RecordDrawerActions — actions dropdown menu for the record drawer header.
 *
 * Contains: "Open in panel", "Copy link", "Delete" (with confirm dialog).
 * Extracted from RecordDrawerHeader to keep that component under 200 lines.
 *
 * Implements US-128b.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Tooltip } from '@mantine/core';
import {
  IconDots,
  IconExternalLink,
  IconLink,
  IconTrash,
} from '@tabler/icons-react';
import { useConfirmDialog } from '../ConfirmDialog/useConfirmDialog';
import { useDrawerToPanel } from '../../hooks/useDrawerToPanel';
import { t } from '../../lib/i18n';
import type { RecordDetail } from './RecordDrawer';
import classes from './RecordDrawerHeader.module.css';

interface RecordDrawerActionsProps {
  record: RecordDetail | null;
  onClose: () => void;
  onDeleteRecord?: (id: string) => Promise<void>;
}

export function RecordDrawerActions({
  record,
  onClose,
  onDeleteRecord,
}: RecordDrawerActionsProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const confirm = useConfirmDialog();
  const openInPanel = useDrawerToPanel();

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

  const handleActionsMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionsOpen(false);
        actionsButtonRef.current?.focus();
      }
    },
    [],
  );

  return (
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

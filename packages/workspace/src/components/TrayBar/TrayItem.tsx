'use client';

/**
 * TrayItem — a single minimized panel chip in the tray bar.
 *
 * Displays the panel icon (if available) and a truncated title.
 * - Left-click: restores the panel to Dockview.
 * - Right-click: opens a context menu with a "Close" action.
 *
 * Keyboard:
 * - Enter / Space: restore panel.
 * - Context menu (Shift+F10 or menu key): same as right-click.
 *
 * ARIA:
 * - role="button" with aria-label describing the panel title.
 *
 * Implements US-115 (AC-2, AC-3, AC-4, AC-5).
 */

import React from 'react';
import { IconLayoutNavbarCollapse, IconX } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../TruncatedText';
import type { TrayItem as TrayItemData } from '../../stores/trayStore';
import classes from './TrayItem.module.css';

export interface TrayItemProps {
  /** The tray item data to display. */
  item: TrayItemData;
  /** Called when the user clicks to restore the panel. */
  onRestore: (panelId: string) => void;
  /** Called when the user chooses to close/remove the panel permanently. */
  onClose: (panelId: string) => void;
}

/** Maximum title width in the tray chip (px). */
const TRAY_ITEM_MAX_WIDTH = 140;

export function TrayItem({ item, onRestore, onClose }: TrayItemProps) {
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  function handleClick() {
    onRestore(item.panelId);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRestore(item.panelId);
    }
  }

  function openContextMenu(x: number, y: number) {
    setMenuPosition({ x, y });
    setContextMenuOpen(true);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY);
  }

  function handleMenuKey(e: React.KeyboardEvent) {
    // Shift+F10 or ContextMenu key
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        openContextMenu(rect.left, rect.bottom + 4);
      }
    }
  }

  function handleCloseMenu() {
    setContextMenuOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }

  function handleCloseAction() {
    setContextMenuOpen(false);
    onClose(item.panelId);
  }

  const ariaLabel = t('tray.item.ariaLabel').replace('{title}', item.title);

  return (
    <div className={classes.wrapper}>
      <button
        ref={buttonRef}
        type="button"
        className={classes.chip}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          handleKeyDown(e);
          handleMenuKey(e);
        }}
        aria-label={ariaLabel}
        title={item.title}
        data-context="true"
        data-context-type="tray-item"
        data-context-value={item.panelId}
      >
        <span className={classes.icon} aria-hidden="true">
          <IconLayoutNavbarCollapse size="var(--v-icon-xs)" stroke={1.5} />
        </span>
        <TruncatedText className={classes.title} maxWidth={TRAY_ITEM_MAX_WIDTH}>
          {item.title}
        </TruncatedText>
      </button>

      {contextMenuOpen && (
        <TrayItemContextMenu
          position={menuPosition}
          onClose={handleCloseAction}
          onDismiss={handleCloseMenu}
        />
      )}
    </div>
  );
}

// ─── Inline context menu for tray items ──────────────────────────────────────

interface TrayItemContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onDismiss: () => void;
}

function TrayItemContextMenu({ position, onClose, onDismiss }: TrayItemContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onDismiss]);

  // Focus first item when menu opens
  React.useEffect(() => {
    requestAnimationFrame(() => {
      const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      first?.focus();
    });
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onDismiss();
    }
  }

  // Adjust position so menu stays in viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 160),
    top: Math.min(position.y, window.innerHeight - 60),
    zIndex: 'var(--v-z-dropdown)' as unknown as number,
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('tray.item.contextMenuAriaLabel')}
      className={classes.contextMenu}
      style={style}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button
        type="button"
        role="menuitem"
        className={classes.contextMenuItem}
        onClick={onClose}
        tabIndex={-1}
      >
        <IconX size="var(--v-icon-xs)" stroke={1.5} aria-hidden="true" />
        <span>{t('tray.item.close')}</span>
      </button>
    </div>
  );
}

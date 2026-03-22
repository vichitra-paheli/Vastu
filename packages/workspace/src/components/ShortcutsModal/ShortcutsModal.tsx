'use client';

/**
 * ShortcutsModal — keyboard shortcut reference overlay.
 *
 * Displays all registered shortcuts grouped by context (General, Table,
 * Drawer, Sidebar). Each row shows:
 *   - A Mantine Kbd element per key token (modifiers + primary key)
 *   - A plain-text description
 *
 * Triggered by the "?" shortcut registered in WorkspaceShell.
 * Escape closes the modal (built-in Mantine behaviour).
 *
 * Implements US-126b.
 */

import React from 'react';
import { Modal, Kbd } from '@mantine/core';
import { t } from '../../lib/i18n';
import type { RegisteredShortcut, ShortcutGroup } from '../../hooks/useKeyboardShortcuts';
import classes from './ShortcutsModal.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Display order of groups in the modal. */
const GROUP_ORDER: ShortcutGroup[] = ['General', 'Sidebar', 'Table', 'Drawer'];

/** Human-readable label for each group. */
const GROUP_LABELS: Record<ShortcutGroup, string> = {
  General: t('shortcuts.group.general'),
  Sidebar: t('shortcuts.group.sidebar'),
  Table: t('shortcuts.group.table'),
  Drawer: t('shortcuts.group.drawer'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the display tokens for a shortcut (modifiers + primary key).
 *
 * On macOS, Meta is rendered as "⌘". On all platforms Ctrl is "Ctrl",
 * Alt is "⌥" (macOS) / "Alt", Shift is "⇧".
 *
 * We keep it simple and platform-neutral here for SSR safety.
 */
function shortcutToTokens(shortcut: RegisteredShortcut): string[] {
  const tokens: string[] = [];
  const modifiers = shortcut.modifiers ?? [];

  if (modifiers.includes('Meta')) tokens.push('⌘');
  if (modifiers.includes('Ctrl')) tokens.push('Ctrl');
  if (modifiers.includes('Alt')) tokens.push('⌥');
  if (modifiers.includes('Shift')) tokens.push('⇧');

  // Format the primary key for display.
  const key = shortcut.key;
  if (key === 'Escape') tokens.push('Esc');
  else if (key === '?') tokens.push('?');
  else if (key === '[') tokens.push('[');
  else if (key === ']') tokens.push(']');
  else tokens.push(key.toUpperCase());

  return tokens;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ShortcutRowProps {
  shortcut: RegisteredShortcut;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  const tokens = shortcutToTokens(shortcut);

  return (
    <div className={classes.row}>
      <span className={classes.description}>{shortcut.description}</span>
      <span className={classes.keys} aria-label={tokens.join(' ')}>
        {tokens.map((token, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className={classes.keySeparator} aria-hidden="true">+</span>}
            <Kbd>{token}</Kbd>
          </React.Fragment>
        ))}
      </span>
    </div>
  );
}

interface ShortcutGroupSectionProps {
  group: ShortcutGroup;
  shortcuts: RegisteredShortcut[];
}

function ShortcutGroupSection({ group, shortcuts }: ShortcutGroupSectionProps) {
  if (shortcuts.length === 0) return null;

  return (
    <div className={classes.group} data-testid={`shortcut-group-${group.toLowerCase()}`}>
      <div className={classes.groupHeader}>{GROUP_LABELS[group]}</div>
      {shortcuts.map((sc) => (
        <ShortcutRow key={sc.id} shortcut={sc} />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export interface ShortcutsModalProps {
  /** Whether the modal is open. */
  opened: boolean;
  /** Called when the modal should close. */
  onClose: () => void;
  /** Full shortcut registry — provided by useKeyboardShortcuts(). */
  shortcuts: RegisteredShortcut[];
}

/**
 * ShortcutsModal — shows all workspace keyboard shortcuts grouped by context.
 *
 * Usage:
 *   const { shortcuts } = useKeyboardShortcuts(definitions);
 *   <ShortcutsModal opened={open} onClose={() => setOpen(false)} shortcuts={shortcuts} />
 */
export function ShortcutsModal({ opened, onClose, shortcuts }: ShortcutsModalProps) {
  // Group shortcuts by their group property.
  const grouped = React.useMemo<Record<ShortcutGroup, RegisteredShortcut[]>>(() => {
    const result: Record<ShortcutGroup, RegisteredShortcut[]> = {
      General: [],
      Sidebar: [],
      Table: [],
      Drawer: [],
    };
    for (const sc of shortcuts) {
      result[sc.group].push(sc);
    }
    return result;
  }, [shortcuts]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('shortcuts.modal.title')}
      size="md"
      aria-label={t('shortcuts.modal.ariaLabel')}
    >
      <div className={classes.root} data-testid="shortcuts-modal-content">
        {GROUP_ORDER.map((group) => (
          <ShortcutGroupSection
            key={group}
            group={group}
            shortcuts={grouped[group]}
          />
        ))}
      </div>
    </Modal>
  );
}

'use client';

/**
 * ContextMenuItem — single action entry in a context menu.
 *
 * Features:
 * - Optional icon (Tabler icon, 16px)
 * - Label text
 * - Optional keyboard shortcut hint (right-aligned)
 * - Optional submenu (1 level deep) with hover/focus reveal and arrow-key navigation
 * - Disabled state
 * - Destructive variant (red text / red hover background)
 * - Keyboard support: Enter/Space to activate, ArrowRight to open submenu,
 *   ArrowLeft to close submenu
 *
 * ARIA:
 * - role="menuitem" (or "menuitem" with aria-haspopup when submenu present)
 * - aria-disabled on disabled items
 * - Submenu gets role="menu"
 *
 * Implements US-113 (AC-8, AC-10).
 */

import React from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import classes from './ContextMenu.module.css';

export interface ContextMenuItemProps {
  /** Label shown for this action. */
  label: string;
  /** Optional Tabler icon component rendered at 16px. */
  icon?: React.ReactNode;
  /** Keyboard shortcut string shown right-aligned (e.g. "⌘C"). */
  shortcut?: string;
  /** When true, item is styled as red and dangerous. */
  destructive?: boolean;
  /** When true, item is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Called when the item is activated (click or Enter/Space). */
  onSelect?: () => void;
  /** Child menu items shown in a submenu on hover/focus. Max 1 level deep. */
  submenu?: React.ReactNode;
}

export function ContextMenuItem({
  label,
  icon,
  shortcut,
  destructive = false,
  disabled = false,
  onSelect,
  submenu,
}: ContextMenuItemProps) {
  const [submenuOpen, setSubmenuOpen] = React.useState(false);
  const [submenuFlipLeft, setSubmenuFlipLeft] = React.useState(false);
  const itemRef = React.useRef<HTMLButtonElement>(null);
  const submenuRef = React.useRef<HTMLDivElement>(null);
  const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSubmenu = Boolean(submenu);

  // Determine if submenu should flip left based on available right-side space
  function checkSubmenuPosition() {
    if (!itemRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    setSubmenuFlipLeft(spaceRight < 220);
  }

  function openSubmenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    checkSubmenuPosition();
    setSubmenuOpen(true);
  }

  function closeSubmenu() {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    setSubmenuOpen(false);
  }

  function handleMouseEnter() {
    if (disabled || !hasSubmenu) return;
    openTimerRef.current = setTimeout(openSubmenu, 80);
  }

  function handleMouseLeave() {
    if (!hasSubmenu) return;
    closeTimerRef.current = setTimeout(closeSubmenu, 100);
  }

  function handleSubmenuMouseEnter() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function handleSubmenuMouseLeave() {
    closeTimerRef.current = setTimeout(closeSubmenu, 100);
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    if (hasSubmenu) {
      setSubmenuOpen((prev) => !prev);
      return;
    }
    onSelect?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ': {
        e.preventDefault();
        e.stopPropagation();
        if (hasSubmenu) {
          openSubmenu();
          // Focus first item in submenu
          requestAnimationFrame(() => {
            const first = submenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
            first?.focus();
          });
        } else {
          onSelect?.();
        }
        break;
      }
      case 'ArrowRight': {
        if (hasSubmenu) {
          e.preventDefault();
          e.stopPropagation();
          openSubmenu();
          requestAnimationFrame(() => {
            const first = submenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
            first?.focus();
          });
        }
        break;
      }
      case 'ArrowLeft': {
        if (submenuOpen) {
          e.preventDefault();
          e.stopPropagation();
          closeSubmenu();
          itemRef.current?.focus();
        }
        break;
      }
      default:
        break;
    }
  }

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const itemClasses = [
    classes.item,
    disabled ? classes.itemDisabled : '',
    destructive ? classes.itemDestructive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={hasSubmenu ? classes.submenuContainer : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={itemRef}
        type="button"
        role="menuitem"
        aria-disabled={disabled || undefined}
        aria-haspopup={hasSubmenu ? 'menu' : undefined}
        aria-expanded={hasSubmenu ? submenuOpen : undefined}
        className={itemClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {icon && <span className={classes.itemIcon} aria-hidden="true">{icon}</span>}
        <span className={classes.itemLabel}>{label}</span>
        {shortcut && !hasSubmenu && (
          <span className={classes.itemShortcut} aria-label={`Shortcut: ${shortcut}`}>
            {shortcut}
          </span>
        )}
        {hasSubmenu && (
          <span className={classes.submenuChevron} aria-hidden="true">
            <IconChevronRight size={14} />
          </span>
        )}
      </button>

      {hasSubmenu && submenuOpen && (
        <div
          ref={submenuRef}
          role="menu"
          className={`${classes.submenu} ${submenuFlipLeft ? classes.submenuLeft : ''}`}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          {submenu}
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * SidebarItem — a single navigation item in the sidebar.
 *
 * In collapsed mode: icon only, wrapped with Mantine Tooltip.
 * In expanded mode: icon + label + optional pin toggle.
 *
 * Active item is highlighted with --v-accent-primary-light background.
 * Long page names use TruncatedText.
 *
 * Note: The outer element is a <div role="button"> to allow the pin <button>
 * to be a valid nested interactive element (buttons cannot contain buttons).
 */

import React, { useRef } from 'react';
import { Tooltip } from '@mantine/core';
import { IconPin, IconPinFilled } from '@tabler/icons-react';
import classes from './SidebarNav.module.css';

interface SidebarItemProps {
  /** Unique identifier for the page/nav item. */
  id: string;
  /** Display label. */
  label: string;
  /** Icon element (Tabler icon or similar). */
  icon: React.ReactNode;
  /** Whether this item is currently active/selected. */
  active?: boolean;
  /** Whether this item is pinned. */
  pinned?: boolean;
  /** Whether pin toggle is shown (PAGES section only). */
  showPin?: boolean;
  /** Whether the sidebar is collapsed (icon-only mode). */
  collapsed?: boolean;
  /** Tooltip label when collapsed (defaults to `label`). */
  tooltipLabel?: string;
  /** Called when the item is clicked. */
  onClick?: () => void;
  /** Called when the pin toggle is clicked. */
  onPinToggle?: () => void;
  /** aria-label override for the item button (defaults to label). */
  ariaLabel?: string;
}

export function SidebarItem({
  id,
  label,
  icon,
  active = false,
  pinned = false,
  showPin = false,
  collapsed = false,
  tooltipLabel,
  onClick,
  onPinToggle,
  ariaLabel,
}: SidebarItemProps) {
  const tooltip = tooltipLabel ?? label;
  const itemRef = useRef<HTMLButtonElement>(null);

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const itemButton = (
    <button
      ref={itemRef}
      type="button"
      className={classes.navItem}
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      onKeyDown={handleItemKeyDown}
      aria-label={ariaLabel ?? label}
      aria-current={active ? 'page' : undefined}
      data-item-id={id}
    >
      {/* Icon */}
      <span className={classes.navItemIcon} aria-hidden="true">
        {icon}
      </span>

      {/* Label — hidden in collapsed mode */}
      {!collapsed && (
        <span className={classes.navItemLabel}>
          {label}
        </span>
      )}

      {/* Pin toggle — only in expanded mode, PAGES section.
          This is an absolutely-positioned element overlaid on the item row.
          It does NOT use a nested <button> inside <button>; instead it's a
          sibling rendered after the item button. */}
    </button>
  );

  // Pin toggle is rendered as a sibling to the button, not nested inside.
  const pinButton = showPin && !collapsed ? (
    <button
      type="button"
      className={classes.navItemPin}
      data-pinned={pinned ? 'true' : 'false'}
      onClick={(e) => {
        e.stopPropagation();
        onPinToggle?.();
      }}
      aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`}
      tabIndex={-1}
    >
      {pinned ? <IconPinFilled size={12} /> : <IconPin size={12} />}
    </button>
  ) : null;

  const itemRow = (
    <div className={classes.navItemRow}>
      {itemButton}
      {pinButton}
    </div>
  );

  // In collapsed mode, wrap with Mantine Tooltip for accessibility
  if (collapsed) {
    return (
      <Tooltip
        label={tooltip}
        position="right"
        openDelay={300}
        styles={{
          tooltip: {
            background: 'var(--v-bg-elevated)',
            boxShadow: 'var(--v-shadow-sm)',
            fontSize: 'var(--v-text-sm)',
            color: 'var(--v-text-primary)',
            border: '1px solid var(--v-border-default)',
          },
        }}
      >
        {itemRow}
      </Tooltip>
    );
  }

  return itemRow;
}

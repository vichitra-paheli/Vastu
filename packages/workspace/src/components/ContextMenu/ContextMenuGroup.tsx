'use client';

/**
 * ContextMenuGroup — labeled section within a context menu.
 *
 * Renders a group header (uppercase, tertiary color) followed by the
 * group's child items. Implements US-113 (AC-7): structured menu layout.
 */

import React from 'react';
import classes from './ContextMenu.module.css';

export interface ContextMenuGroupProps {
  /** Label rendered above the group's items. */
  label: string;
  /** Menu items belonging to this group. */
  children: React.ReactNode;
}

export function ContextMenuGroup({ label, children }: ContextMenuGroupProps) {
  return (
    <div role="group" aria-label={label}>
      <div className={classes.groupHeader}>{label}</div>
      {children}
    </div>
  );
}

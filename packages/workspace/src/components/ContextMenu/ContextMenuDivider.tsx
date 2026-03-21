'use client';

/**
 * ContextMenuDivider — horizontal rule separating sections of a context menu.
 *
 * Renders a visually distinct separator using the border-subtle token.
 * Implements US-113 (AC-7): menu structure separators.
 */

import React from 'react';
import classes from './ContextMenu.module.css';

export function ContextMenuDivider() {
  return <div className={classes.divider} role="separator" aria-orientation="horizontal" />;
}

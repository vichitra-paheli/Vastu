'use client';

/**
 * DropIndicator — visual drop target indicator for panel split operations.
 *
 * Shown when dragging a tab to the edge of another panel to indicate
 * the resulting split direction (left/right/top/bottom).
 *
 * Dockview handles the drag logic; this is purely a visual overlay
 * registered as a custom watermark/overlay component.
 *
 * All colors via --v-* CSS custom properties.
 */

import React from 'react';
import classes from './DropIndicator.module.css';

/**
 * The four possible drop positions.
 */
export type DropPosition = 'left' | 'right' | 'top' | 'bottom' | 'center';

interface DropIndicatorProps {
  /** Which edge this indicator is hinting at. */
  position: DropPosition;
  /** Whether this position is currently the active drop target. */
  active?: boolean;
}

export function DropIndicator({ position, active = false }: DropIndicatorProps) {
  return (
    <div
      className={`${classes.indicator} ${classes[position]} ${active ? classes.active : ''}`}
      role="presentation"
      aria-hidden="true"
    />
  );
}

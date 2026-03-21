'use client';

/**
 * TruncatedText — workspace-local text truncation component.
 *
 * Renders text with CSS ellipsis in single-line mode.
 * Used in panel tabs where the title may be long.
 *
 * For the full-featured version with Tooltip on truncation, see shell's TruncatedText.
 * This simplified version avoids adding Mantine's Tooltip dependency in the tab renderer
 * (tabs are rendered inside Dockview's shadow DOM-like container).
 */

import React from 'react';
import classes from './TruncatedText.module.css';

interface TruncatedTextProps {
  children: string;
  /** Additional CSS class names. */
  className?: string;
  /** Maximum width constraint (CSS value). */
  maxWidth?: string | number;
}

export function TruncatedText({ children, className, maxWidth }: TruncatedTextProps) {
  const style = maxWidth
    ? { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }
    : undefined;

  return (
    <span
      className={`${classes.truncated}${className ? ` ${className}` : ''}`}
      style={style}
      title={children}
    >
      {children}
    </span>
  );
}

'use client';

/**
 * EmptyState — contextual, actionable empty state component.
 *
 * Per Patterns Library §8 and Style Guide §9.3:
 * - Icon: 32px (--v-icon-xl), --v-text-tertiary color
 * - Message: one sentence, --v-text-secondary
 * - Optional action button that resolves the empty state
 * - Centers in its container regardless of size (responsive)
 *
 * Used wherever there is no content to show. Never generic — always
 * contextual. See Patterns Library §8.2 for example messages.
 *
 * Implements US-124 AC-3 (EmptyState shared component).
 */

import React from 'react';
import { Button } from '@mantine/core';
import { t } from '../../lib/i18n';
import classes from './EmptyState.module.css';

interface EmptyStateProps {
  /** Tabler icon component (or any React element) displayed at 32px. */
  icon: React.ReactElement;
  /** One sentence explaining what's empty and why. */
  message: string;
  /** Label for the optional action button. */
  actionLabel?: string;
  /** Callback invoked when the action button is clicked. */
  onAction?: () => void;
  /** Additional CSS class for the container. */
  className?: string;
}

export function EmptyState({ icon, message, actionLabel, onAction, className }: EmptyStateProps) {
  const iconEl = React.cloneElement(icon, {
    size: 32,
    'aria-hidden': true,
    className: classes.icon,
    ...icon.props,
  });

  return (
    <div
      className={`${classes.root}${className ? ` ${className}` : ''}`}
      role="status"
      aria-label={t('emptyState.ariaLabel')}
    >
      <span className={classes.iconWrapper} aria-hidden="true">
        {iconEl}
      </span>
      <p className={classes.message}>{message}</p>
      {actionLabel && onAction && (
        <Button
          size="xs"
          variant="light"
          onClick={onAction}
          className={classes.action}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

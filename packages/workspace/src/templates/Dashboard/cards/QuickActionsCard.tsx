'use client';

/**
 * QuickActionsCard — dashboard card with a list of action buttons.
 *
 * Each action navigates to a page or triggers a command.
 *
 * Implements US-137 AC-4.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { QuickActionsCardDef } from '../../../stores/dashboardStore';
import classes from '../DashboardTemplate.module.css';

export interface DashboardQuickActionsCardProps {
  card: QuickActionsCardDef;
  /** Called when an action button is clicked. */
  onAction?: (actionId: string, pageId?: string) => void;
}

export function DashboardQuickActionsCard({ card, onAction }: DashboardQuickActionsCardProps) {
  const defaultActions = React.useMemo(
    (): Array<{ id: string; label: string; icon?: string; pageId?: string }> => [
      { id: 'placeholder-1', label: t('dashboard.quickActions.placeholder') },
    ],
    [],
  );
  const actions = card.actions && card.actions.length > 0 ? card.actions : defaultActions;

  return (
    <div
      className={classes.actionList}
      role="list"
      aria-label={t('dashboard.quickActions.listAriaLabel')}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          className={classes.actionButton}
          onClick={() => onAction?.(action.id, action.pageId)}
          role="listitem"
          aria-label={action.label}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

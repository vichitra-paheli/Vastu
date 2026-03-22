'use client';

/**
 * DashboardGreeting — greeting header for the dashboard view.
 *
 * Shows:
 * - "Good morning/afternoon/evening, {name}"
 * - Current date
 * - Alert count badge (if > 0)
 * - Pending review count badge (if > 0)
 *
 * Implements US-137 AC-2.
 */

import React from 'react';
import { IconBell, IconClipboardList } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import classes from './DashboardTemplate.module.css';

export interface DashboardGreetingProps {
  /** Name to display in greeting. */
  name: string;
  /** Number of active system alerts. */
  alertCount?: number;
  /** Number of items pending review. */
  pendingReviewCount?: number;
}

/** Get the greeting prefix based on the current hour. */
function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greeting.morning');
  if (hour < 17) return t('dashboard.greeting.afternoon');
  return t('dashboard.greeting.evening');
}

/** Format the current date for display. */
function formatGreetingDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function DashboardGreeting({
  name,
  alertCount = 0,
  pendingReviewCount = 0,
}: DashboardGreetingProps) {
  const greeting = `${getGreetingPrefix()}, ${name}`;
  const dateStr = formatGreetingDate();

  return (
    <div className={classes.greeting} data-testid="dashboard-greeting">
      <div className={classes.greetingRow}>
        <h1 className={classes.greetingText}>{greeting}</h1>

        <div className={classes.greetingMeta}>
          <span className={classes.greetingDate}>{dateStr}</span>

          {alertCount > 0 && (
            <span
              className={`${classes.greetingBadge} ${classes.greetingBadgeAlert}`}
              aria-label={t('dashboard.greeting.alertCount', { count: String(alertCount) })}
              data-testid="greeting-alert-badge"
            >
              <IconBell size={12} aria-hidden="true" />
              {alertCount} {alertCount === 1 ? t('dashboard.greeting.alert') : t('dashboard.greeting.alerts')}
            </span>
          )}

          {pendingReviewCount > 0 && (
            <span
              className={`${classes.greetingBadge} ${classes.greetingBadgeReview}`}
              aria-label={t('dashboard.greeting.pendingCount', { count: String(pendingReviewCount) })}
              data-testid="greeting-review-badge"
            >
              <IconClipboardList size={12} aria-hidden="true" />
              {pendingReviewCount} {t('dashboard.greeting.pendingReview')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * AlertCard — dashboard alert card showing system alerts as warning strips.
 *
 * Shows:
 * - List of alerts (DB idle, API rate limits, SLA at-risk, etc.)
 * - "View all →" link if viewAllPageId is provided
 *
 * Implements US-137 AC-4, AC-9.
 */

import React from 'react';
import {
  IconAlertTriangle,
  IconAlertCircle,
  IconInfoCircle,
} from '@tabler/icons-react';
import { t } from '../../../lib/i18n';
import type { AlertCardDef } from '../../../stores/dashboardStore';
import classes from '../DashboardTemplate.module.css';

export interface DashboardAlertCardProps {
  card: AlertCardDef;
  /** Called when user clicks "View all →". */
  onViewAll?: (pageId: string) => void;
}

const SEVERITY_CLASSES: Record<string, string> = {
  warning: classes.alertWarning,
  error: classes.alertError,
  info: classes.alertInfo,
};

function AlertIcon({ severity }: { severity: 'warning' | 'error' | 'info' }) {
  if (severity === 'warning') return <IconAlertTriangle size={14} aria-hidden="true" />;
  if (severity === 'error') return <IconAlertCircle size={14} aria-hidden="true" />;
  return <IconInfoCircle size={14} aria-hidden="true" />;
}

export function DashboardAlertCard({ card, onViewAll }: DashboardAlertCardProps) {
  const alerts = card.alerts ?? [];

  return (
    <>
      {alerts.length === 0 ? (
        <span
          style={{
            fontSize: 'var(--v-text-xs)',
            color: 'var(--v-text-secondary)',
          }}
        >
          {t('dashboard.alerts.none')}
        </span>
      ) : (
        <div
          className={classes.alertList}
          role="list"
          aria-label={t('dashboard.alerts.listAriaLabel')}
        >
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`${classes.alertItem} ${SEVERITY_CLASSES[alert.severity] ?? classes.alertInfo}`}
              role="listitem"
              aria-label={`${alert.severity}: ${alert.message}`}
            >
              <AlertIcon severity={alert.severity} />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {card.viewAllPageId && (
        <button
          className={classes.alertViewAll}
          onClick={() => onViewAll?.(card.viewAllPageId!)}
          aria-label={t('dashboard.alerts.viewAllAriaLabel')}
        >
          {t('dashboard.alerts.viewAll')} →
        </button>
      )}
    </>
  );
}

'use client';

/**
 * TableCard — dashboard mini table card with "View all →" link.
 *
 * Shows a compact table with top rows.
 * All tables use VastuTable wrapper (here simplified for the mini card context;
 * for full feature tables, VastuTable is used in standalone panels).
 *
 * Implements US-137 AC-4.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { TableCardDef } from '../../../stores/dashboardStore';
import classes from '../DashboardTemplate.module.css';

export interface DashboardTableCardProps {
  card: TableCardDef;
  /** Called when user clicks "View all →". */
  onViewAll?: (pageId: string) => void;
}

export function DashboardTableCard({ card, onViewAll }: DashboardTableCardProps) {
  const columns = card.columns ?? [];
  const rows = card.rows ?? [];

  if (columns.length === 0) {
    return (
      <span
        style={{
          fontSize: 'var(--v-text-xs)',
          color: 'var(--v-text-secondary)',
        }}
      >
        {t('dashboard.card.table.noColumns')}
      </span>
    );
  }

  return (
    <>
      <table
        className={classes.miniTable}
        aria-label={t('dashboard.miniTable.tableAriaLabel', { title: card.title })}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={classes.miniTableHead}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={classes.miniTableCell}
                style={{ textAlign: 'center', color: 'var(--v-text-secondary)' }}
              >
                {t('dashboard.miniTable.empty')}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={classes.miniTableRow}>
                {columns.map((col) => (
                  <td key={col.key} className={classes.miniTableCell}>
                    {row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {card.viewAllPageId && (
        <button
          className={classes.viewAllLink}
          onClick={() => onViewAll?.(card.viewAllPageId!)}
          aria-label={t('dashboard.miniTable.viewAllAriaLabel', { title: card.title })}
        >
          {t('dashboard.miniTable.viewAll')} →
        </button>
      )}
    </>
  );
}

'use client';

/**
 * MiniSummaryTable — compact Top-N records table with a "View all" link.
 *
 * Designed for dashboard embedding: no pagination, no sorting, no filtering.
 * "View all" opens the related table-listing panel via the panelStore.
 *
 * Implements US-130.
 */

import React from 'react';
import { Skeleton } from '@mantine/core';
import { TruncatedText } from '../../components/TruncatedText';
import { t } from '../../lib/i18n';
import { openPanelByTypeId } from '../../stores/panelStore';
import classes from './SummaryDashboardTemplate.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MiniTableColumn {
  /** Maps to the data record key. */
  key: string;
  /** Column header label. */
  label: string;
  /** Display width hint in characters (approximate). */
  width?: string;
}

export interface MiniSummaryTableProps {
  /** Card / section title. */
  title: string;
  /** Column definitions. */
  columns: MiniTableColumn[];
  /** Data rows — each object keyed by column.key. */
  rows: Array<Record<string, string>>;
  /** When provided, the "View all" button opens this page in a new panel. */
  viewAllPageId?: string;
  /** Label for the "View all" link (overrides the default). */
  viewAllLabel?: string;
  loading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MiniSummaryTable({
  title,
  columns,
  rows,
  viewAllPageId,
  viewAllLabel,
  loading,
}: MiniSummaryTableProps) {
  function handleViewAll() {
    if (viewAllPageId) {
      openPanelByTypeId('table-listing', viewAllPageId);
    }
  }

  return (
    <div className={classes.miniTableCard} role="region" aria-label={title}>
      {/* Header row */}
      <div className={classes.miniTableHeader}>
        <span className={classes.miniTableTitle}>
          <TruncatedText>{title}</TruncatedText>
        </span>
        {viewAllPageId && (
          <button
            type="button"
            className={classes.miniTableViewAll}
            onClick={handleViewAll}
            aria-label={t('dashboard.miniTable.viewAllAriaLabel', { title })}
          >
            {viewAllLabel ?? t('dashboard.miniTable.viewAll')}
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div aria-busy="true" role="status" aria-label={t('dashboard.miniTable.loadingAriaLabel')}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={32} radius="sm" mb="xs" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className={classes.emptyConfigText}>{t('dashboard.miniTable.empty')}</p>
      ) : (
        <table className={classes.miniTable} aria-label={t('dashboard.miniTable.tableAriaLabel', { title })}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={classes.miniTableHead}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={classes.miniTableRow}>
                {columns.map((col) => (
                  <td key={col.key} className={classes.miniTableCell}>
                    <TruncatedText>{row[col.key] ?? ''}</TruncatedText>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

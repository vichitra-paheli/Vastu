'use client';

/**
 * DefaultViewSection — set the initial filter/sort/column state for new users.
 *
 * Allows admins to configure what new users see when opening the page:
 *   - Default sort column and direction
 *   - Default page size
 *   - Default visible columns (comma-separated column keys)
 *   - Default filter (free-text JSON for now — Monaco editor in Phase 3)
 *
 * These settings are stored in config.metadata.defaultView and applied
 * when a user opens the page for the first time (no saved personal view).
 *
 * Implements US-136 AC-7.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig } from '../../../templates/types';
import classes from '../BuilderPanel.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DefaultViewMetadata {
  defaultSort?: string;
  defaultSortDir?: 'asc' | 'desc';
  defaultPageSize?: number;
  defaultColumns?: string;
  defaultFilter?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface DefaultViewSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function DefaultViewSection({ config, onChange }: DefaultViewSectionProps) {
  const meta = (config.metadata ?? {}) as Record<string, unknown>;
  const dv = (meta.defaultView ?? {}) as DefaultViewMetadata;

  function setDV(patch: Partial<DefaultViewMetadata>) {
    onChange({
      metadata: {
        ...config.metadata,
        defaultView: { ...dv, ...patch },
      },
    });
  }

  // Derive available columns from config.fields
  const availableColumns = (config.fields ?? []).map((f) => f.key);

  return (
    <div data-testid="builder-default-view-section">
      <h2 className={classes.sectionTitle}>{t('builder.defaultView.title')}</h2>
      <p className={classes.hint} style={{ marginBottom: 16 }}>
        {t('builder.defaultView.hint')}
      </p>

      {/* Default sort column */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-default-sort">
          {t('builder.defaultView.sortColumn')}
        </label>
        {availableColumns.length > 0 ? (
          <select
            id="builder-default-sort"
            className={classes.fieldSelect}
            value={dv.defaultSort ?? ''}
            onChange={(e) => setDV({ defaultSort: e.target.value })}
            aria-label={t('builder.defaultView.sortColumn')}
          >
            <option value="">{t('builder.defaultView.sortColumnNone')}</option>
            {availableColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="builder-default-sort"
            type="text"
            className={classes.fieldInput}
            value={dv.defaultSort ?? ''}
            onChange={(e) => setDV({ defaultSort: e.target.value })}
            placeholder={t('builder.defaultView.sortColumnPlaceholder')}
            aria-label={t('builder.defaultView.sortColumn')}
          />
        )}
      </div>

      {/* Sort direction */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-default-sort-dir">
          {t('builder.defaultView.sortDirection')}
        </label>
        <select
          id="builder-default-sort-dir"
          className={classes.fieldSelect}
          value={dv.defaultSortDir ?? 'asc'}
          onChange={(e) => setDV({ defaultSortDir: e.target.value as 'asc' | 'desc' })}
          aria-label={t('builder.defaultView.sortDirection')}
        >
          <option value="asc">{t('builder.defaultView.sortAsc')}</option>
          <option value="desc">{t('builder.defaultView.sortDesc')}</option>
        </select>
      </div>

      {/* Default page size */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-default-page-size">
          {t('builder.defaultView.pageSize')}
        </label>
        <select
          id="builder-default-page-size"
          className={classes.fieldSelect}
          value={String(dv.defaultPageSize ?? 25)}
          onChange={(e) => setDV({ defaultPageSize: Number(e.target.value) })}
          aria-label={t('builder.defaultView.pageSize')}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Default visible columns */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-default-columns">
          {t('builder.defaultView.columns')}
        </label>
        <input
          id="builder-default-columns"
          type="text"
          className={classes.fieldInput}
          value={dv.defaultColumns ?? ''}
          onChange={(e) => setDV({ defaultColumns: e.target.value })}
          placeholder={t('builder.defaultView.columnsPlaceholder')}
          aria-label={t('builder.defaultView.columns')}
        />
        <div className={classes.hint}>{t('builder.defaultView.columnsHint')}</div>
      </div>

      {/* Default filter (JSON textarea) */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-default-filter">
          {t('builder.defaultView.filter')}
        </label>
        <textarea
          id="builder-default-filter"
          className={classes.fieldTextarea}
          value={dv.defaultFilter ?? ''}
          onChange={(e) => setDV({ defaultFilter: e.target.value })}
          placeholder={t('builder.defaultView.filterPlaceholder')}
          aria-label={t('builder.defaultView.filter')}
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
        />
        <div className={classes.hint}>{t('builder.defaultView.filterHint')}</div>
      </div>
    </div>
  );
}

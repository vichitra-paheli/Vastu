'use client';

/**
 * PageMetadataSection — configure page name, icon, description, nav order.
 *
 * Fields:
 *   - Page name (text input)
 *   - Icon picker (select from common Tabler icon names)
 *   - Description (textarea)
 *   - Nav order (number input)
 *
 * Values are stored in config.metadata.pageMetadata.
 *
 * Implements US-136 AC-10.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig } from '../../../templates/types';
import classes from '../BuilderPanel.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageMetadata {
  name?: string;
  icon?: string;
  description?: string;
  navOrder?: number;
}

// ─── Icon options ─────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  'IconTable',
  'IconLayoutDashboard',
  'IconForms',
  'IconHistory',
  'IconChartBar',
  'IconDatabase',
  'IconUsers',
  'IconSettings',
  'IconFileDescription',
  'IconList',
  'IconCalendar',
  'IconMail',
  'IconBell',
  'IconFlag',
  'IconStar',
  'IconFolder',
  'IconBookmark',
  'IconTag',
  'IconSearch',
  'IconLock',
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface PageMetadataSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function PageMetadataSection({ config, onChange }: PageMetadataSectionProps) {
  const meta = (config.metadata ?? {}) as Record<string, unknown>;
  const pm = (meta.pageMetadata ?? {}) as PageMetadata;

  function setPM(patch: Partial<PageMetadata>) {
    onChange({
      metadata: {
        ...config.metadata,
        pageMetadata: { ...pm, ...patch },
      },
    });
  }

  return (
    <div data-testid="builder-page-metadata-section">
      <h2 className={classes.sectionTitle}>{t('builder.pageMetadata.title')}</h2>

      {/* Page name */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-page-name">
          {t('builder.pageMetadata.name')}
        </label>
        <input
          id="builder-page-name"
          type="text"
          className={classes.fieldInput}
          value={pm.name ?? ''}
          onChange={(e) => setPM({ name: e.target.value })}
          placeholder={t('builder.pageMetadata.namePlaceholder')}
          aria-label={t('builder.pageMetadata.name')}
          maxLength={100}
        />
      </div>

      {/* Icon picker */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-page-icon">
          {t('builder.pageMetadata.icon')}
        </label>
        <select
          id="builder-page-icon"
          className={classes.fieldSelect}
          value={pm.icon ?? ''}
          onChange={(e) => setPM({ icon: e.target.value })}
          aria-label={t('builder.pageMetadata.icon')}
        >
          <option value="">{t('builder.pageMetadata.iconNone')}</option>
          {ICON_OPTIONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
        {pm.icon && (
          <div className={classes.hint}>
            {t('builder.pageMetadata.iconSelected')}: <code>{pm.icon}</code>
          </div>
        )}
      </div>

      {/* Description */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-page-description">
          {t('builder.pageMetadata.description')}
        </label>
        <textarea
          id="builder-page-description"
          className={classes.fieldTextarea}
          value={pm.description ?? ''}
          onChange={(e) => setPM({ description: e.target.value })}
          placeholder={t('builder.pageMetadata.descriptionPlaceholder')}
          aria-label={t('builder.pageMetadata.description')}
          rows={3}
          maxLength={500}
        />
        <div className={classes.hint}>
          {(pm.description ?? '').length} / 500
        </div>
      </div>

      {/* Nav order */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-page-nav-order">
          {t('builder.pageMetadata.navOrder')}
        </label>
        <input
          id="builder-page-nav-order"
          type="number"
          className={classes.fieldInput}
          value={pm.navOrder ?? 0}
          onChange={(e) => setPM({ navOrder: Number(e.target.value) })}
          min={0}
          max={999}
          step={1}
          aria-label={t('builder.pageMetadata.navOrder')}
          style={{ width: 100 }}
        />
        <div className={classes.hint}>{t('builder.pageMetadata.navOrderHint')}</div>
      </div>
    </div>
  );
}

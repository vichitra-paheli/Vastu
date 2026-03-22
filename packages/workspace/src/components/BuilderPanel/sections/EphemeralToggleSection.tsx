'use client';

/**
 * EphemeralToggleSection — enable/disable Workflow mode tab for this page.
 *
 * When ephemeral mode is enabled, the Workflow tab appears in the ModeSwitch
 * for admin users. When disabled, the Workflow tab is hidden.
 *
 * The ephemeral flag is stored in config.metadata.ephemeralEnabled.
 *
 * Implements US-136 AC-11.
 */

import React from 'react';
import { IconToggleRight, IconAlertCircle } from '@tabler/icons-react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig } from '../../../templates/types';
import classes from '../BuilderPanel.module.css';

// ─── Component ────────────────────────────────────────────────────────────────

export interface EphemeralToggleSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function EphemeralToggleSection({ config, onChange }: EphemeralToggleSectionProps) {
  const ephemeralEnabled = Boolean(config.metadata?.ephemeralEnabled);

  function handleToggle(enabled: boolean) {
    onChange({
      metadata: {
        ...config.metadata,
        ephemeralEnabled: enabled,
      },
    });
  }

  return (
    <div data-testid="builder-ephemeral-section">
      <h2 className={classes.sectionTitle}>{t('builder.ephemeral.title')}</h2>

      {/* Main toggle */}
      <div
        style={{
          border: '1px solid var(--v-border-default)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: ephemeralEnabled
              ? 'var(--v-accent-primary-subtle, rgba(59, 130, 246, 0.08))'
              : 'var(--v-surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <IconToggleRight
              size={24}
              style={{
                color: ephemeralEnabled ? 'var(--v-accent-primary)' : 'var(--v-text-tertiary)',
                marginTop: 1,
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--v-text-primary)' }}>
                {t('builder.ephemeral.toggle')}
              </div>
              <div className={classes.hint} style={{ marginTop: 4 }}>
                {t('builder.ephemeral.toggleDescription')}
              </div>
            </div>
          </div>

          {/* Toggle switch */}
          <label
            className={classes.toggleSwitch}
            htmlFor="builder-ephemeral-toggle"
            style={{ marginLeft: 16 }}
          >
            <input
              id="builder-ephemeral-toggle"
              type="checkbox"
              className={classes.toggleSwitchInput}
              checked={ephemeralEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              aria-label={t('builder.ephemeral.toggleAriaLabel')}
            />
            <span className={classes.toggleSwitchTrack} />
            <span className={classes.toggleSwitchThumb} />
          </label>
        </div>

        {/* Status indicator */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--v-border-subtle)',
            background: 'var(--v-surface-1)',
            fontSize: 12,
            color: ephemeralEnabled ? 'var(--v-state-success)' : 'var(--v-text-tertiary)',
          }}
        >
          {ephemeralEnabled
            ? t('builder.ephemeral.statusEnabled')
            : t('builder.ephemeral.statusDisabled')}
        </div>
      </div>

      {/* Warning when enabling */}
      {ephemeralEnabled && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginTop: 16,
            padding: '10px 14px',
            background: 'var(--v-state-warning-bg, rgba(251, 191, 36, 0.1))',
            border: '1px solid var(--v-state-warning-border, rgba(251, 191, 36, 0.25))',
            borderRadius: 4,
          }}
          role="note"
        >
          <IconAlertCircle
            size={16}
            style={{ color: 'var(--v-state-warning-icon, #d97706)', flexShrink: 0, marginTop: 1 }}
            aria-hidden="true"
          />
          <div className={classes.hint} style={{ marginTop: 0 }}>
            {t('builder.ephemeral.warningMessage')}
          </div>
        </div>
      )}

      <hr className={classes.divider} />

      {/* Informational note about Workflow mode */}
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--v-surface-2)',
          borderRadius: 4,
          border: '1px solid var(--v-border-subtle)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--v-text-secondary)', marginBottom: 6 }}>
          {t('builder.ephemeral.workflowNote.title')}
        </div>
        <div className={classes.hint}>
          {t('builder.ephemeral.workflowNote.body')}
        </div>
      </div>
    </div>
  );
}

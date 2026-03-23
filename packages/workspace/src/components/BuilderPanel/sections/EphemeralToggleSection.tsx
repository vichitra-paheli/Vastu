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
import { ToggleSwitch } from '../ToggleSwitch';
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

      {/* Main toggle card */}
      <div className={classes.ephemeralCard}>
        <div className={`${classes.ephemeralCardHeader} ${ephemeralEnabled ? classes.ephemeralCardHeaderEnabled : ''}`}>
          <div className={classes.ephemeralCardBody}>
            <IconToggleRight
              size={24}
              className={ephemeralEnabled ? classes.ephemeralIconEnabled : classes.ephemeralIconDisabled}
              aria-hidden="true"
            />
            <div>
              <div className={classes.ephemeralToggleLabel}>
                {t('builder.ephemeral.toggle')}
              </div>
              <div className={classes.hint} style={{ marginTop: 4 }}>
                {t('builder.ephemeral.toggleDescription')}
              </div>
            </div>
          </div>

          {/* Toggle switch */}
          <ToggleSwitch
            id="builder-ephemeral-toggle"
            checked={ephemeralEnabled}
            onChange={handleToggle}
            ariaLabel={t('builder.ephemeral.toggleAriaLabel')}
          />
        </div>

        {/* Status indicator */}
        <div className={`${classes.ephemeralStatus} ${ephemeralEnabled ? classes.ephemeralStatusEnabled : ''}`}>
          {ephemeralEnabled
            ? t('builder.ephemeral.statusEnabled')
            : t('builder.ephemeral.statusDisabled')}
        </div>
      </div>

      {/* Warning when enabling */}
      {ephemeralEnabled && (
        <div className={classes.ephemeralWarning} role="note">
          <IconAlertCircle
            size={16}
            className={classes.ephemeralWarningIcon}
            aria-hidden="true"
          />
          <div className={classes.hint} style={{ marginTop: 0 }}>
            {t('builder.ephemeral.warningMessage')}
          </div>
        </div>
      )}

      <hr className={classes.divider} />

      {/* Informational note about Workflow mode */}
      <div className={classes.ephemeralNote}>
        <div className={classes.ephemeralNoteTitle}>
          {t('builder.ephemeral.workflowNote.title')}
        </div>
        <div className={classes.hint}>
          {t('builder.ephemeral.workflowNote.body')}
        </div>
      </div>
    </div>
  );
}

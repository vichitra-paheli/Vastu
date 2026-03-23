'use client';

/**
 * HooksSection — list of attached hooks with code editor placeholder.
 *
 * Hook types: onPageLoad, onRecordClick, onSave, onDelete
 *
 * Each hook has:
 *   - Enable toggle
 *   - Description textarea (monospace — Monaco editor coming in Phase 3)
 *   - Sandboxed preview placeholder
 *
 * Shows "Hook execution coming in Phase 3" message for each hook.
 *
 * Hook code is stored in config.metadata.hooks.
 *
 * Implements US-136 AC-9.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig } from '../../../templates/types';
import { ToggleSwitch } from '../ToggleSwitch';
import classes from '../BuilderPanel.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type HookType = 'onPageLoad' | 'onRecordClick' | 'onSave' | 'onDelete';

interface HookConfig {
  enabled: boolean;
  code: string;
}

interface HooksMetadata {
  [hookType: string]: HookConfig;
}

// ─── Hook definitions ─────────────────────────────────────────────────────────

const HOOK_TYPES: { id: HookType; labelKey: string; descriptionKey: string }[] = [
  {
    id: 'onPageLoad',
    labelKey: 'builder.hooks.onPageLoad',
    descriptionKey: 'builder.hooks.onPageLoad.description',
  },
  {
    id: 'onRecordClick',
    labelKey: 'builder.hooks.onRecordClick',
    descriptionKey: 'builder.hooks.onRecordClick.description',
  },
  {
    id: 'onSave',
    labelKey: 'builder.hooks.onSave',
    descriptionKey: 'builder.hooks.onSave.description',
  },
  {
    id: 'onDelete',
    labelKey: 'builder.hooks.onDelete',
    descriptionKey: 'builder.hooks.onDelete.description',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface HooksSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function HooksSection({ config, onChange }: HooksSectionProps) {
  const hooks = ((config.metadata?.hooks ?? {}) as HooksMetadata);

  function updateHook(hookType: HookType, patch: Partial<HookConfig>) {
    const existing = hooks[hookType] ?? { enabled: false, code: '' };
    onChange({
      metadata: {
        ...config.metadata,
        hooks: {
          ...hooks,
          [hookType]: { ...existing, ...patch },
        },
      },
    });
  }

  return (
    <div data-testid="builder-hooks-section">
      <h2 className={classes.sectionTitle}>{t('builder.hooks.title')}</h2>
      <p className={classes.hint} style={{ marginBottom: 16 }}>
        {t('builder.hooks.hint')}
      </p>

      {HOOK_TYPES.map((hook) => {
        const hookConfig = hooks[hook.id] ?? { enabled: false, code: '' };
        return (
          <div key={hook.id} className={classes.hookCard}>
            {/* Hook header */}
            <div className={`${classes.hookHeader} ${hookConfig.enabled ? classes.hookHeaderEnabled : ''}`}>
              <div>
                <div className={classes.hookName}>
                  {t(hook.labelKey)}
                </div>
                <div className={classes.hint} style={{ marginTop: 2 }}>
                  {t(hook.descriptionKey)}
                </div>
              </div>
              <ToggleSwitch
                id={`hook-enabled-${hook.id}`}
                checked={hookConfig.enabled}
                onChange={(val) => updateHook(hook.id, { enabled: val })}
              />
            </div>

            {/* Hook editor (shown when enabled) */}
            {hookConfig.enabled && (
              <div className={classes.hookEditorWrap}>
                <label
                  className={classes.fieldLabel}
                  htmlFor={`hook-code-${hook.id}`}
                >
                  {t('builder.hooks.codeLabel')}
                </label>
                <textarea
                  id={`hook-code-${hook.id}`}
                  className={classes.hookEditor}
                  value={hookConfig.code}
                  onChange={(e) => updateHook(hook.id, { code: e.target.value })}
                  placeholder={t('builder.hooks.codePlaceholder')}
                  aria-label={`${t(hook.labelKey)} code`}
                  rows={8}
                  spellCheck={false}
                />

                {/* Phase 3 placeholder */}
                <div className={classes.hookPlaceholder} role="note">
                  {t('builder.hooks.phase3Notice')}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

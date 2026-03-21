'use client';

/**
 * ModeSwitch — IER (Include/Exclude/Regex) segmented control.
 *
 * A standalone, visually prominent mode switcher that allows toggling
 * between Include, Exclude, and Regex filter modes. Complements the
 * FilterModeSelector dropdown with a segmented control form factor.
 *
 * Colors per Patterns Library §2.3:
 *   I = --v-accent-primary        (blue)
 *   E = --v-status-error          (red)
 *   R = --v-accent-quaternary     (muted violet)
 *
 * Mode state is stored in viewFilterStore keyed by viewId.
 *
 * Implements US-108 (AC-1 through AC-7).
 */

import React, { useEffect } from 'react';
import { t } from '../../lib/i18n';
import type { FilterMode } from '../FilterSystem/types';
import classes from './ModeSwitch.module.css';

export interface ModeSwitchProps {
  /** The currently selected mode. */
  value: FilterMode;
  /** Called when the user selects a different mode. */
  onChange: (mode: FilterMode) => void;
  /** When true, the Regex option is hidden (N/A for number/date/boolean columns). */
  disableRegex?: boolean;
  /** When true, the control is non-interactive. */
  disabled?: boolean;
  /** Accessible label for the segmented control group. */
  'aria-label'?: string;
}

interface ModeOption {
  mode: FilterMode;
  labelKey: string;
  shortKey: string;
}

const ALL_OPTIONS: ModeOption[] = [
  { mode: 'include', labelKey: 'filter.mode.include', shortKey: 'filter.mode.include.short' },
  { mode: 'exclude', labelKey: 'filter.mode.exclude', shortKey: 'filter.mode.exclude.short' },
  { mode: 'regex',   labelKey: 'filter.mode.regex',   shortKey: 'filter.mode.regex.short' },
];

const MODE_ACTIVE_CLASS: Record<FilterMode, string> = {
  include: classes.activeInclude,
  exclude: classes.activeExclude,
  regex:   classes.activeRegex,
};

export function ModeSwitch({
  value,
  onChange,
  disableRegex = false,
  disabled = false,
  'aria-label': ariaLabel,
}: ModeSwitchProps) {
  const options = disableRegex
    ? ALL_OPTIONS.filter((o) => o.mode !== 'regex')
    : ALL_OPTIONS;

  // Fallback: if regex is disabled but currently selected (e.g. from persisted state),
  // reset to 'include' to avoid rendering with no active segment.
  useEffect(() => {
    if (disableRegex && value === 'regex') {
      onChange('include');
    }
  }, [disableRegex, value, onChange]);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? t('filter.modeSwitch.ariaLabel')}
      className={`${classes.root} ${disabled ? classes.disabled : ''}`}
    >
      {options.map(({ mode, labelKey, shortKey }) => {
        const isActive = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            className={`${classes.segment} ${isActive ? `${classes.active} ${MODE_ACTIVE_CLASS[mode]}` : classes.inactive}`}
            onClick={() => {
              if (!disabled) onChange(mode);
            }}
            title={t(`filter.modeSwitch.${mode}.tooltip`)}
          >
            <span className={classes.short} aria-hidden="true">
              {t(shortKey)}
            </span>
            <span className={classes.label}>{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

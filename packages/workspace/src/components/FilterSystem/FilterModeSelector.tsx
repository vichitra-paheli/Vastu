'use client';

/**
 * FilterModeSelector — IER mode dropdown for filter inputs.
 *
 * Colors per Patterns Library §2.3:
 *   I = --v-accent-primary (blue)
 *   E = --v-status-error (red)
 *   R = --v-accent-quaternary (muted violet)
 *
 * Implements US-114 (AC-2).
 */

import React from 'react';
import { Menu, UnstyledButton } from '@mantine/core';
import { t } from '../../lib/i18n';
import type { FilterMode } from './types';
import classes from './FilterModeSelector.module.css';

const MODE_LABELS: Record<FilterMode, string> = {
  include: 'filter.mode.include',
  exclude: 'filter.mode.exclude',
  regex: 'filter.mode.regex',
};

const MODE_SHORT: Record<FilterMode, string> = {
  include: 'filter.mode.include.short',
  exclude: 'filter.mode.exclude.short',
  regex: 'filter.mode.regex.short',
};

const MODE_CLASS: Record<FilterMode, string> = {
  include: classes.include,
  exclude: classes.exclude,
  regex: classes.regex,
};

export interface FilterModeSelectorProps {
  value: FilterMode;
  onChange: (mode: FilterMode) => void;
  /** If true, disables regex mode (N/A for number/date/boolean). */
  disableRegex?: boolean;
  disabled?: boolean;
}

export function FilterModeSelector({
  value,
  onChange,
  disableRegex = false,
  disabled = false,
}: FilterModeSelectorProps) {
  const modes: FilterMode[] = disableRegex
    ? ['include', 'exclude']
    : ['include', 'exclude', 'regex'];

  return (
    <Menu
      position="bottom-start"
      withinPortal
      disabled={disabled}
    >
      <Menu.Target>
        <UnstyledButton
          className={`${classes.trigger} ${MODE_CLASS[value]}`}
          aria-label={t('filter.mode.ariaLabel')}
          disabled={disabled}
        >
          {t(MODE_SHORT[value])}
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {modes.map((mode) => (
          <Menu.Item
            key={mode}
            onClick={() => onChange(mode)}
            className={mode === value ? classes.activeItem : undefined}
          >
            <span className={`${classes.shortBadge} ${MODE_CLASS[mode]}`}>
              {t(MODE_SHORT[mode])}
            </span>
            {' '}
            {t(MODE_LABELS[mode])}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

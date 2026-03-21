'use client';

/**
 * FilterPill — compact pill representing an active filter condition.
 *
 * Shows: column name | mode indicator (I/E/R) | value summary | × remove
 * Uses --v-radius-pill, padding 4px 10px, TruncatedText for value summary.
 *
 * Clicking the pill body opens a popover to edit the filter.
 * The × button removes without opening the popover.
 *
 * Implements US-114 (AC-4).
 */

import React from 'react';
import { Popover, ActionIcon, Group } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { TruncatedText } from '../TruncatedText';
import { t } from '../../lib/i18n';
import type { FilterCondition, FilterDimension, FilterMode } from './types';
import { FilterInput } from './FilterInput';
import classes from './FilterPill.module.css';

const MODE_CLASS: Record<FilterMode, string> = {
  include: classes.modeInclude,
  exclude: classes.modeExclude,
  regex: classes.modeRegex,
};

const MODE_SHORT: Record<FilterMode, string> = {
  include: t('filter.mode.include.short'),
  exclude: t('filter.mode.exclude.short'),
  regex: t('filter.mode.regex.short'),
};

export interface FilterPillProps {
  condition: FilterCondition;
  dimension: FilterDimension | undefined;
  onRemove: () => void;
  onChange: (updated: FilterCondition) => void;
}

export function FilterPill({
  condition,
  dimension,
  onRemove,
  onChange,
}: FilterPillProps) {
  const [open, setOpen] = React.useState(false);

  const label = dimension?.label ?? condition.column;
  const valueSummary = summarizeValue(condition);

  return (
    <div className={classes.pillWrapper}>
      <Popover
        opened={open}
        onClose={() => setOpen(false)}
        position="bottom-start"
        withinPortal
      >
        <Popover.Target>
          <button
            type="button"
            className={classes.pill}
            onClick={() => setOpen((o) => !o)}
            aria-label={t('filter.pill.editAriaLabel')}
          >
            <Group gap={4} wrap="nowrap">
              <span className={`${classes.modeIndicator} ${MODE_CLASS[condition.mode]}`}>
                {MODE_SHORT[condition.mode]}
              </span>
              <span className={classes.columnName}>
                <TruncatedText maxWidth={80}>{label}</TruncatedText>
              </span>
              <span className={classes.separator}>:</span>
              <span className={classes.valueSummary}>
                <TruncatedText maxWidth={120}>{valueSummary}</TruncatedText>
              </span>
            </Group>
          </button>
        </Popover.Target>

        <Popover.Dropdown className={classes.dropdown}>
          {dimension && (
            <FilterInput
              condition={condition}
              dimension={dimension}
              onChange={onChange}
            />
          )}
        </Popover.Dropdown>
      </Popover>

      <ActionIcon
        size="xs"
        variant="subtle"
        className={classes.removeButton}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={t('filter.pill.removeAriaLabel')}
      >
        <IconX size={10} />
      </ActionIcon>
    </div>
  );
}

// ─────────────────────────────────────────────
// Value summary formatter
// ─────────────────────────────────────────────

function summarizeValue(condition: FilterCondition): string {
  const { value, dataType, mode } = condition;

  if (mode === 'regex') {
    return typeof value === 'string' && value ? `/${value}/` : '';
  }

  switch (dataType) {
    case 'text':
    case 'enum': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      if (arr.length === 0) return '—';
      if (arr.length === 1) return arr[0];
      return `${arr[0]}, +${arr.length - 1}`;
    }

    case 'number': {
      const range = value as { min?: number; max?: number };
      if (range.min !== undefined && range.max !== undefined) {
        return `${range.min} \u2013 ${range.max}`;
      }
      if (range.min !== undefined) return `\u2265 ${range.min}`;
      if (range.max !== undefined) return `\u2264 ${range.max}`;
      return '—';
    }

    case 'date': {
      const range = value as { start?: string; end?: string };
      const fmt = (s: string) => {
        const d = new Date(s);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      if (range.start && range.end) return `${fmt(range.start)} \u2013 ${fmt(range.end)}`;
      if (range.start) return `from ${fmt(range.start)}`;
      if (range.end) return `until ${fmt(range.end)}`;
      return '—';
    }

    case 'boolean': {
      if (value === null) return t('filter.input.boolean.any');
      return (value as boolean) ? t('filter.input.boolean.true') : t('filter.input.boolean.false');
    }

    default:
      return '—';
  }
}

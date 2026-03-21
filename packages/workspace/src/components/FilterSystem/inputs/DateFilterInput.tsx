'use client';

/**
 * DateFilterInput — date range picker with presets for date columns.
 *
 * Presets: Today, Last 7d, Last 30d, This month, This quarter, Custom range.
 * Regex mode is disabled for dates (N/A per §2.2).
 * Implements US-114 (AC-2, AC-3).
 */

import React from 'react';
import { TextInput, Group, Stack, UnstyledButton, Text } from '@mantine/core';
import { FilterModeSelector } from '../FilterModeSelector';
import { t } from '../../../lib/i18n';
import type { FilterCondition, DateRangeValue } from '../types';
import classes from './FilterInputs.module.css';

type DatePreset = 'today' | 'last7d' | 'last30d' | 'thisMonth' | 'thisQuarter' | 'custom';

const DATE_PRESETS: { key: DatePreset; labelKey: string }[] = [
  { key: 'today', labelKey: 'filter.input.date.today' },
  { key: 'last7d', labelKey: 'filter.input.date.last7d' },
  { key: 'last30d', labelKey: 'filter.input.date.last30d' },
  { key: 'thisMonth', labelKey: 'filter.input.date.thisMonth' },
  { key: 'thisQuarter', labelKey: 'filter.input.date.thisQuarter' },
  { key: 'custom', labelKey: 'filter.input.date.custom' },
];

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function resolvePreset(preset: DatePreset): DateRangeValue {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { start: toISODate(today), end: toISODate(today) };

    case 'last7d': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start: toISODate(start), end: toISODate(today) };
    }

    case 'last30d': {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { start: toISODate(start), end: toISODate(today) };
    }

    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toISODate(start), end: toISODate(end) };
    }

    case 'thisQuarter': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      const end = new Date(today.getFullYear(), q * 3 + 3, 0);
      return { start: toISODate(start), end: toISODate(end) };
    }

    case 'custom':
      return {};

    default:
      return {};
  }
}

export interface DateFilterInputProps {
  condition: FilterCondition;
  onChange: (updated: FilterCondition) => void;
}

export function DateFilterInput({ condition, onChange }: DateFilterInputProps) {
  const { mode, value } = condition;
  const range = (value ?? {}) as DateRangeValue;

  const [activePreset, setActivePreset] = React.useState<DatePreset | null>(null);

  function handleModeChange(newMode: FilterCondition['mode']) {
    onChange({ ...condition, mode: newMode });
  }

  function handlePresetClick(preset: DatePreset) {
    setActivePreset(preset);
    if (preset !== 'custom') {
      const resolved = resolvePreset(preset);
      onChange({ ...condition, value: resolved });
    }
  }

  function handleStartChange(start: string) {
    setActivePreset('custom');
    onChange({ ...condition, value: { ...range, start: start || undefined } });
  }

  function handleEndChange(end: string) {
    setActivePreset('custom');
    onChange({ ...condition, value: { ...range, end: end || undefined } });
  }

  return (
    <Stack gap={8}>
      <Group gap={8}>
        <FilterModeSelector value={mode} onChange={handleModeChange} disableRegex />
      </Group>

      {/* Preset buttons */}
      <Group gap={4} wrap="wrap">
        {DATE_PRESETS.map(({ key, labelKey }) => (
          <UnstyledButton
            key={key}
            className={`${classes.presetButton} ${activePreset === key ? classes.presetButtonActive : ''}`}
            onClick={() => handlePresetClick(key)}
          >
            {t(labelKey)}
          </UnstyledButton>
        ))}
      </Group>

      {/* Custom date inputs — always visible */}
      <Group gap={8} align="flex-start">
        <div className={classes.dateField}>
          <Text size="xs" c="var(--v-text-secondary)" mb={2}>
            {t('filter.input.date.startPlaceholder')}
          </Text>
          <TextInput
            type="date"
            value={range.start ?? ''}
            onChange={(e) => handleStartChange(e.currentTarget.value)}
            size="xs"
            className={classes.dateInput}
          />
        </div>
        <Text size="xs" c="var(--v-text-tertiary)" style={{ marginTop: 20 }}>
          –
        </Text>
        <div className={classes.dateField}>
          <Text size="xs" c="var(--v-text-secondary)" mb={2}>
            {t('filter.input.date.endPlaceholder')}
          </Text>
          <TextInput
            type="date"
            value={range.end ?? ''}
            onChange={(e) => handleEndChange(e.currentTarget.value)}
            size="xs"
            className={classes.dateInput}
          />
        </div>
      </Group>
    </Stack>
  );
}

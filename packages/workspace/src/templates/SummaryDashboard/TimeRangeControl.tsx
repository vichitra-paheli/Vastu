'use client';

/**
 * TimeRangeControl — time range preset selector + comparison period toggle.
 *
 * Provides:
 * - Preset dropdown: Today, Last 7d, Last 30d, Last 90d, YTD, Custom
 * - Comparison toggle: "vs previous period" checkbox
 *
 * All strings via t(). No hardcoded colors.
 * Implements US-130.
 */

import React from 'react';
import { Select, Switch, Group } from '@mantine/core';
import { t } from '../../lib/i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimeRangePreset = 'today' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

export interface TimeRange {
  preset: TimeRangePreset;
  /** ISO date string for custom range start. */
  customStart?: string;
  /** ISO date string for custom range end. */
  customEnd?: string;
  /** Whether to compare against the previous equivalent period. */
  compareEnabled: boolean;
}

export interface TimeRangeControlProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_OPTIONS: Array<{ value: TimeRangePreset; label: string }> = [
  { value: 'today', label: 'dashboard.timeRange.today' },
  { value: '7d', label: 'dashboard.timeRange.last7d' },
  { value: '30d', label: 'dashboard.timeRange.last30d' },
  { value: '90d', label: 'dashboard.timeRange.last90d' },
  { value: 'ytd', label: 'dashboard.timeRange.ytd' },
  { value: 'custom', label: 'dashboard.timeRange.custom' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function TimeRangeControl({ value, onChange }: TimeRangeControlProps) {
  const selectData = PRESET_OPTIONS.map((opt) => ({
    value: opt.value,
    label: t(opt.label),
  }));

  function handlePresetChange(preset: string | null) {
    if (!preset) return;
    onChange({ ...value, preset: preset as TimeRangePreset });
  }

  function handleCompareChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, compareEnabled: event.currentTarget.checked });
  }

  return (
    <Group gap="sm" align="center" aria-label={t('dashboard.timeRange.ariaLabel')}>
      <Select
        size="xs"
        data={selectData}
        value={value.preset}
        onChange={handlePresetChange}
        aria-label={t('dashboard.timeRange.presetAriaLabel')}
        comboboxProps={{ withinPortal: true }}
        w={130}
      />
      <Switch
        size="xs"
        label={t('dashboard.timeRange.compare')}
        checked={value.compareEnabled}
        onChange={handleCompareChange}
        aria-label={t('dashboard.timeRange.compareAriaLabel')}
      />
    </Group>
  );
}

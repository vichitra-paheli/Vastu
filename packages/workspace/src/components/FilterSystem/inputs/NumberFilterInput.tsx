'use client';

/**
 * NumberFilterInput — range input with min/max for number columns.
 *
 * Regex mode is disabled for numbers (N/A per §2.2).
 * Implements US-114 (AC-2, AC-3).
 */

import React from 'react';
import { NumberInput, Group, Text } from '@mantine/core';
import { FilterModeSelector } from '../FilterModeSelector';
import { t } from '../../../lib/i18n';
import type { FilterCondition, NumberRangeValue } from '../types';
import classes from './FilterInputs.module.css';

export interface NumberFilterInputProps {
  condition: FilterCondition;
  onChange: (updated: FilterCondition) => void;
  /** Minimum value allowed in the dataset (for input bounds). */
  dataMin?: number;
  /** Maximum value allowed in the dataset (for input bounds). */
  dataMax?: number;
}

export function NumberFilterInput({
  condition,
  onChange,
  dataMin,
  dataMax,
}: NumberFilterInputProps) {
  const { mode, value } = condition;
  const range = (value ?? {}) as NumberRangeValue;

  function handleModeChange(newMode: FilterCondition['mode']) {
    onChange({ ...condition, mode: newMode });
  }

  function handleMinChange(val: number | string) {
    const min = val === '' ? undefined : Number(val);
    onChange({ ...condition, value: { ...range, min: isNaN(min as number) ? undefined : min } });
  }

  function handleMaxChange(val: number | string) {
    const max = val === '' ? undefined : Number(val);
    onChange({ ...condition, value: { ...range, max: isNaN(max as number) ? undefined : max } });
  }

  return (
    <div className={classes.inputRow}>
      <FilterModeSelector value={mode} onChange={handleModeChange} disableRegex />
      <div className={classes.inputControl}>
        <Group gap={8} align="center">
          <div className={classes.rangeField}>
            <Text size="xs" c="var(--v-text-secondary)" mb={2}>
              {t('filter.input.number.min')}
            </Text>
            <NumberInput
              value={range.min ?? ''}
              onChange={handleMinChange}
              placeholder={dataMin !== undefined ? String(dataMin) : '—'}
              size="xs"
              min={dataMin}
              max={range.max}
              className={classes.numberInput}
              hideControls
            />
          </div>
          <Text size="xs" c="var(--v-text-tertiary)" mt={16}>
            –
          </Text>
          <div className={classes.rangeField}>
            <Text size="xs" c="var(--v-text-secondary)" mb={2}>
              {t('filter.input.number.max')}
            </Text>
            <NumberInput
              value={range.max ?? ''}
              onChange={handleMaxChange}
              placeholder={dataMax !== undefined ? String(dataMax) : '—'}
              size="xs"
              min={range.min}
              max={dataMax}
              className={classes.numberInput}
              hideControls
            />
          </div>
        </Group>
      </div>
    </div>
  );
}

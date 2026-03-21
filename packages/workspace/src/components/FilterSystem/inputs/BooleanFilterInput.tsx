'use client';

/**
 * BooleanFilterInput — three-state toggle (True / False / Any) for boolean columns.
 *
 * Regex mode is disabled for booleans (N/A per §2.2).
 * Implements US-114 (AC-2, AC-3).
 */

import React from 'react';
import { SegmentedControl, Group } from '@mantine/core';
import { FilterModeSelector } from '../FilterModeSelector';
import { t } from '../../../lib/i18n';
import type { FilterCondition } from '../types';

export interface BooleanFilterInputProps {
  condition: FilterCondition;
  onChange: (updated: FilterCondition) => void;
}

type BoolState = 'true' | 'false' | 'any';

function toBoolState(value: FilterCondition['value']): BoolState {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return 'any';
}

function fromBoolState(state: BoolState): boolean | null {
  if (state === 'true') return true;
  if (state === 'false') return false;
  return null;
}

export function BooleanFilterInput({ condition, onChange }: BooleanFilterInputProps) {
  const { mode, value } = condition;
  const current = toBoolState(value);

  function handleModeChange(newMode: FilterCondition['mode']) {
    onChange({ ...condition, mode: newMode });
  }

  function handleToggleChange(state: string) {
    onChange({ ...condition, value: fromBoolState(state as BoolState) });
  }

  return (
    <Group gap={8}>
      <FilterModeSelector value={mode} onChange={handleModeChange} disableRegex />
      <SegmentedControl
        value={current}
        onChange={handleToggleChange}
        size="xs"
        data={[
          { label: t('filter.input.boolean.true'), value: 'true' },
          { label: t('filter.input.boolean.false'), value: 'false' },
          { label: t('filter.input.boolean.any'), value: 'any' },
        ]}
      />
    </Group>
  );
}

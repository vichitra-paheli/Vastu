'use client';

/**
 * ExplorerControls — toolbar with dimension, measure, and group-by selectors.
 *
 * Renders a compact row of Select dropdowns that drive the chart and table.
 * Design system: Mantine Select (size="xs"). All strings via t('key').
 * All colors via --v-* tokens.
 *
 * Implements US-132 (AC-2).
 */

import React from 'react';
import { Group, Select, MultiSelect, Text } from '@mantine/core';
import { t } from '../../lib/i18n';
import type { DimensionOption, MeasureOption } from './types';

export interface ExplorerControlsProps {
  /** Available dimension options (X axis / group-by candidates). */
  dimensions: DimensionOption[];
  /** Available measure options (numeric Y axis candidates). */
  measures: MeasureOption[];

  /** Currently selected dimension key. */
  dimensionKey: string | null;
  /** Called when the user picks a different dimension. */
  onDimensionChange: (key: string | null) => void;

  /** Currently selected measure keys. */
  measureKeys: string[];
  /** Called when the user picks different measures. */
  onMeasureChange: (keys: string[]) => void;

  /** Currently selected group-by key. */
  groupByKey: string | null;
  /** Called when the user picks a different group-by field. */
  onGroupByChange: (key: string | null) => void;
}

/**
 * Compact control strip for the DataExplorer.
 *
 * Shows three selectors: Dimension (X axis), Measure(s) (Y axis), and
 * Group By. All selectors show "None" as the first option so the user can
 * clear their selection.
 */
export function ExplorerControls({
  dimensions,
  measures,
  dimensionKey,
  onDimensionChange,
  measureKeys,
  onMeasureChange,
  groupByKey,
  onGroupByChange,
}: ExplorerControlsProps) {
  const dimensionData = dimensions.map((d) => ({ value: d.key, label: d.label }));
  const measureData = measures.map((m) => ({ value: m.key, label: m.label }));
  const groupByData = [
    { value: '', label: t('explorer.controls.groupBy.none') },
    ...dimensions.map((d) => ({ value: d.key, label: d.label })),
  ];

  return (
    <Group gap="sm" wrap="wrap" align="center" aria-label={t('explorer.controls.ariaLabel')}>
      <Text size="xs" c="dimmed" fw={500}>
        {t('explorer.controls.label')}
      </Text>

      <Select
        size="xs"
        label={t('explorer.controls.dimension.label')}
        placeholder={t('explorer.controls.dimension.placeholder')}
        data={dimensionData}
        value={dimensionKey}
        onChange={onDimensionChange}
        clearable
        aria-label={t('explorer.controls.dimension.ariaLabel')}
        styles={{ root: { minWidth: 140 } }}
      />

      <MultiSelect
        size="xs"
        label={t('explorer.controls.measure.label')}
        placeholder={t('explorer.controls.measure.placeholder')}
        data={measureData}
        value={measureKeys}
        onChange={onMeasureChange}
        aria-label={t('explorer.controls.measure.ariaLabel')}
        styles={{ root: { minWidth: 180 } }}
        maxValues={6}
      />

      <Select
        size="xs"
        label={t('explorer.controls.groupBy.label')}
        placeholder={t('explorer.controls.groupBy.placeholder')}
        data={groupByData}
        value={groupByKey ?? ''}
        onChange={(v) => onGroupByChange(v === '' ? null : v)}
        aria-label={t('explorer.controls.groupBy.ariaLabel')}
        styles={{ root: { minWidth: 140 } }}
      />
    </Group>
  );
}

'use client';

/**
 * ChartTypeToggle — segmented control for switching between chart types.
 *
 * Supports line, bar, area, scatter, and donut chart types.
 * The 'table' mode hides the chart and shows only the companion table.
 *
 * Design system: Mantine SegmentedControl (Style Guide §9.1).
 * All strings via t('key'). All colors via --v-* tokens.
 *
 * Implements US-132 (AC-3).
 */

import React from 'react';
import { SegmentedControl, Group, Tooltip } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import {
  IconChartLine,
  IconChartBar,
  IconChartArea,
  IconChartDonut,
  IconTable,
  IconChartDots,
} from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import type { ExplorerChartMode } from './types';

export interface ChartTypeToggleProps {
  /** Currently selected chart mode. */
  value: ExplorerChartMode;
  /** Called when the user selects a different chart mode. */
  onChange: (value: ExplorerChartMode) => void;
}

interface ControlOption {
  value: ExplorerChartMode;
  labelKey: string;
  Icon: Icon;
}

const OPTIONS: ControlOption[] = [
  { value: 'line', labelKey: 'explorer.chartType.line', Icon: IconChartLine },
  { value: 'bar', labelKey: 'explorer.chartType.bar', Icon: IconChartBar },
  { value: 'area', labelKey: 'explorer.chartType.area', Icon: IconChartArea },
  { value: 'scatter', labelKey: 'explorer.chartType.scatter', Icon: IconChartDots },
  { value: 'donut', labelKey: 'explorer.chartType.donut', Icon: IconChartDonut },
  { value: 'table', labelKey: 'explorer.chartType.table', Icon: IconTable },
];

/**
 * Segmented control for selecting the active chart visualization type.
 * When 'table' is selected the chart is hidden; when any chart type is selected
 * the VastuChart renders with the corresponding type.
 */
export function ChartTypeToggle({ value, onChange }: ChartTypeToggleProps) {
  const data = OPTIONS.map((opt) => ({
    value: opt.value,
    label: (
      <Tooltip label={t(opt.labelKey)} withArrow position="top" openDelay={400}>
        <Group gap={4} align="center" wrap="nowrap">
          <opt.Icon size={14} aria-hidden="true" />
        </Group>
      </Tooltip>
    ),
  }));

  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as ExplorerChartMode)}
      data={data}
      size="xs"
      aria-label={t('explorer.chartType.ariaLabel')}
    />
  );
}

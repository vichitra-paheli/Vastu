'use client';

/**
 * ChartConfigPanel — collapsible gear-icon-triggered configuration panel.
 *
 * Basic tier:
 * - Chart type selector
 * - Axis labels toggle
 * - Legend position selector
 *
 * Advanced tier (expand toggle):
 * - Stacking toggle (bar/area)
 * - Scale type (linear/log)
 *
 * All form inputs use Mantine components (@mantine/core).
 * Calls onConfigChange when any config value changes.
 * Calls onTypeChange when the user selects a different chart type.
 *
 * Implements US-135 AC-12.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Select, Switch, SegmentedControl } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { ChartConfig, ChartType, LegendPosition, ScaleType } from './types';
import { t } from '../../lib/i18n';
import classes from './ChartConfigPanel.module.css';

interface ChartConfigPanelProps {
  config: ChartConfig;
  currentType: ChartType;
  onConfigChange: (config: ChartConfig) => void;
  /** Called when the user selects a different chart type from the panel. */
  onTypeChange?: (type: ChartType) => void;
  onClose: () => void;
}

const CHART_TYPE_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: 'line', label: t('chart.type.line') },
  { value: 'bar', label: t('chart.type.bar') },
  { value: 'area', label: t('chart.type.area') },
  { value: 'donut', label: t('chart.type.donut') },
  { value: 'sparkline', label: t('chart.type.sparkline') },
  { value: 'scatter', label: t('chart.type.scatter') },
];

const LEGEND_POSITION_OPTIONS: Array<{ value: LegendPosition; label: string }> = [
  { value: 'top', label: t('chart.legend.position.top') },
  { value: 'bottom', label: t('chart.legend.position.bottom') },
  { value: 'left', label: t('chart.legend.position.left') },
  { value: 'right', label: t('chart.legend.position.right') },
];

const SCALE_TYPE_SEGMENTS: Array<{ value: ScaleType; label: string }> = [
  { value: 'linear', label: t('chart.config.scale.linear') },
  { value: 'log', label: t('chart.config.scale.log') },
];

export function ChartConfigPanel({
  config,
  currentType,
  onConfigChange,
  onTypeChange,
  onClose,
}: ChartConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTypeChange = useCallback(
    (value: string | null) => {
      if (value) {
        onTypeChange?.(value as ChartType);
      }
    },
    [onTypeChange],
  );

  const handleShowAxisLabelsChange = useCallback(
    (checked: boolean) => {
      onConfigChange({ ...config, showAxisLabels: checked });
    },
    [config, onConfigChange],
  );

  const handleShowLegendChange = useCallback(
    (checked: boolean) => {
      onConfigChange({ ...config, showLegend: checked });
    },
    [config, onConfigChange],
  );

  const handleLegendPositionChange = useCallback(
    (value: string | null) => {
      if (value) {
        onConfigChange({ ...config, legendPosition: value as LegendPosition });
      }
    },
    [config, onConfigChange],
  );

  const handleStackedChange = useCallback(
    (checked: boolean) => {
      onConfigChange({ ...config, stacked: checked });
    },
    [config, onConfigChange],
  );

  const handleScaleTypeChange = useCallback(
    (value: string) => {
      onConfigChange({ ...config, scaleType: value as ScaleType });
    },
    [config, onConfigChange],
  );

  // Stacking only meaningful for bar and area charts
  const showStackingOption = currentType === 'bar' || currentType === 'area';

  return (
    <div
      ref={panelRef}
      className={classes.panel}
      role="dialog"
      aria-label={t('chart.config.panelAriaLabel')}
    >
      {/* ─── Basic section ───────────────────────────────────────────────── */}
      <div className={classes.section}>
        <p className={classes.sectionTitle}>{t('chart.config.basic')}</p>

        <Select
          label={t('chart.config.chartType')}
          data={CHART_TYPE_OPTIONS}
          value={currentType}
          onChange={handleTypeChange}
          size="xs"
          aria-label={t('chart.config.chartType')}
        />

        <Switch
          label={t('chart.config.showAxisLabels')}
          checked={config.showAxisLabels ?? true}
          onChange={(e) => handleShowAxisLabelsChange(e.currentTarget.checked)}
          size="xs"
        />

        <Switch
          label={t('chart.config.showLegend')}
          checked={config.showLegend ?? true}
          onChange={(e) => handleShowLegendChange(e.currentTarget.checked)}
          size="xs"
        />

        {(config.showLegend ?? true) && (
          <Select
            label={t('chart.config.legendPosition')}
            data={LEGEND_POSITION_OPTIONS}
            value={config.legendPosition ?? 'bottom'}
            onChange={handleLegendPositionChange}
            size="xs"
            aria-label={t('chart.config.legendPosition')}
          />
        )}
      </div>

      <hr className={classes.divider} />

      {/* ─── Advanced toggle ─────────────────────────────────────────────── */}
      <button
        type="button"
        className={classes.advancedToggle}
        onClick={() => setShowAdvanced((prev) => !prev)}
        aria-expanded={showAdvanced}
        aria-controls="chart-config-advanced"
      >
        {showAdvanced ? (
          <IconChevronDown size={14} aria-hidden="true" />
        ) : (
          <IconChevronRight size={14} aria-hidden="true" />
        )}
        {t('chart.config.advanced')}
      </button>

      {/* ─── Advanced section ─────────────────────────────────────────────── */}
      {showAdvanced && (
        <div id="chart-config-advanced" className={classes.advancedSection}>
          {showStackingOption && (
            <Switch
              label={t('chart.config.stacked')}
              checked={config.stacked ?? false}
              onChange={(e) => handleStackedChange(e.currentTarget.checked)}
              size="xs"
            />
          )}

          <div>
            <p className={classes.sectionTitle}>{t('chart.config.scaleType')}</p>
            <SegmentedControl
              data={SCALE_TYPE_SEGMENTS}
              value={config.scaleType ?? 'linear'}
              onChange={handleScaleTypeChange}
              size="xs"
              fullWidth
            />
          </div>
        </div>
      )}
    </div>
  );
}

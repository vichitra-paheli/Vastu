'use client';

/**
 * PipelineCard — dashboard pipeline card with horizontal stacked bar.
 *
 * Each stage is represented as a proportional segment in a stacked bar.
 * A color legend is shown below the bar.
 *
 * Implements US-137 AC-4.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { PipelineCardDef } from '../../../stores/dashboardStore';
import { CHART_SERIES_COLORS } from '../../../components/VastuChart';
import classes from '../DashboardTemplate.module.css';

export interface DashboardPipelineCardProps {
  card: PipelineCardDef;
}

const DEFAULT_STAGE_COUNTS = [10, 6, 4, 2];

/** Validate that a color value is a safe CSS color or --v-* token reference. */
function isSafeColor(color: string): boolean {
  // Allow CSS custom property references (--v-* tokens)
  if (/^var\(--[a-z][\w-]*\)$/.test(color)) return true;
  // Allow hex colors (#rgb, #rrggbb, #rgba, #rrggbbaa)
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return true;
  // Allow named colors, rgb(), hsl(), etc. — basic safeguard: no semicolons or braces
  if (/^[a-zA-Z0-9(),%. #-]+$/.test(color) && !color.includes(';') && !color.includes('{')) {
    return true;
  }
  return false;
}

export function DashboardPipelineCard({ card }: DashboardPipelineCardProps) {
  const defaultStages = React.useMemo(
    (): Array<{ label: string; count: number; color?: string }> => [
      { label: t('dashboard.pipeline.stage1'), count: DEFAULT_STAGE_COUNTS[0] },
      { label: t('dashboard.pipeline.stage2'), count: DEFAULT_STAGE_COUNTS[1] },
      { label: t('dashboard.pipeline.stage3'), count: DEFAULT_STAGE_COUNTS[2] },
      { label: t('dashboard.pipeline.stage4'), count: DEFAULT_STAGE_COUNTS[3] },
    ],
    [],
  );

  const stages = card.stages && card.stages.length > 0 ? card.stages : defaultStages;
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <>
      <div
        className={classes.pipelineBar}
        role="img"
        aria-label={t('dashboard.pipeline.barAriaLabel', { title: card.title })}
      >
        {stages.map((stage, i) => {
          const flex = total > 0 ? stage.count / total : 0;
          const fallbackColor = CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length];
          const color =
            stage.color && isSafeColor(stage.color) ? stage.color : fallbackColor;
          return (
            <div
              key={stage.label}
              className={classes.pipelineStage}
              style={{ flex, backgroundColor: color }}
              title={`${stage.label}: ${stage.count}`}
            >
              {flex > 0.1 && stage.count > 0 ? stage.count : null}
            </div>
          );
        })}
      </div>

      <div className={classes.pipelineLegend} role="list" aria-label={t('dashboard.pipeline.legendAriaLabel')}>
        {stages.map((stage, i) => {
          const fallbackColor = CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length];
          const color =
            stage.color && isSafeColor(stage.color) ? stage.color : fallbackColor;
          return (
            <div key={stage.label} className={classes.pipelineLegendItem} role="listitem">
              <div
                className={classes.pipelineLegendDot}
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span>
                {stage.label}: {stage.count}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

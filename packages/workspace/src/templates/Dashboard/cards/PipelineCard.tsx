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

const DEFAULT_STAGES: Array<{ label: string; count: number; color?: string }> = [
  { label: t('dashboard.pipeline.stage1'), count: 10 },
  { label: t('dashboard.pipeline.stage2'), count: 6 },
  { label: t('dashboard.pipeline.stage3'), count: 4 },
  { label: t('dashboard.pipeline.stage4'), count: 2 },
];

export function DashboardPipelineCard({ card }: DashboardPipelineCardProps) {
  const stages = card.stages && card.stages.length > 0 ? card.stages : DEFAULT_STAGES;
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
          const color = stage.color ?? CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length];
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
          const color = stage.color ?? CHART_SERIES_COLORS[i % CHART_SERIES_COLORS.length];
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

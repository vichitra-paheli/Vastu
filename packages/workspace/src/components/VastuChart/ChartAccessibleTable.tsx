'use client';

/**
 * ChartAccessibleTable — renders chart data as an accessible HTML table.
 *
 * Triggered by the "View as table" toggle in the chart header.
 * Available on all chart types except sparkline.
 *
 * For cartesian charts (line, bar, area, scatter): one row per data point,
 * one column per series (plus the x-axis column).
 *
 * For donut charts: one row per series showing the aggregated total value.
 *
 * Implements US-210 AC-6, AC-7 (VASTU-2A-210c).
 */

import React, { useId } from 'react';
import type { ChartDataPoint, SeriesConfig, ChartType } from './types';
import { t } from '../../lib/i18n';
import classes from './ChartAccessibleTable.module.css';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ChartAccessibleTableProps {
  data: ChartDataPoint[];
  series: SeriesConfig[];
  resolvedColors: Record<string, string>;
  xAxisKey: string;
  chartType: ChartType;
  /** Caption for the table (accessible label). */
  caption?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCellValue(value: string | number | null | undefined): { text: string; isNull: boolean } {
  if (value == null) return { text: '\u2014', isNull: true };
  return { text: String(value), isNull: false };
}

function buildDonutRows(
  data: ChartDataPoint[],
  series: SeriesConfig[],
): Array<{ name: string; dataKey: string; total: number }> {
  return series.map((s) => {
    const total = data.reduce((sum, d) => {
      const val = d[s.dataKey];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
    return { name: s.name, dataKey: s.dataKey, total };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChartAccessibleTable({
  data,
  series,
  resolvedColors,
  xAxisKey,
  chartType,
  caption,
}: ChartAccessibleTableProps) {
  const captionId = useId();

  // ─── Donut: one row per series, aggregated total ───────────────────────────

  if (chartType === 'donut') {
    const donutRows = buildDonutRows(data, series);
    return (
      <div className={classes.wrapper}>
        <table
          className={classes.table}
          aria-labelledby={caption ? captionId : undefined}
        >
          {caption && (
            <caption id={captionId} className="sr-only">
              {caption}
            </caption>
          )}
          <thead>
            <tr>
              <th scope="col">{t('chart.a11y.table.series')}</th>
              <th scope="col">{t('chart.a11y.table.value')}</th>
            </tr>
          </thead>
          <tbody>
            {donutRows.map((row) => {
              const color = resolvedColors[row.dataKey];
              return (
                <tr key={row.dataKey}>
                  <td>
                    {color && (
                      <span
                        className={classes.seriesSwatch}
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                    )}
                    {row.name}
                  </td>
                  <td>{String(row.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ─── Cartesian charts: one row per data point ──────────────────────────────

  return (
    <div className={classes.wrapper}>
      <table
        className={classes.table}
        aria-labelledby={caption ? captionId : undefined}
      >
        {caption && (
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            <th scope="col">{xAxisKey}</th>
            {series.map((s) => {
              const color = resolvedColors[s.dataKey];
              return (
                <th key={s.dataKey} scope="col">
                  {color && (
                    <span
                      className={classes.seriesSwatch}
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  )}
                  {s.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((dataPoint, rowIndex) => {
            const xValue = formatCellValue(dataPoint[xAxisKey]);
            return (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={`row-${rowIndex}`}>
                <td>{xValue.text}</td>
                {series.map((s) => {
                  const cell = formatCellValue(dataPoint[s.dataKey]);
                  return (
                    <td
                      key={s.dataKey}
                      className={cell.isNull ? classes.nullValue : undefined}
                    >
                      {cell.text}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

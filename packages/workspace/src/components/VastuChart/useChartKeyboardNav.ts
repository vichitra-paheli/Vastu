'use client';

/**
 * useChartKeyboardNav — keyboard navigation hook for VastuChart.
 *
 * Manages focused data point index and series index state.
 * Exposes handlers for arrow keys, Enter, and Tab.
 *
 * - Left/Right: move between data points (x-axis positions)
 * - Up/Down: cycle between visible series at the same x-position
 * - Enter: trigger drill-down action (same as click)
 *
 * Implements US-210 AC-1 through AC-4 (VASTU-2A-210a).
 */

import { useState, useCallback, useRef } from 'react';
import type { ChartDataPoint, SeriesConfig } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartKeyboardNavState {
  /** Currently focused data point index (x-axis position). -1 = no focus. */
  activePointIndex: number;
  /** Currently focused series index within visible series. */
  activeSeriesIndex: number;
  /** Whether the chart container is keyboard-focused. */
  isFocused: boolean;
}

export interface ChartKeyboardNavHandlers {
  /** Ref to attach to the chart container element. */
  containerRef: React.RefObject<HTMLDivElement>;
  /** onFocus handler — focuses the chart. */
  handleFocus: () => void;
  /** onBlur handler — clears focus when leaving container. */
  handleBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
  /** onKeyDown handler — arrow keys, Enter. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export interface UseChartKeyboardNavOptions {
  data: ChartDataPoint[];
  visibleSeries: SeriesConfig[];
  /** Called with the data point index and series when Enter is pressed. */
  onEnter?: (dataIndex: number, seriesIndex: number, dataPoint: ChartDataPoint, series: SeriesConfig) => void;
  /** Whether keyboard nav is enabled (false for sparklines). */
  enabled?: boolean;
}

export interface UseChartKeyboardNavResult {
  state: ChartKeyboardNavState;
  handlers: ChartKeyboardNavHandlers;
  /** The active data point, or null if none focused. */
  activeDataPoint: ChartDataPoint | null;
  /** The active series config, or null if none focused. */
  activeSeries: SeriesConfig | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChartKeyboardNav({
  data,
  visibleSeries,
  onEnter,
  enabled = true,
}: UseChartKeyboardNavOptions): UseChartKeyboardNavResult {
  const containerRef = useRef<HTMLDivElement>(null);

  const [activePointIndex, setActivePointIndex] = useState<number>(-1);
  const [activeSeriesIndex, setActiveSeriesIndex] = useState<number>(0);
  const [isFocused, setIsFocused] = useState(false);

  const dataLength = data.length;
  const seriesLength = visibleSeries.length;

  const handleFocus = useCallback(() => {
    if (!enabled) return;
    setIsFocused(true);
    // When first focused, place cursor at index 0 if not already set
    setActivePointIndex((prev) => (prev === -1 ? 0 : prev));
  }, [enabled]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    // Only clear focus if leaving the chart container entirely
    const container = containerRef.current;
    if (container && !container.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
      setActivePointIndex(-1);
      setActiveSeriesIndex(0);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enabled || dataLength === 0) return;

      switch (e.key) {
        case 'ArrowRight': {
          e.preventDefault();
          setActivePointIndex((prev) => {
            const next = prev === -1 ? 0 : Math.min(prev + 1, dataLength - 1);
            return next;
          });
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          setActivePointIndex((prev) => {
            const next = prev === -1 ? 0 : Math.max(prev - 1, 0);
            return next;
          });
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          if (seriesLength > 0) {
            setActiveSeriesIndex((prev) => (prev + 1) % seriesLength);
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (seriesLength > 0) {
            setActiveSeriesIndex((prev) => (prev - 1 + seriesLength) % seriesLength);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (activePointIndex >= 0 && activePointIndex < dataLength && onEnter) {
            const dp = data[activePointIndex];
            const series = visibleSeries[activeSeriesIndex] ?? visibleSeries[0];
            if (dp && series) {
              onEnter(activePointIndex, activeSeriesIndex, dp, series);
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [enabled, dataLength, seriesLength, activePointIndex, data, visibleSeries, activeSeriesIndex, onEnter],
  );

  const activeDataPoint =
    activePointIndex >= 0 && activePointIndex < dataLength ? (data[activePointIndex] ?? null) : null;
  const activeSeries =
    activeSeriesIndex >= 0 && activeSeriesIndex < seriesLength
      ? (visibleSeries[activeSeriesIndex] ?? null)
      : null;

  return {
    state: { activePointIndex, activeSeriesIndex, isFocused },
    handlers: { containerRef, handleFocus, handleBlur, handleKeyDown },
    activeDataPoint,
    activeSeries,
  };
}

/**
 * VastuChart color palette — discrete series colors from Style Guide §1.4 / §10.2.
 *
 * Rules (from SS10.2):
 * - Use in order — never rearrange for aesthetics
 * - Consistency across views matters more than per-chart optimization
 * - More than 10 series: group tail into "Other" using --v-text-tertiary
 *
 * Implements US-135 AC-3.
 */

/**
 * Ordered palette of 10 discrete series colors.
 * Index 0 is always the first series, index 1 the second, and so on.
 *
 * Source: Style Guide §1.4 Chart discrete series palette.
 * Pattern: alternates saturated ↔ desaturated and warm ↔ cool so any two
 * adjacent colors are visually distinct even at 12px line width.
 */
export const CHART_SERIES_COLORS: readonly string[] = [
  '#76B900', // 0 — Green, high contrast
  '#9ACCF2', // 1 — Light blue, desaturated
  '#A96700', // 2 — Dark amber, warm anchor
  '#FEB3AD', // 3 — Light salmon, soft
  '#A05AB4', // 4 — Purple, distinct hue shift
  '#BFE882', // 5 — Light green, desaturated pair of index 0
  '#2378CB', // 6 — Strong blue, matches UI primary (intentional)
  '#E7C32B', // 7 — Yellow, bright separator
  '#DC3628', // 8 — Red, urgent/final
  '#DEBAE8', // 9 — Light lavender, soft close
] as const;

/**
 * Color used for "Other" when more than 10 series are present.
 * References the CSS custom property for tertiary text color.
 */
export const CHART_OTHER_COLOR = 'var(--v-text-tertiary)';

/**
 * Get the color for a series at a given index.
 *
 * When index >= 10 (more than 10 series are defined), returns CHART_OTHER_COLOR
 * to visually group the tail into "Other". Within the first 10 indices, wraps
 * around to guarantee a color is always returned.
 *
 * @param index - Zero-based series index (as defined in the series array).
 * @returns A hex color string or CSS custom property reference.
 */
export function getSeriesColor(index: number): string {
  // Indices 10 and above represent "tail" series grouped as Other
  if (index >= CHART_SERIES_COLORS.length) {
    return CHART_OTHER_COLOR;
  }
  // Wrap within 0-9 range for safety (should never be needed for < 10 series)
  return CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];
}

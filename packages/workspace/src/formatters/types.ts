/**
 * formatters/types.ts — type definitions for the custom cell formatter registry.
 *
 * A FormatterDefinition describes how a named display type renders, sorts,
 * exports, and filters cell values. Apps extend the built-in set by
 * registering their own formatters via side-effect imports at startup.
 *
 * Implements VASTU-2A-205.
 */

import type React from 'react';

/**
 * Context passed to a formatter's render function.
 * Contains the raw cell value and the full row record.
 */
export interface FormatterRenderContext {
  /** The raw cell value. */
  value: unknown;
  /** The full row record for cross-field access. */
  row: Record<string, unknown>;
}

/**
 * Context passed to a formatter's sort comparator.
 */
export interface FormatterSortContext {
  /** Raw value from row A. */
  aValue: unknown;
  /** Raw value from row B. */
  bValue: unknown;
}

/**
 * Context passed to a formatter's export function.
 * Returns a plain string suitable for CSV / clipboard output.
 */
export interface FormatterExportContext {
  /** The raw cell value. */
  value: unknown;
  /** The full row record. */
  row: Record<string, unknown>;
}

/**
 * Context passed to a formatter's filter-value extractor.
 * Returns the comparable value used for client-side filter matching.
 */
export interface FormatterFilterContext {
  /** The raw cell value. */
  value: unknown;
}

/**
 * Metadata describing a formatter in the registry.
 */
export interface FormatterMeta {
  /** Human-readable label shown in the display type picker. */
  label: string;
  /**
   * Optional group for organising the display type picker.
   * Examples: 'text', 'numbers', 'dates', 'visual'.
   */
  group?: string;
  /** Short description shown as a tooltip in the builder UI. */
  description?: string;
}

/**
 * A formatter definition registered with FormatterRegistry.
 *
 * Only `id`, `meta`, and `render` are required.
 * The optional helpers (sort, export, filter) fall back to sensible defaults
 * when omitted — string comparison for sort, String(value) for export, and
 * identity for filter.
 */
export interface FormatterDefinition {
  /**
   * Unique identifier for this formatter.
   * Used as the `displayType` value in field configuration.
   * Examples: 'text', 'currency', 'relativeDate', 'myCustomBadge'.
   */
  id: string;

  /** Display metadata for the builder UI. */
  meta: FormatterMeta;

  /**
   * Render the cell value as a React node.
   * This function is called from VastuTableCell and ChartTooltip.
   *
   * Must be a pure function — side effects are not allowed here.
   */
  render: (ctx: FormatterRenderContext) => React.ReactNode;

  /**
   * Optional comparator for client-side column sorting.
   * Return negative if a < b, 0 if equal, positive if a > b.
   * When omitted, a default string/number comparator is used.
   */
  sort?: (ctx: FormatterSortContext) => number;

  /**
   * Optional export serialiser.
   * Returns a plain string for CSV / clipboard export.
   * When omitted, falls back to `String(value)` (empty string for null/undefined).
   */
  export?: (ctx: FormatterExportContext) => string;

  /**
   * Optional filter value extractor.
   * Returns the value used when matching this cell against a FilterCondition.
   * When omitted, the raw value is used directly.
   */
  filter?: (ctx: FormatterFilterContext) => unknown;
}

/**
 * Data engine barrel export.
 *
 * Exports types, translators, and utilities for the generic data query system.
 * Implements US-202 (AC-2, AC-3, AC-5, AC-6, AC-7).
 *
 * Accessible as: import { ... } from '@vastu/shared/data-engine'
 */

// ─── Filter types (US-202) ────────────────────────────────────────────────────

export type {
  FilterMode,
  DataType,
  NumberRangeValue,
  DateRangeValue,
  FilterValue,
  FilterCondition,
  FilterGroup,
  FilterNode,
} from './filterTypes';

// ─── Data engine types (US-202) ───────────────────────────────────────────────

export type {
  SortSpec,
  ColumnMeta,
  DataQueryRequest,
  DataQueryResponse,
} from './types';

// ─── Translators (US-202) ─────────────────────────────────────────────────────

export { translateFilter } from './filterTranslator';
export type { PrismaWhere } from './filterTranslator';
export { translateSort } from './sortTranslator';
export type { PrismaOrderByItem } from './sortTranslator';
export { buildSearchWhere } from './searchTranslator';

// ─── Column metadata (US-202) ─────────────────────────────────────────────────

export {
  getColumnMeta,
  getModelNames,
  getStringColumns,
  _clearCache,
} from './columnMeta';

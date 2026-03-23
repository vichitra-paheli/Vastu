/**
 * data-engine — barrel export.
 *
 * Entry point for all data engine types and utility functions.
 * Imported as `@vastu/shared/data-engine`.
 *
 * Implements VASTU-2A-202a.
 */

// Types
export type {
  FilterNode,
  FilterCondition,
  FilterGroup,
  FilterMode,
  FilterValue,
  DataType,
  NumberRangeValue,
  DateRangeValue,
  SortDirection,
  SortConfig,
  PaginationConfig,
  ColumnMeta,
  QueryResponse,
  AggregateGroup,
  AggregateResponse,
  PrismaWhere,
  PrismaOrderBy,
} from './types';

// filterTranslator
export { translateFilter } from './filterTranslator';

// sortTranslator
export { translateSort } from './sortTranslator';

// searchTranslator
export { translateSearch, getStringColumnNames } from './searchTranslator';

// columnMeta
export { extractColumnMeta, getAllModelNames, resolveModelName } from './columnMeta';

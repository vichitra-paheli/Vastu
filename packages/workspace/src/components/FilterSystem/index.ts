/**
 * FilterSystem barrel export.
 * Re-exports all public API surface of the filter system module.
 */

// Types
export type {
  FilterMode,
  DataType,
  FilterCondition,
  FilterGroup,
  FilterNode,
  FilterValue,
  NumberRangeValue,
  DateRangeValue,
  FilterDimension,
  EnumOption,
  FilterState,
} from './types';

export {
  createRootGroup,
  createCondition,
  isFilterFlat,
  countConditions,
} from './types';

// Engine
export {
  evaluateCondition,
  evaluateGroup,
  evaluateFilter,
  applyFilters,
  validateRegex,
} from './FilterEngine';

// Components
export { FilterBar } from './FilterBar';
export type { FilterBarProps } from './FilterBar';

export { FilterPill } from './FilterPill';
export type { FilterPillProps } from './FilterPill';

export { FilterModeSelector } from './FilterModeSelector';
export type { FilterModeSelectorProps } from './FilterModeSelector';

export { FilterInput } from './FilterInput';
export type { FilterInputProps } from './FilterInput';

export { DimensionPicker } from './DimensionPicker';
export type { DimensionPickerProps } from './DimensionPicker';

export { CompositeFilterBuilder } from './CompositeFilterBuilder';
export type { CompositeFilterBuilderProps } from './CompositeFilterBuilder';

// Inputs
export { TextFilterInput } from './inputs/TextFilterInput';
export { NumberFilterInput } from './inputs/NumberFilterInput';
export { DateFilterInput } from './inputs/DateFilterInput';
export { EnumFilterInput } from './inputs/EnumFilterInput';
export { BooleanFilterInput } from './inputs/BooleanFilterInput';

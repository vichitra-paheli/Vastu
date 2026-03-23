/**
 * Data engine barrel export.
 *
 * Exports types, translators, and utilities for the generic data query system
 * (US-202) and workspace event bus (US-207).
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

// ─── Schema introspection (US-204) ────────────────────────────────────────────

export type { FieldType, RelationType, FieldMeta, RelationMeta, ModelSchema } from './schemaIntrospector';
export {
  getModelList,
  getModelSchema,
  getModelFields,
  getModelRelations,
  _clearSchemaCache,
} from './schemaIntrospector';

// ─── Workspace events (US-207) ────────────────────────────────────────────────

export type { WorkspaceEvent, WorkspaceEventType } from './eventTypes';
export { emitWorkspaceEvent, subscribe, subscriberCount } from './events';

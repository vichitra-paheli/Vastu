/**
 * formatters/index.ts — barrel export for the formatter registry.
 *
 * Importing this module triggers built-in formatter registration as a side
 * effect (via builtins.ts). Apps that need only the registry without built-ins
 * can import registry.ts and types.ts directly.
 *
 * Implements VASTU-2A-205.
 */

// Re-export all types
export type {
  FormatterDefinition,
  FormatterMeta,
  FormatterRenderContext,
  FormatterSortContext,
  FormatterExportContext,
  FormatterFilterContext,
} from './types';

// Re-export registry functions
export {
  registerFormatter,
  getFormatter,
  getAllFormatters,
  hasFormatter,
  unregisterFormatter,
  clearFormatterRegistry,
} from './registry';

// Import builtins to trigger side-effect registration.
// This ensures that whenever the formatters barrel is imported,
// the built-in set is already registered.
export { BUILTIN_FORMATTERS, registerBuiltinFormatters } from './builtins';

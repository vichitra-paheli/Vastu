/**
 * formatters/registry.ts — singleton formatter registry for the workspace.
 *
 * Maps formatter IDs to their FormatterDefinition objects.
 * Built-in formatters are registered in builtins.ts; apps register custom
 * formatters via side-effect imports at startup.
 *
 * Pattern mirrors panels/registry.ts and templates/registry.ts.
 *
 * Usage:
 *   registerFormatter(myFormatterDefinition);
 *   const def = getFormatter('currency');     // FormatterDefinition | undefined
 *   const all = getAllFormatters();           // FormatterDefinition[]
 *
 * Implements VASTU-2A-205a.
 */

import type { FormatterDefinition } from './types';

const registry = new Map<string, FormatterDefinition>();

/**
 * Register a formatter in the global registry.
 *
 * Throws if a formatter with the same ID is already registered.
 * This prevents accidental overwrites from duplicate module imports.
 * Built-in formatters (registered in builtins.ts) cannot be replaced.
 */
export function registerFormatter(definition: FormatterDefinition): void {
  if (registry.has(definition.id)) {
    throw new Error(
      `[formatterRegistry] Formatter "${definition.id}" is already registered. ` +
        'Each formatter ID must be unique. Built-in formatters cannot be replaced.',
    );
  }
  registry.set(definition.id, definition);
}

/**
 * Look up a registered formatter by ID.
 *
 * Returns undefined when no formatter is registered with that ID.
 * Callers should handle the undefined case — VastuTableCell falls back
 * to text rendering and emits a console.warn when a type is unknown.
 */
export function getFormatter(id: string): FormatterDefinition | undefined {
  return registry.get(id);
}

/**
 * Return all registered formatter definitions, sorted by ID.
 * Used by FieldConfigSection to populate the display type picker dynamically.
 */
export function getAllFormatters(): FormatterDefinition[] {
  return Array.from(registry.values()).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Return true if a formatter with the given ID exists in the registry.
 */
export function hasFormatter(id: string): boolean {
  return registry.has(id);
}

/**
 * Remove a formatter from the registry.
 * Intended for test isolation — do not call in production code.
 */
export function unregisterFormatter(id: string): void {
  registry.delete(id);
}

/**
 * Clear all registered formatters.
 * Intended for test isolation — do not call in production code.
 */
export function clearFormatterRegistry(): void {
  registry.clear();
}

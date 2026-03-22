/**
 * templates/registry.ts — template type registry for the workspace.
 *
 * Maps TemplateType values to their React components and metadata.
 * Templates must be registered before any template-aware panel can render them.
 *
 * Usage:
 *   registerTemplate('table-listing', TableListingTemplate, meta);
 *   const entry = getTemplate('table-listing');
 *   const all   = getRegisteredTemplates();
 *
 * Implements VASTU-1B-INFRA.
 */

import type React from 'react';
import type { TemplateType, TemplateConfig, TemplateProps } from './types';

/** Metadata attached to every registered template. */
export interface TemplateMeta {
  /** Human-readable name shown in the command palette. */
  label: string;
  /** Tabler icon name used in the UI. */
  icon: string;
  /** Short description shown in template picker. */
  description: string;
  /** Default configuration applied when the user first creates this template. */
  defaultConfig: Partial<TemplateConfig>;
}

/** A single entry in the template registry. */
export interface TemplateRegistryEntry {
  /** The React component that renders the template. */
  component: React.ComponentType<TemplateProps>;
  /** Metadata for the template picker and command palette. */
  meta: TemplateMeta;
}

const registry = new Map<TemplateType, TemplateRegistryEntry>();

/**
 * Register a template type in the global registry.
 *
 * Throws if the same TemplateType is registered twice — this prevents
 * accidental overwrites from module-level side effects.
 */
export function registerTemplate(
  type: TemplateType,
  component: React.ComponentType<TemplateProps>,
  meta: TemplateMeta,
): void {
  if (registry.has(type)) {
    throw new Error(
      `[templateRegistry] Template type "${type}" is already registered. ` +
        'Each template type must be registered only once.',
    );
  }
  registry.set(type, { component, meta });
}

/**
 * Look up a registered template by type.
 *
 * Returns undefined when no template is registered for the given type.
 */
export function getTemplate(type: TemplateType): TemplateRegistryEntry | undefined {
  return registry.get(type);
}

/**
 * Return all registered template entries.
 * Used by the command palette and template picker to enumerate available templates.
 */
export function getRegisteredTemplates(): Array<{ type: TemplateType } & TemplateRegistryEntry> {
  return Array.from(registry.entries()).map(([type, entry]) => ({ type, ...entry }));
}

/**
 * Remove a template type from the registry.
 * Intended for test isolation — do not call in production code.
 */
export function unregisterTemplate(type: TemplateType): void {
  registry.delete(type);
}

/**
 * Clear all registered templates.
 * Intended for test isolation — do not call in production code.
 */
export function clearTemplateRegistry(): void {
  registry.clear();
}

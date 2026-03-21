/**
 * registry.ts — panel type registry for the workspace.
 *
 * The registry maps panel type IDs to their definitions.
 * All panel types must be registered before Dockview can render them.
 *
 * Usage:
 *   registerPanel(myPanelDefinition);
 *   const def = getPanel('my-panel-type');
 *   const all = getAllPanels();
 *
 * Panel types are registered at application boot by importing the module
 * that calls registerPanel(). Built-in panels (WelcomePanel) are auto-registered
 * at the bottom of this file.
 */

import type { PanelDefinition, PanelTypeId } from '../types/panel';

const registry = new Map<PanelTypeId, PanelDefinition>();

/**
 * Register a panel type in the global registry.
 *
 * Throws if a panel with the same ID is already registered.
 * This prevents accidental duplicate registrations that would cause
 * unexpected rendering behavior.
 */
export function registerPanel(definition: PanelDefinition): void {
  if (registry.has(definition.id)) {
    throw new Error(
      `[panelRegistry] Panel type "${definition.id}" is already registered. ` +
        'Each panel type ID must be unique.',
    );
  }
  registry.set(definition.id, definition);
}

/**
 * Look up a registered panel type by ID.
 *
 * Returns undefined if no panel is registered with that ID.
 * Callers should handle the undefined case — Dockview will show nothing
 * for an unknown component type.
 */
export function getPanel(id: PanelTypeId): PanelDefinition | undefined {
  return registry.get(id);
}

/**
 * Return all registered panel definitions.
 * Useful for rendering the sidebar page list and command palette.
 */
export function getAllPanels(): PanelDefinition[] {
  return Array.from(registry.values());
}

/**
 * Remove a panel type from the registry. Used in tests to avoid state leakage.
 * Should not be called in production code.
 */
export function unregisterPanel(id: PanelTypeId): void {
  registry.delete(id);
}

/**
 * Clear all registered panels. Used in tests.
 * Should not be called in production code.
 */
export function clearRegistry(): void {
  registry.clear();
}

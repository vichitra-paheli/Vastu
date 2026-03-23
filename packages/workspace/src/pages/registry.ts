/**
 * pages/registry.ts — application page registry for the workspace.
 *
 * The registry holds code-registered ("static") page definitions.
 * Static pages are always present in the sidebar and command palette.
 * They cannot be deleted, though their template config can be overridden
 * by a matching database record (via `mergeWithDynamic`).
 *
 * Usage:
 *   registerPage(myPageDefinition);
 *   const all    = getAllPages();           // sorted by section + order + name
 *   const page   = getPageById('races');   // undefined if not found
 *   const merged = mergeWithDynamic(dbPages); // static + dynamic, static first
 *
 * Implements VASTU-2A-206.
 */

import type { PageDefinition, MergedPage, PageSection } from './types';
import type { TemplateConfig } from '../templates/types';

/** Section display priority — lower number = higher in the sidebar. */
const SECTION_ORDER: Record<PageSection, number> = {
  pages: 0,
  system: 1,
  admin: 2,
};

/** Module-level singleton map: pageId → PageDefinition. */
const registry = new Map<string, PageDefinition>();

// ---------------------------------------------------------------------------
// Registration API
// ---------------------------------------------------------------------------

/**
 * Register a page definition in the global registry.
 *
 * Throws if a page with the same ID is already registered.
 * This prevents accidental duplicate registrations from module-level side effects.
 *
 * @param definition - The page definition to register.
 * @throws {Error} If a page with the same ID has already been registered.
 */
export function registerPage(definition: PageDefinition): void {
  if (registry.has(definition.id)) {
    throw new Error(
      `[pageRegistry] Page "${definition.id}" is already registered. ` +
        'Each page ID must be unique.',
    );
  }
  registry.set(definition.id, definition);
}

// ---------------------------------------------------------------------------
// Read API
// ---------------------------------------------------------------------------

/**
 * Return all registered page definitions, sorted by:
 *   1. Section (pages → system → admin)
 *   2. Explicit `order` ascending (undefined order sorts last)
 *   3. `name` alphabetically as a tiebreaker
 *
 * @returns Sorted array of all registered PageDefinitions.
 */
export function getAllPages(): PageDefinition[] {
  const pages = Array.from(registry.values());
  return sortPages(pages);
}

/**
 * Look up a registered page by its ID.
 *
 * @param id - The page ID to look up.
 * @returns The PageDefinition if found, or undefined.
 */
export function getPageById(id: string): PageDefinition | undefined {
  return registry.get(id);
}

// ---------------------------------------------------------------------------
// Merge API (static + dynamic)
// ---------------------------------------------------------------------------

/**
 * Merge static (code-registered) pages with dynamic (database) pages.
 *
 * Rules:
 * - Static pages appear first (in `order` order), then dynamic-only pages.
 * - When a static page has a matching DB record, the DB config is merged in
 *   on top of the static default config (DB wins on overlapping keys).
 * - Dynamic-only pages (no matching static registration) are appended after
 *   all static pages, sorted by their own `order`/`name`.
 * - Static pages are always marked `isStatic: true`.
 * - Dynamic-only pages are marked `isStatic: false`.
 *
 * @param dynamicPages - Pages loaded from the database.
 * @returns Merged and sorted array of MergedPage entries.
 */
export function mergeWithDynamic(
  dynamicPages: Array<PageDefinition & { config?: Partial<TemplateConfig> }>,
): MergedPage[] {
  const staticPages = Array.from(registry.values());
  const dynamicById = new Map(dynamicPages.map((p) => [p.id, p]));

  // Build merged entries for all static pages
  const mergedStatic: MergedPage[] = staticPages.map((staticDef) => {
    const dbOverride = dynamicById.get(staticDef.id);
    const resolvedConfig: Partial<TemplateConfig> = {
      ...(staticDef.config ?? {}),
      ...(dbOverride?.config ?? {}),
    };
    return {
      ...staticDef,
      isStatic: true,
      resolvedConfig,
    };
  });

  // Collect dynamic-only pages (no matching static registration)
  const dynamicOnly: MergedPage[] = dynamicPages
    .filter((p) => !registry.has(p.id))
    .map((p) => ({
      ...p,
      isStatic: false,
      resolvedConfig: p.config ?? {},
    }));

  return [...sortPages(mergedStatic), ...sortPages(dynamicOnly)];
}

// ---------------------------------------------------------------------------
// Test helpers (not for production use)
// ---------------------------------------------------------------------------

/**
 * Remove a page from the registry.
 * Intended for test isolation — do not call in production code.
 */
export function unregisterPage(id: string): void {
  registry.delete(id);
}

/**
 * Clear all registered pages.
 * Intended for test isolation — do not call in production code.
 */
export function clearPageRegistry(): void {
  registry.clear();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sort a list of page definitions by section → order → name.
 *
 * @param pages - Unsorted page definitions.
 * @returns A new sorted array (does not mutate the input).
 */
function sortPages<T extends PageDefinition>(pages: T[]): T[] {
  return [...pages].sort((a, b) => {
    // 1. Section priority
    const sectionA = SECTION_ORDER[a.section ?? 'pages'];
    const sectionB = SECTION_ORDER[b.section ?? 'pages'];
    if (sectionA !== sectionB) return sectionA - sectionB;

    // 2. Explicit order (undefined order sorts after any explicit order)
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;

    // 3. Alphabetical by name
    return a.name.localeCompare(b.name);
  });
}

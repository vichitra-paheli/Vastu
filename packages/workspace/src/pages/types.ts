/**
 * pages/types.ts — type definitions for the application page registry.
 *
 * A PageDefinition describes a code-registered ("static") application page.
 * Static pages are always present in the sidebar and command palette;
 * they cannot be deleted, though their config can be overridden in the database.
 *
 * Dynamic pages (created by users via the builder or seeded from the database)
 * are stored in the DB and loaded at runtime. Both types coexist in the sidebar
 * — static first (in `order` order), then dynamic.
 *
 * Implements VASTU-2A-206.
 */

import type { TemplateType, TemplateConfig } from '../templates/types';

/** Sidebar section that a page belongs to. */
export type PageSection = 'pages' | 'system' | 'admin';

/**
 * A code-registered page definition.
 *
 * Pages are registered at module load time via `registerPage()` and appear
 * in the sidebar and command palette automatically.
 */
export interface PageDefinition {
  /**
   * Stable, unique identifier for this page.
   * Used as the panel type ID when opened in Dockview.
   * Convention: lowercase-kebab-case, e.g. "race-results", "my-dashboard".
   */
  id: string;

  /**
   * Human-readable display name shown in the sidebar and command palette.
   * All user-facing strings must pass through `t()` at the call site —
   * this field stores the translation key or the already-resolved string.
   */
  name: string;

  /**
   * Tabler icon name (without the "Icon" prefix).
   * e.g. "LayoutDashboard", "ChartBar", "Users".
   * Used in the sidebar item and command palette action.
   */
  icon: string;

  /**
   * Which template renders this page when opened.
   * Maps to a registered TemplateType.
   */
  template: TemplateType;

  /**
   * Which sidebar section this page appears in.
   * Defaults to 'pages' when omitted.
   */
  section?: PageSection;

  /**
   * Display order within the section (ascending).
   * Pages with lower order values appear first.
   * Static pages with no order are sorted after those with an explicit order.
   */
  order?: number;

  /**
   * Optional default template configuration.
   * Applied when the page is first opened and no DB config exists.
   * The database config (if any) always takes precedence.
   */
  config?: Partial<TemplateConfig>;
}

/**
 * A merged page entry combining a static definition with any DB overrides.
 *
 * When static and dynamic pages are merged, the static definition is the
 * authoritative source of truth for `id`, `name`, `icon`, and `template`.
 * Only `config` can be overridden from the database.
 */
export interface MergedPage extends PageDefinition {
  /**
   * True when this page comes from the code registry (cannot be deleted).
   * False for user-created pages that only exist in the database.
   */
  isStatic: boolean;

  /**
   * Resolved config — static default merged with any DB overrides.
   * DB wins on overlapping keys; static default fills in missing keys.
   */
  resolvedConfig: Partial<TemplateConfig>;
}

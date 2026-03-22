/**
 * Page type — represents a registered page definition.
 * Minimal in Phase 1A; expanded in Phase 1B with template configs.
 */

export interface Page {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  templateType: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * PageConfiguration — persisted template configuration for a page.
 *
 * Stored separately from the Page record so that template config changes
 * do not bump the page's own updatedAt timestamp. Version is incremented
 * on every PUT to allow optimistic-concurrency checks in future.
 *
 * The `config` field mirrors TemplateConfig from @vastu/workspace.
 * It is typed as Record<string, unknown> here so the shared package does not
 * take a runtime dependency on the workspace package (which is client-only).
 */
export interface PageConfiguration {
  /** Surrogate primary key. */
  id: string;
  /** FK to the Page this configuration belongs to. */
  pageId: string;
  /** FK to the owning organization. */
  organizationId: string;
  /** The TemplateConfig payload stored as JSON. */
  config: Record<string, unknown>;
  /** Monotonically increasing version counter. */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

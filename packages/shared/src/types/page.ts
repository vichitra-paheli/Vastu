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

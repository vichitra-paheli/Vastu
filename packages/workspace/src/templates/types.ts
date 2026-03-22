/**
 * templates/types.ts — foundational types for the template infrastructure.
 *
 * All template components receive TemplateProps. Configuration is stored as
 * TemplateConfig and persisted via the page configuration API.
 *
 * Implements VASTU-1B-INFRA.
 */

/** All supported template types. */
export type TemplateType =
  | 'table-listing'
  | 'summary-dashboard'
  | 'multi-tab-detail'
  | 'data-explorer'
  | 'form-page'
  | 'timeline-activity'
  | 'dashboard';

/** Data source configuration for a template. */
export interface DataSourceConfig {
  /** Type of data source (e.g. 'prisma', 'rest', 'graphql'). */
  type: string;
  /** Optional REST or GraphQL endpoint URL. */
  endpoint?: string;
  /** Optional Prisma model name. */
  model?: string;
  /** Optional fixed filters applied at the data-source level. */
  filters?: Record<string, unknown>;
}

/** Configuration for a single field displayed in a template. */
export interface FieldConfig {
  /** Unique field identifier (maps to the data model property). */
  key: string;
  /** Human-readable column / field label. */
  label: string;
  /** Data type for formatting and filter controls. */
  type: 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'relation';
  /** Whether the field is shown by default. Defaults to true. */
  visible?: boolean;
  /** Whether the column can be sorted. Defaults to false. */
  sortable?: boolean;
  /** Whether the column can be filtered. Defaults to false. */
  filterable?: boolean;
  /** Column width hint in pixels. */
  width?: number;
}

/** Configuration for a named section within a template layout. */
export interface SectionConfig {
  /** Unique section identifier. */
  id: string;
  /** Display label for the section. */
  label: string;
  /** Section variant / rendering type. */
  type: string;
  /** Whether the section is visible. Defaults to true. */
  visible?: boolean;
  /** Display order (ascending). */
  order?: number;
}

/** Role-based permission gates for a template page. */
export interface PermissionConfig {
  /** Roles that may view the page. */
  viewRoles?: string[];
  /** Roles that may edit records on the page. */
  editRoles?: string[];
  /** Roles that may delete records on the page. */
  deleteRoles?: string[];
}

/**
 * Base configuration that all templates share.
 * Persisted to the page configuration API and hydrated via useTemplateConfig.
 */
export interface TemplateConfig {
  /** Which template renders this page. */
  templateType: TemplateType;
  /** Optional data source configuration. */
  dataSource?: DataSourceConfig;
  /** Ordered list of fields / columns. */
  fields?: FieldConfig[];
  /** Named sections within the layout. */
  sections?: SectionConfig[];
  /** Permission gates. */
  permissions?: PermissionConfig;
  /** Arbitrary template-specific metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Props that every template component receives.
 * Templates use useTemplateConfig internally or accept config via these props.
 */
export interface TemplateProps {
  /** The page ID — used to fetch/persist config. */
  pageId: string;
  /** Resolved template configuration. */
  config: TemplateConfig;
  /** Called when the user edits the configuration in builder mode. */
  onConfigChange?: (config: TemplateConfig) => void;
  /** True while config or data is loading. */
  loading?: boolean;
  /** Non-null when an error occurred loading config or data. */
  error?: string | null;
}

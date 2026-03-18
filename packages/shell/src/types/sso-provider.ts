/**
 * Shared types for SSO provider management (settings page).
 *
 * Distinct from sso.ts which defines types for the auth-time SSO lookup flow.
 * These types represent the admin configuration model for CRUD operations on
 * identity providers in /settings/sso.
 *
 * NOTE: The sso_providers table does not yet exist in the Prisma schema.
 * The API routes return stub data until the table is added (Phase 0 ADR-002).
 *
 * MCP parity note: When the MCP server is built (Phase 4), the equivalent
 * tools would be:
 *   - list_sso_provider_configs()
 *   - create_sso_provider_config(input)
 *   - update_sso_provider_config(id, input)
 *   - delete_sso_provider_config(id)
 */

import type { SsoProtocol } from './sso';

export type { SsoProtocol };

export type SsoProviderStatus = 'LIVE' | 'DRAFT';

/**
 * A configured SSO identity provider as returned by the API.
 */
export interface SsoProviderConfig {
  id: string;
  name: string;
  protocol: SsoProtocol;
  status: SsoProviderStatus;
  isDefault: boolean;
  metadataUrl: string | null;
  clientId: string | null;
  redirectUri: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new SSO provider config.
 */
export interface CreateSsoProviderInput {
  name: string;
  protocol: SsoProtocol;
  metadataUrl?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/**
 * Input for updating an existing SSO provider config.
 */
export interface UpdateSsoProviderInput {
  name?: string;
  protocol?: SsoProtocol;
  status?: SsoProviderStatus;
  metadataUrl?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  isDefault?: boolean;
}

/**
 * API response shape for list operations.
 */
export interface SsoProviderListResponse {
  providers: SsoProviderConfig[];
}

/**
 * API response shape for single provider operations.
 */
export interface SsoProviderResponse {
  provider: SsoProviderConfig;
}

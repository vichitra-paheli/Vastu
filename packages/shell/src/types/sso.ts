/**
 * Shared types for SSO provider lookup.
 *
 * These types are used by both:
 * - The API route:  packages/shell/src/app/api/auth/sso/providers/route.ts
 * - The form:       packages/shell/src/components/auth/SsoForm.tsx
 * - The tests:      packages/shell/src/components/auth/__tests__/SsoForm.test.tsx
 *
 * Kept in a dedicated types file rather than in the route handler to avoid
 * importing from Next.js route modules in test environments.
 */

export type SsoProtocol = 'SAML' | 'OIDC';

export interface SsoProvider {
  id: string;
  name: string;
  protocol: SsoProtocol;
  /** The Keycloak identity provider alias used for sign-in redirects. */
  keycloakAlias: string;
}

export interface SsoProvidersResponse {
  providers: SsoProvider[];
}

/**
 * Startup validation for required environment variables.
 *
 * All required env vars are declared here. If any are missing at runtime,
 * a clear error is thrown that names the missing variable(s) so the problem
 * is immediately actionable.
 *
 * Export typed env vars from this module so the rest of the codebase can
 * import them without repeating process.env lookups or non-null assertions.
 *
 * Optional vars are exported with a defined fallback value.
 *
 * NOTE: We use getter functions so the validation runs at request time,
 * not at module initialization time. This prevents `next build` from
 * failing when env vars are not set in the CI build environment.
 */

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Check your .env file or deployment configuration.`,
    );
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

// ---------------------------------------------------------------------------
// Required variables (lazy — validated on first access, not at import time)
// ---------------------------------------------------------------------------

/**
 * Keycloak OAuth2 client ID registered in the vastu realm.
 */
export function getKeycloakClientId(): string {
  return requireEnv('KEYCLOAK_CLIENT_ID');
}

/**
 * Keycloak OAuth2 client secret.
 */
export function getKeycloakClientSecret(): string {
  return requireEnv('KEYCLOAK_CLIENT_SECRET');
}

/**
 * Base URL of the Keycloak instance (e.g. http://localhost:8080).
 */
export function getKeycloakUrl(): string {
  return requireEnv('KEYCLOAK_URL');
}

/**
 * Keycloak realm name (e.g. vastu).
 */
export function getKeycloakRealm(): string {
  return requireEnv('KEYCLOAK_REALM');
}

// ---------------------------------------------------------------------------
// Optional variables with defaults
// ---------------------------------------------------------------------------

/**
 * Public base URL of the Next.js application.
 * Used for building absolute links (e.g. email verification URLs).
 * Defaults to http://localhost:3000 for local development.
 */
export const NEXTAUTH_URL: string = optionalEnv('NEXTAUTH_URL', 'http://localhost:3000');

/**
 * Redis connection URL.
 * Defaults to the local Docker Compose Redis instance.
 */
export const REDIS_URL: string = optionalEnv('REDIS_URL', 'redis://localhost:6379');

// ---------------------------------------------------------------------------
// Computed values
// ---------------------------------------------------------------------------

/**
 * Full Keycloak issuer URL for the configured realm.
 * Derived from KEYCLOAK_URL and KEYCLOAK_REALM.
 */
export function getKeycloakIssuer(): string {
  return `${getKeycloakUrl()}/realms/${getKeycloakRealm()}`;
}

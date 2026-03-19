/**
 * Startup validation for required environment variables.
 *
 * All required env vars are declared here. If any are missing at module
 * initialization time, a clear error is thrown that names the missing
 * variable(s) so the problem is immediately actionable.
 *
 * Export typed env vars from this module so the rest of the codebase can
 * import them without repeating process.env lookups or non-null assertions.
 *
 * Optional vars are exported with a defined fallback value.
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
// Required variables
// ---------------------------------------------------------------------------

/**
 * Keycloak OAuth2 client ID registered in the vastu realm.
 */
export const KEYCLOAK_CLIENT_ID: string = requireEnv('KEYCLOAK_CLIENT_ID');

/**
 * Keycloak OAuth2 client secret.
 */
export const KEYCLOAK_CLIENT_SECRET: string = requireEnv('KEYCLOAK_CLIENT_SECRET');

/**
 * Base URL of the Keycloak instance (e.g. http://localhost:8080).
 */
export const KEYCLOAK_URL: string = requireEnv('KEYCLOAK_URL');

/**
 * Keycloak realm name (e.g. vastu).
 */
export const KEYCLOAK_REALM: string = requireEnv('KEYCLOAK_REALM');

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
export const KEYCLOAK_ISSUER: string = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

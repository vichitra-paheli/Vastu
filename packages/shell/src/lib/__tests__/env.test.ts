/**
 * Unit tests for the env validation utility.
 *
 * Required Keycloak env vars are now exposed as lazy getter functions
 * (getKeycloakClientId(), etc.) so that `next build` does not fail in CI.
 * Each test sets the env vars, imports the module, and calls the getter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REQUIRED_VARS = {
  KEYCLOAK_CLIENT_ID: 'test-client-id',
  KEYCLOAK_CLIENT_SECRET: 'test-client-secret',
  KEYCLOAK_URL: 'http://localhost:8080',
  KEYCLOAK_REALM: 'vastu',
};

function setAllRequiredVars() {
  for (const [key, value] of Object.entries(REQUIRED_VARS)) {
    vi.stubEnv(key, value);
  }
}

function unsetVar(name: string) {
  // Remove the key from process.env entirely.
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- intentional for test teardown
  delete process.env[name];
}

async function importEnv() {
  return import('../env');
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  setAllRequiredVars();
});

// ---------------------------------------------------------------------------
// Tests — happy path
// ---------------------------------------------------------------------------

describe('env (all required vars present)', () => {
  it('getKeycloakClientId() returns the value', async () => {
    const env = await importEnv();
    expect(env.getKeycloakClientId()).toBe('test-client-id');
  });

  it('getKeycloakClientSecret() returns the value', async () => {
    const env = await importEnv();
    expect(env.getKeycloakClientSecret()).toBe('test-client-secret');
  });

  it('getKeycloakUrl() returns the value', async () => {
    const env = await importEnv();
    expect(env.getKeycloakUrl()).toBe('http://localhost:8080');
  });

  it('getKeycloakRealm() returns the value', async () => {
    const env = await importEnv();
    expect(env.getKeycloakRealm()).toBe('vastu');
  });

  it('getKeycloakIssuer() derives from URL and realm', async () => {
    const env = await importEnv();
    expect(env.getKeycloakIssuer()).toBe('http://localhost:8080/realms/vastu');
  });

  it('defaults NEXTAUTH_URL to http://localhost:3000 when not set', async () => {
    unsetVar('NEXTAUTH_URL');
    const env = await importEnv();
    expect(env.NEXTAUTH_URL).toBe('http://localhost:3000');
  });

  it('uses NEXTAUTH_URL from env when provided', async () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://app.vastu.dev');
    const env = await importEnv();
    expect(env.NEXTAUTH_URL).toBe('https://app.vastu.dev');
  });

  it('defaults REDIS_URL to redis://localhost:6379 when not set', async () => {
    unsetVar('REDIS_URL');
    const env = await importEnv();
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('uses REDIS_URL from env when provided', async () => {
    vi.stubEnv('REDIS_URL', 'redis://redis-host:6380');
    const env = await importEnv();
    expect(env.REDIS_URL).toBe('redis://redis-host:6380');
  });
});

// ---------------------------------------------------------------------------
// Tests — missing required variables
// ---------------------------------------------------------------------------

describe('env (missing required vars)', () => {
  it('throws when KEYCLOAK_CLIENT_ID is missing', async () => {
    unsetVar('KEYCLOAK_CLIENT_ID');
    const env = await importEnv();
    expect(() => env.getKeycloakClientId()).toThrow('KEYCLOAK_CLIENT_ID');
  });

  it('throws when KEYCLOAK_CLIENT_SECRET is missing', async () => {
    unsetVar('KEYCLOAK_CLIENT_SECRET');
    const env = await importEnv();
    expect(() => env.getKeycloakClientSecret()).toThrow('KEYCLOAK_CLIENT_SECRET');
  });

  it('throws when KEYCLOAK_URL is missing', async () => {
    unsetVar('KEYCLOAK_URL');
    const env = await importEnv();
    expect(() => env.getKeycloakUrl()).toThrow('KEYCLOAK_URL');
  });

  it('throws when KEYCLOAK_REALM is missing', async () => {
    unsetVar('KEYCLOAK_REALM');
    const env = await importEnv();
    expect(() => env.getKeycloakRealm()).toThrow('KEYCLOAK_REALM');
  });

  it('includes guidance text in the error message', async () => {
    unsetVar('KEYCLOAK_CLIENT_ID');
    const env = await importEnv();
    expect(() => env.getKeycloakClientId()).toThrow('.env file or deployment configuration');
  });
});

/**
 * Unit tests for the env validation utility.
 *
 * Because env.ts validates at module initialization time, each test that
 * expects a missing-variable error must dynamically import the module after
 * manipulating process.env, then reset the module registry via
 * vi.resetModules() so the next test gets a fresh module evaluation.
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
  // vi.stubEnv cannot set undefined, so we delete directly.
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- intentional for test teardown
  delete process.env[name];
}

async function importEnv() {
  // Fresh module evaluation after vi.resetModules().
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
  it('exports KEYCLOAK_CLIENT_ID', async () => {
    const env = await importEnv();
    expect(env.KEYCLOAK_CLIENT_ID).toBe('test-client-id');
  });

  it('exports KEYCLOAK_CLIENT_SECRET', async () => {
    const env = await importEnv();
    expect(env.KEYCLOAK_CLIENT_SECRET).toBe('test-client-secret');
  });

  it('exports KEYCLOAK_URL', async () => {
    const env = await importEnv();
    expect(env.KEYCLOAK_URL).toBe('http://localhost:8080');
  });

  it('exports KEYCLOAK_REALM', async () => {
    const env = await importEnv();
    expect(env.KEYCLOAK_REALM).toBe('vastu');
  });

  it('derives KEYCLOAK_ISSUER from URL and realm', async () => {
    const env = await importEnv();
    expect(env.KEYCLOAK_ISSUER).toBe('http://localhost:8080/realms/vastu');
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
  it('throws a descriptive error when KEYCLOAK_CLIENT_ID is missing', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    setAllRequiredVars();
    unsetVar('KEYCLOAK_CLIENT_ID');

    await expect(importEnv()).rejects.toThrow('KEYCLOAK_CLIENT_ID');
  });

  it('throws a descriptive error when KEYCLOAK_CLIENT_SECRET is missing', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    setAllRequiredVars();
    unsetVar('KEYCLOAK_CLIENT_SECRET');

    await expect(importEnv()).rejects.toThrow('KEYCLOAK_CLIENT_SECRET');
  });

  it('throws a descriptive error when KEYCLOAK_URL is missing', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    setAllRequiredVars();
    unsetVar('KEYCLOAK_URL');

    await expect(importEnv()).rejects.toThrow('KEYCLOAK_URL');
  });

  it('throws a descriptive error when KEYCLOAK_REALM is missing', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    setAllRequiredVars();
    unsetVar('KEYCLOAK_REALM');

    await expect(importEnv()).rejects.toThrow('KEYCLOAK_REALM');
  });

  it('includes guidance text in the error message', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    setAllRequiredVars();
    unsetVar('KEYCLOAK_CLIENT_ID');

    await expect(importEnv()).rejects.toThrow('.env file or deployment configuration');
  });
});

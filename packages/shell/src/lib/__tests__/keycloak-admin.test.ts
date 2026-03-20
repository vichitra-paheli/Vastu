/**
 * Unit tests for packages/shell/src/lib/keycloak-admin.ts
 *
 * All HTTP calls are mocked via vi.stubGlobal('fetch', ...) so no network
 * access is required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

const ENV = {
  KEYCLOAK_URL: 'http://localhost:8080',
  KEYCLOAK_REALM: 'vastu',
  KEYCLOAK_CLIENT_ID: 'vastu-app',
  KEYCLOAK_CLIENT_SECRET: 'dev-secret',
};

function setEnv() {
  process.env.KEYCLOAK_URL = ENV.KEYCLOAK_URL;
  process.env.KEYCLOAK_REALM = ENV.KEYCLOAK_REALM;
  process.env.KEYCLOAK_CLIENT_ID = ENV.KEYCLOAK_CLIENT_ID;
  process.env.KEYCLOAK_CLIENT_SECRET = ENV.KEYCLOAK_CLIENT_SECRET;
}

function clearEnv() {
  delete process.env.KEYCLOAK_URL;
  delete process.env.KEYCLOAK_REALM;
  delete process.env.KEYCLOAK_CLIENT_ID;
  delete process.env.KEYCLOAK_CLIENT_SECRET;
}

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetch(...responses: Response[]) {
  let callIndex = 0;
  vi.stubGlobal('fetch', vi.fn(() => {
    const response = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve(response);
  }));
}

function tokenResponse(token = 'test-access-token'): Response {
  return new Response(JSON.stringify({ access_token: token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createUserResponse(keycloakUserId = 'kc-new-user-uuid'): Response {
  return new Response(null, {
    status: 201,
    headers: {
      Location: `http://localhost:8080/admin/realms/vastu/users/${keycloakUserId}`,
    },
  });
}

function conflictResponse(): Response {
  return new Response('User exists with same username', { status: 409 });
}

function serverErrorResponse(): Response {
  return new Response('Internal Server Error', { status: 500 });
}

function deleteOkResponse(): Response {
  return new Response(null, { status: 204 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createKeycloakUser', () => {
  beforeEach(setEnv);
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    clearEnv();
  });

  it('returns the Keycloak user ID from the Location header on success', async () => {
    mockFetch(tokenResponse(), createUserResponse('new-kc-id'));
    const { createKeycloakUser } = await import('../keycloak-admin');
    const id = await createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'pass1234' });
    expect(id).toBe('new-kc-id');
  });

  it('sends the email as both username and email in the request body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(createUserResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { createKeycloakUser } = await import('../keycloak-admin');
    await createKeycloakUser({ email: 'bob@acme.com', name: 'Bob Builder', password: 'pass1234' });

    const createCall = fetchMock.mock.calls[1] as [string, RequestInit];
    const sentBody = JSON.parse(createCall[1].body as string) as {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
    };

    expect(sentBody.username).toBe('bob@acme.com');
    expect(sentBody.email).toBe('bob@acme.com');
    expect(sentBody.firstName).toBe('Bob');
    expect(sentBody.lastName).toBe('Builder');
  });

  it('sends a password credential in the request body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(createUserResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { createKeycloakUser } = await import('../keycloak-admin');
    await createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'MySuperPass!' });

    const createCall = fetchMock.mock.calls[1] as [string, RequestInit];
    const sentBody = JSON.parse(createCall[1].body as string) as {
      credentials: Array<{ type: string; value: string; temporary: boolean }>;
    };

    expect(sentBody.credentials).toHaveLength(1);
    expect(sentBody.credentials[0].type).toBe('password');
    expect(sentBody.credentials[0].value).toBe('MySuperPass!');
    expect(sentBody.credentials[0].temporary).toBe(false);
  });

  it('uses the Bearer token obtained from the token endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tokenResponse('my-special-token'))
      .mockResolvedValueOnce(createUserResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { createKeycloakUser } = await import('../keycloak-admin');
    await createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'pass1234' });

    const createCall = fetchMock.mock.calls[1] as [string, RequestInit];
    const headers = createCall[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer my-special-token');
  });

  it('throws KeycloakAdminError with status 409 when the user already exists', async () => {
    mockFetch(tokenResponse(), conflictResponse());
    const { createKeycloakUser, KeycloakAdminError } = await import('../keycloak-admin');

    let thrownError: unknown;
    try {
      await createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'pass1234' });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(KeycloakAdminError);
    expect((thrownError as InstanceType<typeof KeycloakAdminError>).status).toBe(409);
  });

  it('throws KeycloakAdminError when Keycloak returns a server error', async () => {
    mockFetch(tokenResponse(), serverErrorResponse());
    const { createKeycloakUser, KeycloakAdminError } = await import('../keycloak-admin');

    await expect(
      createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'pass1234' }),
    ).rejects.toBeInstanceOf(KeycloakAdminError);
  });

  it('throws KeycloakAdminError when the token request fails', async () => {
    mockFetch(new Response('Unauthorized', { status: 401 }));
    const { createKeycloakUser, KeycloakAdminError } = await import('../keycloak-admin');

    await expect(
      createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'pass1234' }),
    ).rejects.toBeInstanceOf(KeycloakAdminError);
  });

  it('throws KeycloakAdminError when environment variables are missing', async () => {
    clearEnv();
    const { createKeycloakUser, KeycloakAdminError } = await import('../keycloak-admin');

    await expect(
      createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'pass1234' }),
    ).rejects.toBeInstanceOf(KeycloakAdminError);
  });

  it('throws KeycloakAdminError when Location header is absent from the response', async () => {
    mockFetch(
      tokenResponse(),
      new Response(null, { status: 201 }), // No Location header
    );
    const { createKeycloakUser, KeycloakAdminError } = await import('../keycloak-admin');

    await expect(
      createKeycloakUser({ email: 'alice@acme.com', name: 'Alice', password: 'pass1234' }),
    ).rejects.toBeInstanceOf(KeycloakAdminError);
  });
});

describe('deleteKeycloakUser', () => {
  beforeEach(setEnv);
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    clearEnv();
  });

  it('calls the DELETE endpoint with the correct user ID', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(deleteOkResponse());
    vi.stubGlobal('fetch', fetchMock);

    const { deleteKeycloakUser } = await import('../keycloak-admin');
    await deleteKeycloakUser('kc-user-to-delete');

    const deleteCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(deleteCall[0]).toContain('/users/kc-user-to-delete');
    expect(deleteCall[1].method).toBe('DELETE');
  });

  it('does not throw when the delete returns 404 (user already gone)', async () => {
    mockFetch(tokenResponse(), new Response(null, { status: 404 }));
    const { deleteKeycloakUser } = await import('../keycloak-admin');

    await expect(deleteKeycloakUser('missing-user')).resolves.toBeUndefined();
  });

  it('does not throw when the delete fails — errors are logged, not re-thrown', async () => {
    mockFetch(tokenResponse(), serverErrorResponse());
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { deleteKeycloakUser } = await import('../keycloak-admin');
    await expect(deleteKeycloakUser('kc-user-id')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('does not throw when obtaining the admin token fails — errors are logged', async () => {
    mockFetch(new Response('Unauthorized', { status: 401 }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { deleteKeycloakUser } = await import('../keycloak-admin');
    await expect(deleteKeycloakUser('kc-user-id')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

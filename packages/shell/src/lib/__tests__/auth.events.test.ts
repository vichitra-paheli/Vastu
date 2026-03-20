/**
 * Unit tests for the next-auth events.signIn handler.
 *
 * Verifies that a `user.login` audit event is created when a user signs in,
 * and that auth failures are handled gracefully (fire-and-forget).
 *
 * Strategy: vi.mock() is hoisted by Vitest before any imports. A `beforeAll`
 * block dynamically imports `../auth` so that the mocked NextAuth() constructor
 * is called and the captured config (including `events.signIn`) is available.
 *
 * Mock variables referenced inside vi.mock() factory functions must not be
 * outer `const` declarations (which would be in the temporal dead zone when
 * the hoisted factory runs). Instead, we use vi.fn() directly inside the
 * factory and retrieve handles via vi.mocked() after the fact.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vastu/shared/utils', () => ({
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@vastu/shared/permissions', () => ({
  defineAbilitiesFor: vi.fn(() => ({ rules: [] })),
}));

// Capture the NextAuth config so we can exercise events.signIn directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic capture of opaque AuthConfig type
let capturedConfig: any;

vi.mock('next-auth', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic config capture in test mock
  default: vi.fn((config: any) => {
    capturedConfig = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  }),
}));

vi.mock('next-auth/providers/keycloak', () => ({
  default: vi.fn(() => ({ id: 'keycloak', name: 'Keycloak' })),
}));

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({})),
}));

// auth.ts reads Keycloak env vars directly from process.env (lazy, build-safe).
// Stub them so the provider config is populated in the test environment.
vi.stubEnv('KEYCLOAK_CLIENT_ID', 'test-client-id');
vi.stubEnv('KEYCLOAK_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('KEYCLOAK_URL', 'http://localhost:8080');
vi.stubEnv('KEYCLOAK_REALM', 'vastu');

// ---------------------------------------------------------------------------
// Load the auth module (triggers the mocked NextAuth() call).
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await import('../auth');
});

// ---------------------------------------------------------------------------
// Typed helpers to access the mocked internals after module load.
// ---------------------------------------------------------------------------

async function mockUtils() {
  const utils = await import('@vastu/shared/utils');
  return {
    createAuditEvent: vi.mocked(utils.createAuditEvent),
  };
}

async function mockPrisma() {
  const { prisma } = await import('@vastu/shared/prisma');
  return {
    userFindUnique: vi.mocked(prisma.user.findUnique),
  };
}

function makeUser(overrides?: { id?: string; email?: string | null }) {
  return { id: 'user-uuid', email: 'alice@vastu.dev', name: 'Alice', emailVerified: null, ...overrides };
}

async function getSignInHandler() {
  const handler = capturedConfig?.events?.signIn as
    | ((msg: { user: ReturnType<typeof makeUser>; account: null; isNewUser?: boolean }) => Promise<void>)
    | undefined;
  if (!handler) throw new Error('events.signIn was not registered in the NextAuth config');
  return handler;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth events.signIn', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { createAuditEvent } = await mockUtils();
    createAuditEvent.mockResolvedValue(undefined as never);
    const { userFindUnique } = await mockPrisma();
    userFindUnique.mockResolvedValue({ organizationId: 'org-uuid', name: 'Alice' } as never);
  });

  it('creates a user.login audit event when a known user signs in', async () => {
    const handler = await getSignInHandler();
    await handler({ user: makeUser(), account: null, isNewUser: false });
    // Allow fire-and-forget .catch() to settle.
    await new Promise((r) => setTimeout(r, 0));

    const { createAuditEvent } = await mockUtils();
    expect(createAuditEvent).toHaveBeenCalledOnce();
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.login',
        userId: 'user-uuid',
        userName: 'Alice',
        resourceType: 'User',
        resourceId: 'user-uuid',
        organizationId: 'org-uuid',
        payload: { isNewUser: false },
      }),
    );
  });

  it('records isNewUser: true in the payload for first-time sign-ins', async () => {
    const handler = await getSignInHandler();
    await handler({ user: makeUser(), account: null, isNewUser: true });
    await new Promise((r) => setTimeout(r, 0));

    const { createAuditEvent } = await mockUtils();
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { isNewUser: true } }),
    );
  });

  it('defaults isNewUser to false when the flag is undefined', async () => {
    const handler = await getSignInHandler();
    await handler({ user: makeUser(), account: null, isNewUser: undefined });
    await new Promise((r) => setTimeout(r, 0));

    const { createAuditEvent } = await mockUtils();
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { isNewUser: false } }),
    );
  });

  it('includes the user email in resourceDescription', async () => {
    const handler = await getSignInHandler();
    await handler({ user: makeUser({ email: 'bob@vastu.dev' }), account: null, isNewUser: false });
    await new Promise((r) => setTimeout(r, 0));

    const { createAuditEvent } = await mockUtils();
    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceDescription: expect.stringContaining('bob@vastu.dev'),
      }),
    );
  });

  it('skips the audit event and warns when user.id is undefined', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const handler = await getSignInHandler();
    await handler({ user: makeUser({ id: undefined as unknown as string }), account: null, isNewUser: false });

    const { createAuditEvent } = await mockUtils();
    expect(createAuditEvent).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('audit event skipped'));
    warnSpy.mockRestore();
  });

  it('skips the audit event and warns when the user is not found in the DB', async () => {
    const { userFindUnique } = await mockPrisma();
    userFindUnique.mockResolvedValueOnce(null);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const handler = await getSignInHandler();
    await handler({ user: makeUser(), account: null, isNewUser: false });

    const { createAuditEvent } = await mockUtils();
    expect(createAuditEvent).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('audit event skipped'));
    warnSpy.mockRestore();
  });

  it('logs an error but does not reject when createAuditEvent fails', async () => {
    const { createAuditEvent } = await mockUtils();
    createAuditEvent.mockRejectedValueOnce(new Error('DB connection lost'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const handler = await getSignInHandler();
    // Must not throw — audit failures must never block sign-in.
    await expect(handler({ user: makeUser(), account: null, isNewUser: false })).resolves.toBeUndefined();
    // Allow the fire-and-forget .catch() to run.
    await new Promise((r) => setTimeout(r, 0));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to write login audit event'),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});

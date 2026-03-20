/**
 * Unit tests for the next-auth session callback — MFA pending logic.
 *
 * US-102, AC-3: When org.mfaRequired=true and user.mfaEnabled=false,
 * the session callback sets session.user.mfaPending = true so that
 * server components can redirect to /mfa.
 *
 * Strategy: same pattern as auth.events.test.ts — capture the NextAuth
 * config via a vi.mock() interceptor, then exercise the callbacks directly.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vastu/shared/utils', () => ({
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@vastu/shared/permissions', () => ({
  defineAbilitiesFor: vi.fn(() => ({ rules: [] })),
}));

// Capture the NextAuth config so we can exercise callbacks.session directly.
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

// Prisma mock — controls what the session callback sees when it loads the user.
const mockFindUnique = vi.fn();

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

// Stub Keycloak env vars so the provider is configured.
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
// Helpers
// ---------------------------------------------------------------------------

function buildDbUser(overrides: {
  mfaEnabled?: boolean;
  orgMfaRequired?: boolean;
} = {}) {
  const { mfaEnabled = false, orgMfaRequired = false } = overrides;
  return {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    mfaEnabled,
    userRoles: [],
    organization: {
      id: 'org-uuid',
      mfaRequired: orgMfaRequired,
    },
  };
}

function buildSession() {
  return {
    user: {
      id: '',
      name: 'Alice',
      email: 'alice@vastu.dev',
      roles: [] as unknown[],
      organizationId: '',
      tenantId: null,
      permissions: [] as unknown[],
      mfaPending: undefined as boolean | undefined,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

function buildNextAuthUser() {
  return { id: 'user-uuid' };
}

type SessionCallback = (args: {
  session: ReturnType<typeof buildSession>;
  user: ReturnType<typeof buildNextAuthUser>;
}) => Promise<ReturnType<typeof buildSession>>;

async function getSessionCallback(): Promise<SessionCallback> {
  const handler = capturedConfig?.callbacks?.session as SessionCallback | undefined;
  if (!handler) throw new Error('callbacks.session was not registered in the NextAuth config');
  return handler;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auth callbacks.session — mfaPending (US-102)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT set mfaPending when org.mfaRequired is false', async () => {
    mockFindUnique.mockResolvedValueOnce(buildDbUser({ mfaEnabled: false, orgMfaRequired: false }));

    const callback = await getSessionCallback();
    const session = await callback({ session: buildSession(), user: buildNextAuthUser() });

    expect(session.user.mfaPending).toBeUndefined();
  });

  it('does NOT set mfaPending when org.mfaRequired is true AND user has MFA enabled', async () => {
    mockFindUnique.mockResolvedValueOnce(buildDbUser({ mfaEnabled: true, orgMfaRequired: true }));

    const callback = await getSessionCallback();
    const session = await callback({ session: buildSession(), user: buildNextAuthUser() });

    expect(session.user.mfaPending).toBeUndefined();
  });

  it('sets mfaPending=true when org.mfaRequired is true AND user has NO MFA configured', async () => {
    mockFindUnique.mockResolvedValueOnce(buildDbUser({ mfaEnabled: false, orgMfaRequired: true }));

    const callback = await getSessionCallback();
    const session = await callback({ session: buildSession(), user: buildNextAuthUser() });

    expect(session.user.mfaPending).toBe(true);
  });

  it('does NOT set mfaPending when org.mfaRequired is false even with mfaEnabled=false', async () => {
    mockFindUnique.mockResolvedValueOnce(buildDbUser({ mfaEnabled: false, orgMfaRequired: false }));

    const callback = await getSessionCallback();
    const session = await callback({ session: buildSession(), user: buildNextAuthUser() });

    expect(session.user.mfaPending).toBeUndefined();
  });

  it('returns the session unchanged when dbUser is null', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const callback = await getSessionCallback();
    const session = await callback({ session: buildSession(), user: buildNextAuthUser() });

    // No mfaPending should be set for missing users
    expect(session.user.mfaPending).toBeUndefined();
  });

  it('ssoRequired on organization is independent of mfaPending — not set from sso logic', async () => {
    // A user in an org with ssoRequired=true but mfaRequired=false should NOT get mfaPending
    mockFindUnique.mockResolvedValueOnce({
      ...buildDbUser({ mfaEnabled: false, orgMfaRequired: false }),
      organization: {
        id: 'org-uuid',
        mfaRequired: false,
        ssoRequired: true,
      },
    });

    const callback = await getSessionCallback();
    const session = await callback({ session: buildSession(), user: buildNextAuthUser() });

    expect(session.user.mfaPending).toBeUndefined();
  });
});

/**
 * Unit tests for session helpers.
 *
 * `auth()` is mocked so these tests don't require a live database or Keycloak.
 * The CASL createMongoAbility call is also tested to verify rules are passed through.
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import type { Session } from 'next-auth';
import type { RawRuleOf, MongoAbility } from '@casl/ability';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@casl/ability', () => ({
  createMongoAbility: vi.fn((rules: unknown) => ({ rules, can: vi.fn(() => true) })),
}));

// Re-apply the createMongoAbility implementation after each reset since
// vi.resetAllMocks() clears vi.fn() implementations.
async function restoreMongoAbilityMock() {
  const { createMongoAbility } = await import('@casl/ability');
  vi.mocked(createMongoAbility).mockImplementation(
    (rules: unknown) => ({ rules, can: vi.fn(() => true) }) as unknown as ReturnType<typeof createMongoAbility>,
  );
}

import { auth } from '../auth';
import { getSession, getSessionWithAbility, requireSession, requireSessionWithAbility } from '../session';

// `auth` is overloaded in next-auth v5, so we cast it to a simple async mock to
// avoid TypeScript overload-resolution errors in tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- overload cast for test mock
const authMock = vi.mocked(auth) as unknown as MockInstance<() => Promise<Session | null>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockSession(overrides?: Partial<Session['user']>): Session {
  const permissions: RawRuleOf<MongoAbility>[] = [{ action: 'manage', subject: 'all' }];
  return {
    user: {
      id: 'user-id',
      email: 'admin@vastu.dev',
      name: 'Admin User',
      roles: [{ name: 'admin', isSystem: true, permissions: [] }],
      organizationId: 'org-id',
      tenantId: 'tenant-id',
      permissions,
      ...overrides,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as unknown as Session;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getSession()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the session when the user is authenticated', async () => {
    const mockSession = buildMockSession();
    authMock.mockResolvedValueOnce(mockSession);

    const result = await getSession();

    expect(result).toBe(mockSession);
  });

  it('returns null when auth() returns null', async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await getSession();

    expect(result).toBeNull();
  });

  it('returns null when auth() returns a session without a user', async () => {
    authMock.mockResolvedValueOnce({ expires: '2099-01-01' } as unknown as Session);

    const result = await getSession();

    expect(result).toBeNull();
  });
});

describe('getSessionWithAbility()', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await restoreMongoAbilityMock();
  });

  it('returns session and ability when authenticated', async () => {
    const mockSession = buildMockSession();
    authMock.mockResolvedValueOnce(mockSession);

    const { session, ability } = await getSessionWithAbility();

    expect(session).toBe(mockSession);
    expect(ability).not.toBeNull();
  });

  it('passes the serialised CASL rules to createMongoAbility', async () => {
    const { createMongoAbility } = await import('@casl/ability');
    const mockSession = buildMockSession();
    authMock.mockResolvedValueOnce(mockSession);

    await getSessionWithAbility();

    expect(createMongoAbility).toHaveBeenCalledWith(mockSession.user.permissions);
  });

  it('returns { session: null, ability: null } when not authenticated', async () => {
    authMock.mockResolvedValueOnce(null);

    const { session, ability } = await getSessionWithAbility();

    expect(session).toBeNull();
    expect(ability).toBeNull();
  });
});

describe('requireSession()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the session when authenticated', async () => {
    const mockSession = buildMockSession();
    authMock.mockResolvedValueOnce(mockSession);

    const result = await requireSession();

    expect(result).toBe(mockSession);
  });

  it('throws Unauthorized when the user is not authenticated', async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(requireSession()).rejects.toThrow('Unauthorized');
  });
});

describe('requireSessionWithAbility()', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await restoreMongoAbilityMock();
  });

  it('returns session and ability when authenticated', async () => {
    const mockSession = buildMockSession();
    authMock.mockResolvedValueOnce(mockSession);

    const { session, ability } = await requireSessionWithAbility();

    expect(session).toBe(mockSession);
    expect(ability).not.toBeNull();
  });

  it('throws Unauthorized when the user is not authenticated', async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(requireSessionWithAbility()).rejects.toThrow('Unauthorized');
  });
});

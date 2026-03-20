/**
 * Unit tests for GET /api/admin/users and POST /api/admin/users (invite)
 *
 * Prisma and session helpers are mocked — no live DB required.
 *
 * Covers:
 * - GET: returns 200 with user list
 * - GET: returns 401 / 403
 * - POST: invite — happy path wraps all DB writes in a transaction
 * - POST: invite — skips existing org members without rolling back others
 * - POST: invite — transaction rollback returns 500
 * - POST: invite — returns 400 on invalid body / emails / unknown role
 * - POST: invite — fires audit events after transaction commits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must appear before imports of the modules under test)
// ---------------------------------------------------------------------------

const txMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  userRole: {
    create: vi.fn(),
  },
};

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@vastu/shared/utils', () => ({
  isValidEmail: vi.fn((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@vastu/shared/permissions', () => ({
  isAdmin: vi.fn(),
}));

vi.mock('@/lib/session', () => ({
  getSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, POST } from '../route';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent, isValidEmail } from '@vastu/shared/utils';
import { isAdmin } from '@vastu/shared/permissions';
import { getSessionWithAbility } from '@/lib/session';

const prismaMock = vi.mocked(prisma);
const isAdminMock = vi.mocked(isAdmin);
const sessionMock = vi.mocked(getSessionWithAbility);
const isValidEmailMock = vi.mocked(isValidEmail);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-admin-1',
      name: 'Admin User',
      organizationId: 'org-1',
      ...overrides,
    },
  };
}

function buildAbility() {
  return { can: vi.fn() };
}

function buildRole(overrides: Record<string, unknown> = {}) {
  return { id: 'role-viewer', name: 'Viewer', ...overrides };
}

function buildUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-2',
    name: 'alice',
    email: 'alice@example.com',
    avatarUrl: null,
    emailVerified: false,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    userRoles: [{ role: { id: 'role-viewer', name: 'Viewer' } }],
    ...overrides,
  };
}

function makeGetRequest(params = '') {
  return new NextRequest(`http://localhost/api/admin/users${params}`, { method: 'GET' });
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupAdminSession() {
  sessionMock.mockResolvedValueOnce({
    session: buildSession() as never,
    ability: buildAbility() as never,
  });
  isAdminMock.mockReturnValueOnce(true);
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 200 with mapped user list', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findMany).mockResolvedValueOnce([buildUserRow()] as never);

    const response = await GET(makeGetRequest());
    const body = await response.json() as { users: Array<{ email: string; roles: unknown[] }> };

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(1);
    expect(body.users[0].email).toBe('alice@example.com');
    expect(body.users[0].roles).toHaveLength(1);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockResolvedValueOnce({ session: null, ability: null });

    const response = await GET(makeGetRequest());
    expect(response.status).toBe(401);
  });

  it('returns 403 when session user is not an admin', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(false);

    const response = await GET(makeGetRequest());
    expect(response.status).toBe(403);
  });

  it('returns 500 on unexpected DB error', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findMany).mockRejectedValueOnce(new Error('DB failure'));

    const response = await GET(makeGetRequest());
    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST tests — invite
// ---------------------------------------------------------------------------

describe('POST /api/admin/users — invite', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
    // Restore isValidEmail implementation after resetAllMocks clears it.
    isValidEmailMock.mockImplementation((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  });

  it('wraps all DB writes inside prisma.$transaction and returns 201', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce(buildRole() as never);

    // Simulate transaction: callback receives txMock, returns invitedCount
    txMock.user.findUnique.mockResolvedValueOnce(null); // email not existing
    txMock.user.create.mockResolvedValueOnce({ id: 'new-user-1', email: 'bob@example.com' });
    txMock.userRole.create.mockResolvedValueOnce({});

    vi.mocked(prismaMock.$transaction).mockImplementationOnce((async (cb: (tx: typeof txMock) => Promise<number>) => {
      return cb(txMock);
    }) as never);

    const response = await POST(makePostRequest({ emails: ['bob@example.com'], roleId: 'role-viewer' }));
    const body = await response.json() as { success: boolean; invitedCount: number };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.invitedCount).toBe(1);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    // Operations must have gone through the transaction client, not prisma directly
    expect(txMock.user.create).toHaveBeenCalledOnce();
    expect(txMock.userRole.create).toHaveBeenCalledOnce();
  });

  it('skips existing org members inside the transaction without affecting the count', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce(buildRole() as never);

    // First email already exists in the same org; second is new
    txMock.user.findUnique
      .mockResolvedValueOnce({ id: 'existing-user', organizationId: 'org-1' })
      .mockResolvedValueOnce(null);
    txMock.user.create.mockResolvedValueOnce({ id: 'new-user-2', email: 'charlie@example.com' });
    txMock.userRole.create.mockResolvedValueOnce({});

    vi.mocked(prismaMock.$transaction).mockImplementationOnce((async (cb: (tx: typeof txMock) => Promise<number>) => {
      return cb(txMock);
    }) as never);

    const response = await POST(
      makePostRequest({ emails: ['alice@example.com', 'charlie@example.com'], roleId: 'role-viewer' }),
    );
    const body = await response.json() as { invitedCount: number };

    expect(response.status).toBe(201);
    expect(body.invitedCount).toBe(1);
    expect(txMock.user.create).toHaveBeenCalledOnce();
  });

  it('returns 500 and does not write audit events when the transaction throws', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce(buildRole() as never);
    vi.mocked(prismaMock.$transaction).mockRejectedValueOnce(new Error('transaction failure'));

    const response = await POST(makePostRequest({ emails: ['dave@example.com'], roleId: 'role-viewer' }));

    expect(response.status).toBe(500);
    expect(vi.mocked(createAuditEvent)).not.toHaveBeenCalled();
  });

  it('fires audit events after the transaction commits (one per invited user)', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce(buildRole() as never);

    txMock.user.findUnique.mockResolvedValueOnce(null);
    txMock.user.create.mockResolvedValueOnce({ id: 'new-user-3', email: 'eve@example.com' });
    txMock.userRole.create.mockResolvedValueOnce({});

    vi.mocked(prismaMock.$transaction).mockImplementationOnce((async (cb: (tx: typeof txMock) => Promise<number>) => {
      return cb(txMock);
    }) as never);

    await POST(makePostRequest({ emails: ['eve@example.com'], roleId: 'role-viewer' }));

    await vi.waitFor(() => {
      expect(createAuditEvent).toHaveBeenCalledOnce();
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resourceType: 'User',
          resourceId: 'new-user-3',
        }),
      );
    });
  });

  it('returns 400 when no emails provided', async () => {
    setupAdminSession();

    const response = await POST(makePostRequest({ emails: [], roleId: 'role-viewer' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when an email address is invalid', async () => {
    setupAdminSession();

    const response = await POST(makePostRequest({ emails: ['not-an-email'], roleId: 'role-viewer' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when the role is not found in the org', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce(null);

    const response = await POST(makePostRequest({ emails: ['frank@example.com'], roleId: 'role-unknown' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 when request body is invalid JSON shape', async () => {
    setupAdminSession();

    const response = await POST(makePostRequest({ roleId: 'role-viewer' })); // missing emails
    expect(response.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockResolvedValueOnce({ session: null, ability: null });

    const response = await POST(makePostRequest({ emails: ['g@example.com'], roleId: 'role-viewer' }));
    expect(response.status).toBe(401);
  });

  it('returns 403 when session user is not an admin', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(false);

    const response = await POST(makePostRequest({ emails: ['h@example.com'], roleId: 'role-viewer' }));
    expect(response.status).toBe(403);
  });
});

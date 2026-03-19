/**
 * Unit tests for PATCH /api/admin/users/[id] and DELETE /api/admin/users/[id]
 *
 * Prisma and session helpers are mocked — no live DB required.
 *
 * Covers:
 * - PATCH: updates user name — 200
 * - PATCH: role update wraps deleteMany + create in prisma.$transaction
 * - PATCH: role update transaction rollback returns 500
 * - PATCH: returns 400 when new role not found
 * - PATCH: deactivation — last-admin guard
 * - PATCH: returns 401 / 403 / 404
 * - DELETE: soft-deletes user — 200
 * - DELETE: returns 400 when trying to delete own account
 * - DELETE: returns 401 / 403 / 404
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
    },
    userRole: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@vastu/shared/utils', () => ({
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

import { PATCH, DELETE } from '../route';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { isAdmin } from '@vastu/shared/permissions';
import { getSessionWithAbility } from '@/lib/session';

const prismaMock = vi.mocked(prisma);
const isAdminMock = vi.mocked(isAdmin);
const sessionMock = vi.mocked(getSessionWithAbility);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'admin-user-1',
      name: 'Admin User',
      organizationId: 'org-1',
      ...overrides,
    },
  };
}

function buildAbility() {
  return { can: vi.fn() };
}

function buildExistingUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'target-user-1',
    name: 'Alice',
    email: 'alice@example.com',
    avatarUrl: null,
    emailVerified: true,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    userRoles: [{ role: { id: 'role-viewer', name: 'Viewer' } }],
    ...overrides,
  };
}

function buildFinalUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'target-user-1',
    name: 'Alice',
    email: 'alice@example.com',
    avatarUrl: null,
    emailVerified: true,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    userRoles: [],
    ...overrides,
  };
}

function makePatchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost/api/admin/users/${id}`, { method: 'DELETE' });
}

function setupAdminSession(userId = 'admin-user-1') {
  sessionMock.mockResolvedValueOnce({
    session: buildSession({ id: userId }) as never,
    ability: buildAbility() as never,
  });
  isAdminMock.mockReturnValueOnce(true);
}

const TARGET_ID = 'target-user-1';
const PARAMS = { params: { id: TARGET_ID } };

// ---------------------------------------------------------------------------
// PATCH tests
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('updates name and returns 200 with the updated user', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce(buildExistingUser({ name: 'Alicia' }) as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(buildFinalUser({ name: 'Alicia' }) as never);

    const response = await PATCH(makePatchRequest(TARGET_ID, { name: 'Alicia' }), PARAMS);
    const body = await response.json() as { success: boolean; user: { name: string } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.name).toBe('Alicia');
  });

  it('wraps role deleteMany + create inside prisma.$transaction when roleId is provided', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce({ id: 'role-admin', name: 'Admin' } as never);
    // Batch transaction (array form) — just resolve
    vi.mocked(prismaMock.$transaction).mockResolvedValueOnce([{ count: 1 }, {}] as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(buildFinalUser() as never);

    const response = await PATCH(makePatchRequest(TARGET_ID, { roleId: 'role-admin' }), PARAMS);

    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    // The transaction should receive an array (batch form)
    const txArg = vi.mocked(prismaMock.$transaction).mock.calls[0][0];
    expect(Array.isArray(txArg)).toBe(true);
  });

  it('returns 500 when the role update transaction throws', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce({ id: 'role-admin', name: 'Admin' } as never);
    vi.mocked(prismaMock.$transaction).mockRejectedValueOnce(new Error('transaction failed'));

    const response = await PATCH(makePatchRequest(TARGET_ID, { roleId: 'role-admin' }), PARAMS);

    expect(response.status).toBe(500);
  });

  it('does not call $transaction when only name is updated (no roleId)', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce(buildExistingUser({ name: 'Bob' }) as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(buildFinalUser({ name: 'Bob' }) as never);

    await PATCH(makePatchRequest(TARGET_ID, { name: 'Bob' }), PARAMS);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 when the new role is not found in the org', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.role.findFirst).mockResolvedValueOnce(null);

    const response = await PATCH(makePatchRequest(TARGET_ID, { roleId: 'role-nonexistent' }), PARAMS);

    expect(response.status).toBe(400);
  });

  it('returns 400 when deactivating the last admin user', async () => {
    setupAdminSession();
    const adminUser = buildExistingUser({
      userRoles: [{ role: { id: 'role-admin', name: 'Admin' } }],
    });
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(adminUser as never);
    vi.mocked(prismaMock.user.count).mockResolvedValueOnce(1 as never);

    const response = await PATCH(makePatchRequest(TARGET_ID, { deactivated: true }), PARAMS);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Cannot deactivate the last admin user.');
  });

  it('returns 404 when the target user is not found', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(null);

    const response = await PATCH(makePatchRequest('nonexistent-id', { name: 'X' }), {
      params: { id: 'nonexistent-id' },
    });
    expect(response.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockResolvedValueOnce({ session: null, ability: null });

    const response = await PATCH(makePatchRequest(TARGET_ID, { name: 'Y' }), PARAMS);
    expect(response.status).toBe(401);
  });

  it('returns 403 when session user is not an admin', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(false);

    const response = await PATCH(makePatchRequest(TARGET_ID, { name: 'Z' }), PARAMS);
    expect(response.status).toBe(403);
  });

  it('writes an audit event after a successful update', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce(buildExistingUser({ name: 'Updated' }) as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(buildFinalUser({ name: 'Updated' }) as never);

    await PATCH(makePatchRequest(TARGET_ID, { name: 'Updated' }), PARAMS);

    await vi.waitFor(() => {
      expect(createAuditEvent).toHaveBeenCalledOnce();
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', resourceType: 'User' }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('soft-deletes a user and returns 200', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(
      buildExistingUser({ id: TARGET_ID }) as never,
    );
    vi.mocked(prismaMock.user.update).mockResolvedValueOnce(
      buildExistingUser({ deletedAt: new Date() }) as never,
    );

    const response = await DELETE(makeDeleteRequest(TARGET_ID), PARAMS);
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
  });

  it('returns 400 when admin tries to remove their own account', async () => {
    setupAdminSession('admin-user-1');

    const response = await DELETE(makeDeleteRequest('admin-user-1'), { params: { id: 'admin-user-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Cannot remove your own account.');
  });

  it('returns 404 when the target user is not found', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(null);

    const response = await DELETE(makeDeleteRequest('ghost-id'), { params: { id: 'ghost-id' } });
    expect(response.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockResolvedValueOnce({ session: null, ability: null });

    const response = await DELETE(makeDeleteRequest(TARGET_ID), PARAMS);
    expect(response.status).toBe(401);
  });

  it('returns 403 when session user is not an admin', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(false);

    const response = await DELETE(makeDeleteRequest(TARGET_ID), PARAMS);
    expect(response.status).toBe(403);
  });

  it('returns 500 on unexpected DB error during soft-delete', async () => {
    setupAdminSession();
    vi.mocked(prismaMock.user.findFirst).mockResolvedValueOnce(buildExistingUser() as never);
    vi.mocked(prismaMock.user.update).mockRejectedValueOnce(new Error('DB crash'));

    const response = await DELETE(makeDeleteRequest(TARGET_ID), PARAMS);
    expect(response.status).toBe(500);
  });
});

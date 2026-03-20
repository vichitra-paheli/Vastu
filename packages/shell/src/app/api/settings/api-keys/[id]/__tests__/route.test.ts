/**
 * Unit tests for DELETE /api/settings/api-keys/[id]
 *
 * Prisma and the session helper are mocked so tests don't require a live DB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    apiKey: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@vastu/shared/utils', () => ({
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { DELETE } from '../route';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';

const prismaMock = vi.mocked(prisma);
const sessionMock = vi.mocked(requireSessionWithAbility);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAbility(canResult: boolean = true) {
  return { can: vi.fn(() => canResult) };
}

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-1',
      name: 'Admin User',
      organizationId: 'org-1',
      tenantId: 'tenant-1',
      ...overrides,
    },
  };
}

function makeDeleteRequest(id: string = 'key-1'): NextRequest {
  return new NextRequest(`http://localhost/api/settings/api-keys/${id}`, {
    method: 'DELETE',
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'test-agent',
    },
  });
}

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------

describe('DELETE /api/settings/api-keys/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('returns 200 with success:true when key is revoked', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce({
      id: 'key-1',
      name: 'My API Key',
    } as never);
    vi.mocked(prismaMock.apiKey.update).mockResolvedValueOnce({} as never);

    const response = await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('soft-deletes the key by setting deletedAt', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce({
      id: 'key-1',
      name: 'My API Key',
    } as never);
    vi.mocked(prismaMock.apiKey.update).mockResolvedValueOnce({} as never);

    await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });

    expect(prismaMock.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) as Date }),
      }),
    );
  });

  it('scopes the lookup to the user organization', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce({
      id: 'key-1',
      name: 'My API Key',
    } as never);
    vi.mocked(prismaMock.apiKey.update).mockResolvedValueOnce({} as never);

    await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });

    expect(prismaMock.apiKey.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key-1', organizationId: 'org-1', deletedAt: null },
      }),
    );
  });

  it('writes an audit event after successful revocation', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce({
      id: 'key-1',
      name: 'My API Key',
    } as never);
    vi.mocked(prismaMock.apiKey.update).mockResolvedValueOnce({} as never);

    await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });

    expect(createAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        resourceType: 'ApiKey',
        resourceId: 'key-1',
      }),
    );
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks delete:ApiKey permission', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(false) as never,
    });

    const response = await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('checks the correct CASL action and subject', async () => {
    const ability = buildAbility(true);
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: ability as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce({
      id: 'key-1',
      name: 'My API Key',
    } as never);
    vi.mocked(prismaMock.apiKey.update).mockResolvedValueOnce({} as never);

    await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });

    expect(ability.can).toHaveBeenCalledWith('delete', 'ApiKey');
  });

  it('returns 404 when the key does not exist in the organization', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce(null);

    const response = await DELETE(makeDeleteRequest('nonexistent'), { params: { id: 'nonexistent' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('API key not found');
  });

  it('returns 404 when the key belongs to a different organization', async () => {
    // findFirst returns null because organizationId filter excludes it
    sessionMock.mockResolvedValueOnce({
      session: buildSession({ organizationId: 'org-2' }) as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce(null);

    const response = await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('API key not found');
  });

  it('returns 500 on unexpected database error during update', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findFirst).mockResolvedValueOnce({
      id: 'key-1',
      name: 'My API Key',
    } as never);
    vi.mocked(prismaMock.apiKey.update).mockRejectedValueOnce(new Error('DB failure'));

    const response = await DELETE(makeDeleteRequest('key-1'), { params: { id: 'key-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});

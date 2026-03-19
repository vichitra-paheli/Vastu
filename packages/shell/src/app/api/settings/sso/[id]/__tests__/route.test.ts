/**
 * Unit tests for PATCH /api/settings/sso/[id] and DELETE /api/settings/sso/[id]
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
    ssoProvider: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@vastu/shared/utils', () => ({
  encrypt: vi.fn((s: string) => `enc:${s}`),
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../../../lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { PATCH, DELETE } from '../route';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '../../../../../../lib/session';

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

function buildProviderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'provider-1',
    name: 'Okta OIDC',
    type: 'OIDC' as const,
    status: 'DRAFT' as const,
    isDefault: false,
    clientId: 'client-abc',
    issuerUrl: null,
    metadataUrl: null,
    redirectUri: 'https://app.vastu.dev/api/auth/callback/okta',
    enabled: false,
    organizationId: 'org-1',
    tenantId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeRequest(body?: unknown, id: string = 'provider-1'): [NextRequest, { params: { id: string } }] {
  const request = new NextRequest(`http://localhost/api/settings/sso/${id}`, {
    method: body !== undefined ? 'PATCH' : 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return [request, { params: { id } }];
}

// ---------------------------------------------------------------------------
// PATCH tests
// ---------------------------------------------------------------------------

describe('PATCH /api/settings/sso/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('returns 200 with updated provider', async () => {
    const existingRow = buildProviderRow();
    const updatedRow = buildProviderRow({ name: 'Okta OIDC (updated)', status: 'LIVE' });

    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(existingRow as never);
    vi.mocked(prismaMock.ssoProvider.update).mockResolvedValueOnce(updatedRow as never);
    vi.mocked(prismaMock.ssoProvider.findUniqueOrThrow).mockResolvedValueOnce(updatedRow as never);

    const [request, context] = makeRequest({ name: 'Okta OIDC (updated)', status: 'LIVE' });

    const response = await PATCH(request, context);
    const body = await response.json() as { provider: { name: string; status: string } };

    expect(response.status).toBe(200);
    expect(body.provider.name).toBe('Okta OIDC (updated)');
    expect(body.provider.status).toBe('LIVE');
  });

  it('returns 200 with test action stub response', async () => {
    const existingRow = buildProviderRow();

    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(existingRow as never);

    const [request, context] = makeRequest({ _action: 'test' });

    const response = await PATCH(request, context);
    const body = await response.json() as { success: boolean; latencyMs: number };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.latencyMs).toBe('number');
  });

  it('uses a transaction when setting provider as default', async () => {
    const existingRow = buildProviderRow();
    const updatedRow = buildProviderRow({ isDefault: true });

    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(existingRow as never);
    vi.mocked(prismaMock.$transaction).mockResolvedValueOnce([{}, updatedRow] as never);
    vi.mocked(prismaMock.ssoProvider.findUniqueOrThrow).mockResolvedValueOnce(updatedRow as never);

    const [request, context] = makeRequest({ isDefault: true });

    const response = await PATCH(request, context);

    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('returns 404 when provider not found', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(null);

    const [request, context] = makeRequest({ name: 'Updated Name' });

    const response = await PATCH(request, context);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Provider not found');
  });

  it('returns 400 when name is set to empty string', async () => {
    const existingRow = buildProviderRow();

    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(existingRow as never);

    const [request, context] = makeRequest({ name: '   ' });

    const response = await PATCH(request, context);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Provider name is required');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const [request, context] = makeRequest({ name: 'Test' });

    const response = await PATCH(request, context);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks update permission', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(false) as never,
    });

    const [request, context] = makeRequest({ name: 'Test' });

    const response = await PATCH(request, context);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });
});

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------

describe('DELETE /api/settings/sso/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('returns 200 success on valid delete', async () => {
    const existingRow = buildProviderRow();

    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(existingRow as never);
    vi.mocked(prismaMock.ssoProvider.update).mockResolvedValueOnce(existingRow as never);

    const [, context] = makeRequest(undefined);
    // Make it a DELETE request
    const deleteRequest = new NextRequest('http://localhost/api/settings/sso/provider-1', {
      method: 'DELETE',
    });

    const response = await DELETE(deleteRequest, context);
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('soft-deletes by setting deletedAt', async () => {
    const existingRow = buildProviderRow();

    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(existingRow as never);
    vi.mocked(prismaMock.ssoProvider.update).mockResolvedValueOnce(existingRow as never);

    const deleteRequest = new NextRequest('http://localhost/api/settings/sso/provider-1', {
      method: 'DELETE',
    });

    await DELETE(deleteRequest, { params: { id: 'provider-1' } });

    expect(prismaMock.ssoProvider.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'provider-1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('returns 404 when provider not found', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findFirst).mockResolvedValueOnce(null);

    const deleteRequest = new NextRequest('http://localhost/api/settings/sso/provider-1', {
      method: 'DELETE',
    });

    const response = await DELETE(deleteRequest, { params: { id: 'provider-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Provider not found');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const deleteRequest = new NextRequest('http://localhost/api/settings/sso/provider-1', {
      method: 'DELETE',
    });

    const response = await DELETE(deleteRequest, { params: { id: 'provider-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks delete permission', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(false) as never,
    });

    const deleteRequest = new NextRequest('http://localhost/api/settings/sso/provider-1', {
      method: 'DELETE',
    });

    const response = await DELETE(deleteRequest, { params: { id: 'provider-1' } });
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });
});

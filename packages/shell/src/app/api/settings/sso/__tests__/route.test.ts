/**
 * Unit tests for GET /api/settings/sso and POST /api/settings/sso
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
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@vastu/shared/utils', () => ({
  encrypt: vi.fn((s: string) => `enc:${s}`),
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, POST } from '../route';
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

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings/sso', {
    method: body !== undefined ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/settings/sso', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('returns 200 with empty providers list when none configured', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findMany).mockResolvedValueOnce([]);

    const response = await GET(makeRequest());
    const body = await response.json() as { providers: unknown[] };

    expect(response.status).toBe(200);
    expect(body.providers).toEqual([]);
  });

  it('returns 200 with mapped providers list', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findMany).mockResolvedValueOnce([
      buildProviderRow() as never,
    ]);

    const response = await GET(makeRequest());
    const body = await response.json() as { providers: Array<{ id: string; protocol: string }> };

    expect(response.status).toBe(200);
    expect(body.providers).toHaveLength(1);
    // Prisma `type` should be mapped to `protocol` in the response
    expect(body.providers[0].protocol).toBe('OIDC');
    expect(body.providers[0].id).toBe('provider-1');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await GET(makeRequest());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks read permission', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(false) as never,
    });

    const response = await GET(makeRequest());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 500 on unexpected database error', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.findMany).mockRejectedValueOnce(new Error('DB failure'));

    const response = await GET(makeRequest());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------

describe('POST /api/settings/sso', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('returns 201 with created provider on valid OIDC input', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.create).mockResolvedValueOnce(
      buildProviderRow() as never,
    );

    const request = makeRequest({
      name: 'Okta OIDC',
      protocol: 'OIDC',
      clientId: 'client-abc',
      redirectUri: 'https://app.vastu.dev/api/auth/callback/okta',
    });

    const response = await POST(request);
    const body = await response.json() as { provider: { id: string; protocol: string } };

    expect(response.status).toBe(201);
    expect(body.provider.id).toBe('provider-1');
    expect(body.provider.protocol).toBe('OIDC');
  });

  it('returns 201 with created SAML provider using metadataUrl', async () => {
    const samlRow = buildProviderRow({
      name: 'Corporate SAML',
      type: 'SAML',
      metadataUrl: 'https://idp.corp.com/metadata.xml',
      clientId: null,
    });
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.ssoProvider.create).mockResolvedValueOnce(samlRow as never);

    const request = makeRequest({
      name: 'Corporate SAML',
      protocol: 'SAML',
      metadataUrl: 'https://idp.corp.com/metadata.xml',
    });

    const response = await POST(request);
    const body = await response.json() as { provider: { protocol: string } };

    expect(response.status).toBe(201);
    expect(body.provider.protocol).toBe('SAML');
  });

  it('returns 400 when name is missing', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = makeRequest({ protocol: 'OIDC', clientId: 'abc' });

    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 when protocol is missing', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = makeRequest({ name: 'My Provider', clientId: 'abc' });

    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 when neither metadataUrl nor clientId is provided', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = makeRequest({ name: 'My Provider', protocol: 'OIDC' });

    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Either metadataUrl or clientId is required');
  });

  it('returns 400 when name is empty string', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = makeRequest({ name: '   ', protocol: 'OIDC', clientId: 'abc' });

    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Provider name is required');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const request = makeRequest({ name: 'Test', protocol: 'OIDC', clientId: 'abc' });

    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks create permission', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(false) as never,
    });

    const request = makeRequest({ name: 'Test', protocol: 'OIDC', clientId: 'abc' });

    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });
});

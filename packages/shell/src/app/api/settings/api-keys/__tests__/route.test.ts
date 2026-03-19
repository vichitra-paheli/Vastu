/**
 * Unit tests for GET /api/settings/api-keys and POST /api/settings/api-keys
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
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@vastu/shared/utils', () => ({
  generateApiKey: vi.fn(() => ({
    key: 'vk_test_rawkey',
    prefix: 'vk_test_',
    hash: 'hashed_key_value',
  })),
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
import { createAuditEvent, generateApiKey } from '@vastu/shared/utils';
import { requireSessionWithAbility } from '@/lib/session';

const prismaMock = vi.mocked(prisma);
const sessionMock = vi.mocked(requireSessionWithAbility);
const generateApiKeyMock = vi.mocked(generateApiKey);

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

function buildApiKeyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    name: 'My API Key',
    keyPrefix: 'vk_test_',
    scope: 'full',
    description: null,
    lastUsedAt: null,
    requestCount24h: 0,
    userId: 'user-1',
    organizationId: 'org-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makePostRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings/api-keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/settings/api-keys', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('returns 200 with empty keys list when none exist', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findMany).mockResolvedValueOnce([]);

    const response = await GET();
    const body = await response.json() as { keys: unknown[] };

    expect(response.status).toBe(200);
    expect(body.keys).toEqual([]);
  });

  it('returns 200 with keys list', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findMany).mockResolvedValueOnce([
      buildApiKeyRow() as never,
    ]);

    const response = await GET();
    const body = await response.json() as { keys: Array<{ id: string; name: string }> };

    expect(response.status).toBe(200);
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].id).toBe('key-1');
    expect(body.keys[0].name).toBe('My API Key');
  });

  it('queries only non-deleted keys for the user organization', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findMany).mockResolvedValueOnce([]);

    await GET();

    expect(prismaMock.apiKey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-1', deletedAt: null },
      }),
    );
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await GET();
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks read:ApiKey permission', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(false) as never,
    });

    const response = await GET();
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
    vi.mocked(prismaMock.apiKey.findMany).mockResolvedValueOnce([]);

    await GET();

    expect(ability.can).toHaveBeenCalledWith('read', 'ApiKey');
  });

  it('returns 500 on unexpected database error', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.findMany).mockRejectedValueOnce(new Error('DB failure'));

    const response = await GET();
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------

describe('POST /api/settings/api-keys', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
    // Restore generateApiKey implementation after resetAllMocks clears it.
    generateApiKeyMock.mockReturnValue({
      key: 'vk_test_rawkey',
      prefix: 'vk_test_',
      hash: 'hashed_key_value',
    });
  });

  it('returns 201 with created key and fullKey on valid input', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.create).mockResolvedValueOnce(
      buildApiKeyRow() as never,
    );

    const request = makePostRequest({ name: 'My API Key' });
    const response = await POST(request);
    const body = await response.json() as { key: { id: string; fullKey: string } };

    expect(response.status).toBe(201);
    expect(body.key.id).toBe('key-1');
    expect(body.key.fullKey).toBe('vk_test_rawkey');
  });

  it('returns 201 with custom scope and description', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.create).mockResolvedValueOnce(
      buildApiKeyRow({ scope: 'read_only', description: 'CI/CD key' }) as never,
    );

    const request = makePostRequest({ name: 'CI Key', scope: 'read_only', description: 'CI/CD key' });
    const response = await POST(request);
    const body = await response.json() as { key: { scope: string; description: string } };

    expect(response.status).toBe(201);
    expect(body.key.scope).toBe('read_only');
    expect(body.key.description).toBe('CI/CD key');
  });

  it('returns 400 when name is missing from body', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = makePostRequest({ scope: 'full' });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 when name is empty string', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = makePostRequest({ name: '   ' });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Key name is required');
  });

  it('returns 400 when scope is invalid', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = makePostRequest({ name: 'My Key', scope: 'superadmin' });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid scope');
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const request = makePostRequest({ name: 'My Key' });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks create:ApiKey permission', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(false) as never,
    });

    const request = makePostRequest({ name: 'My Key' });
    const response = await POST(request);
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
    vi.mocked(prismaMock.apiKey.create).mockResolvedValueOnce(buildApiKeyRow() as never);

    const request = makePostRequest({ name: 'My Key' });
    await POST(request);

    expect(ability.can).toHaveBeenCalledWith('create', 'ApiKey');
  });

  it('returns 400 on malformed JSON body', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });

    const request = new NextRequest('http://localhost/api/settings/api-keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-valid-json',
    });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 500 on unexpected database error', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility(true) as never,
    });
    vi.mocked(prismaMock.apiKey.create).mockRejectedValueOnce(new Error('DB failure'));

    const request = makePostRequest({ name: 'My Key' });
    const response = await POST(request);
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});

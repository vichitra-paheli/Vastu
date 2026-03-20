/**
 * Unit tests for GET and PATCH /api/settings/organization
 *
 * Prisma and the session helper are mocked so tests don't require a live DB.
 *
 * Covers:
 * - GET: returns 200 with organization including ssoRequired and mfaRequired
 * - GET: returns 401 when not authenticated
 * - GET: returns 403 when not admin
 * - GET: returns 404 when organization not found
 * - PATCH: updates ssoRequired to true
 * - PATCH: updates ssoRequired to false
 * - PATCH: ignores ssoRequired when not provided
 * - PATCH: rejects non-boolean ssoRequired
 * - PATCH: updates mfaRequired to true
 * - PATCH: updates mfaRequired to false
 * - PATCH: ignores mfaRequired when not provided
 * - PATCH: rejects non-boolean mfaRequired
 * - PATCH: updates both ssoRequired and mfaRequired independently
 * - PATCH: returns 401 when not authenticated
 * - PATCH: returns 403 when not admin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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

import { GET, PATCH } from '../route';
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

function buildSession() {
  return {
    user: {
      id: 'user-1',
      name: 'Admin User',
      organizationId: 'org-1',
    },
  };
}

function buildAbility() {
  return { can: vi.fn() };
}

function buildOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    name: 'Acme Corp',
    logoUrl: null,
    workspaceUrl: 'acme',
    defaultTimezone: 'UTC',
    defaultLanguage: 'en',
    ssoRequired: false,
    mfaRequired: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/settings/organization', { method: 'GET' });
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings/organization', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/settings/organization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('returns 200 with organization including ssoRequired and mfaRequired', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg({ ssoRequired: true, mfaRequired: true }) as never,
    );

    const response = await GET(makeGetRequest());
    const body = await response.json() as { organization: { ssoRequired: boolean; mfaRequired: boolean } };

    expect(response.status).toBe(200);
    expect(body.organization.ssoRequired).toBe(true);
    expect(body.organization.mfaRequired).toBe(true);
  });

  it('returns 200 with ssoRequired and mfaRequired false by default', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );

    const response = await GET(makeGetRequest());
    const body = await response.json() as { organization: { ssoRequired: boolean; mfaRequired: boolean } };

    expect(response.status).toBe(200);
    expect(body.organization.ssoRequired).toBe(false);
    expect(body.organization.mfaRequired).toBe(false);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockResolvedValueOnce({ session: null, ability: null });

    const response = await GET(makeGetRequest());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(false);

    const response = await GET(makeGetRequest());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 when organization is not found', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(null);

    const response = await GET(makeGetRequest());
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('Organization not found');
  });

  it('returns 500 on unexpected error', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockRejectedValueOnce(new Error('DB failure'));

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PATCH tests for ssoRequired field
// ---------------------------------------------------------------------------

describe('PATCH /api/settings/organization — ssoRequired', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('updates ssoRequired to true and returns 200', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ ssoRequired: true }) as never,
    );

    const response = await PATCH(makePatchRequest({ ssoRequired: true }));
    const body = await response.json() as { success: boolean; organization: { ssoRequired: boolean } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.organization.ssoRequired).toBe(true);
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ssoRequired: true }),
      }),
    );
  });

  it('updates ssoRequired to false and returns 200', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg({ ssoRequired: true }) as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ ssoRequired: false }) as never,
    );

    const response = await PATCH(makePatchRequest({ ssoRequired: false }));
    const body = await response.json() as { success: boolean; organization: { ssoRequired: boolean } };

    expect(response.status).toBe(200);
    expect(body.organization.ssoRequired).toBe(false);
  });

  it('does not include ssoRequired in update when not provided', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ name: 'New Name' }) as never,
    );

    await PATCH(makePatchRequest({ name: 'New Name' }));

    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ ssoRequired: expect.anything() }),
      }),
    );
  });

  it('returns 400 when ssoRequired is not a boolean', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);

    const response = await PATCH(makePatchRequest({ ssoRequired: 'yes' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('writes an audit event with ssoRequired in beforeState and afterState', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ ssoRequired: true }) as never,
    );

    await PATCH(makePatchRequest({ ssoRequired: true }));

    await vi.waitFor(() => {
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeState: expect.objectContaining({ ssoRequired: false }),
          afterState: expect.objectContaining({ ssoRequired: true }),
        }),
      );
    });
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockResolvedValueOnce({ session: null, ability: null });

    const response = await PATCH(makePatchRequest({ ssoRequired: true }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(false);

    const response = await PATCH(makePatchRequest({ ssoRequired: true }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });
});

// ---------------------------------------------------------------------------
// PATCH tests for mfaRequired field
// ---------------------------------------------------------------------------

describe('PATCH /api/settings/organization — mfaRequired', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
  });

  it('updates mfaRequired to true and returns 200', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ mfaRequired: true }) as never,
    );

    const response = await PATCH(makePatchRequest({ mfaRequired: true }));
    const body = await response.json() as { success: boolean; organization: { mfaRequired: boolean } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.organization.mfaRequired).toBe(true);
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mfaRequired: true }),
      }),
    );
  });

  it('updates mfaRequired to false and returns 200', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg({ mfaRequired: true }) as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ mfaRequired: false }) as never,
    );

    const response = await PATCH(makePatchRequest({ mfaRequired: false }));
    const body = await response.json() as { success: boolean; organization: { mfaRequired: boolean } };

    expect(response.status).toBe(200);
    expect(body.organization.mfaRequired).toBe(false);
  });

  it('does not include mfaRequired in update when not provided', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ name: 'New Name' }) as never,
    );

    await PATCH(makePatchRequest({ name: 'New Name' }));

    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ mfaRequired: expect.anything() }),
      }),
    );
  });

  it('returns 400 when mfaRequired is not a boolean', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);

    const response = await PATCH(makePatchRequest({ mfaRequired: 'yes' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('can update both ssoRequired and mfaRequired independently in one request', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ ssoRequired: true, mfaRequired: true }) as never,
    );

    const response = await PATCH(makePatchRequest({ ssoRequired: true, mfaRequired: true }));
    const body = await response.json() as { success: boolean; organization: { ssoRequired: boolean; mfaRequired: boolean } };

    expect(response.status).toBe(200);
    expect(body.organization.ssoRequired).toBe(true);
    expect(body.organization.mfaRequired).toBe(true);
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ssoRequired: true, mfaRequired: true }),
      }),
    );
  });

  it('writes an audit event with mfaRequired in beforeState and afterState', async () => {
    sessionMock.mockResolvedValueOnce({
      session: buildSession() as never,
      ability: buildAbility() as never,
    });
    isAdminMock.mockReturnValueOnce(true);
    vi.mocked(prismaMock.organization.findUnique).mockResolvedValueOnce(
      buildOrg() as never,
    );
    vi.mocked(prismaMock.organization.update).mockResolvedValueOnce(
      buildOrg({ mfaRequired: true }) as never,
    );

    await PATCH(makePatchRequest({ mfaRequired: true }));

    await vi.waitFor(() => {
      expect(createAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeState: expect.objectContaining({ mfaRequired: false }),
          afterState: expect.objectContaining({ mfaRequired: true }),
        }),
      );
    });
  });
});

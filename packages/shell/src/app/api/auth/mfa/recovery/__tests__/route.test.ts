/**
 * Unit tests for POST /api/auth/mfa/recovery
 *
 * Covers:
 *   - Valid recovery code succeeds (200)
 *   - Used code is consumed (removed from mfaRecoveryCodes, single-use)
 *   - Invalid code returns 401
 *   - MFA not enabled returns 400
 *   - Missing mfaRecoveryCodes (invalid config) returns 500
 *   - 400 on empty code
 *   - 401 when not authenticated
 *   - 500 on DB write failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@vastu/shared/utils', () => ({
  hashApiKey: vi.fn(),
  createAuditEvent: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '../route';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent, hashApiKey } from '@vastu/shared/utils';
import { auth } from '@/lib/auth';

const prismaMock = vi.mocked(prisma);
const authMock = vi.mocked(auth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/mfa/recovery', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-1',
      name: 'Test User',
      organizationId: 'org-1',
      ...overrides,
    },
  };
}

// Build a user row with hashed recovery codes in the separate mfaRecoveryCodes column.
// hashApiKey is mocked as (s) => `hash:${s}`.
function buildUserRow(
  recoveryCodes: string[] | null = ['hash:ABCD-EFGH', 'hash:1234-5678'],
  overrides: Record<string, unknown> = {},
) {
  return {
    mfaEnabled: true,
    mfaSecret: 'PURE_TOTP_SECRET',
    mfaRecoveryCodes: recoveryCodes !== null ? JSON.stringify(recoveryCodes) : null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/mfa/recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
    vi.mocked(prismaMock.user.update).mockResolvedValue({} as never);
    // hashApiKey mock: deterministic hash used by stored codes in buildUserRow
    vi.mocked(hashApiKey).mockImplementation((s: string) => `hash:${s}`);
  });

  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValueOnce(null as never);

    const response = await POST(makeRequest({ code: 'ABCD-EFGH' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when request body is invalid', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);

    const response = await POST(makeRequest({ notCode: 'abc' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 when code is empty string', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);

    const response = await POST(makeRequest({ code: '   ' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Recovery code is required');
  });

  it('returns 400 when MFA is not enabled', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(null, { mfaEnabled: false }) as never,
    );

    const response = await POST(makeRequest({ code: 'ABCD-EFGH' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('MFA is not enabled');
  });

  it('returns 500 when mfaRecoveryCodes is null (invalid MFA config)', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(null) as never,
    );

    const response = await POST(makeRequest({ code: 'ABCD-EFGH' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toContain('Invalid MFA configuration');
  });

  it('returns 500 when mfaRecoveryCodes is empty array (all codes consumed)', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow([]) as never,
    );

    const response = await POST(makeRequest({ code: 'ABCD-EFGH' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toContain('Invalid MFA configuration');
  });

  it('returns 401 when recovery code does not match any stored hash', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(['hash:ABCD-EFGH', 'hash:1234-5678']) as never,
    );

    const response = await POST(makeRequest({ code: 'ZZZZ-ZZZZ' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid recovery code');
  });

  it('returns 200 on valid recovery code', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(['hash:ABCD-EFGH', 'hash:1234-5678']) as never,
    );
    // hashApiKey mock: (s) => `hash:${s}`, so submitting 'ABCD-EFGH' → 'hash:ABCD-EFGH'

    const response = await POST(makeRequest({ code: 'ABCD-EFGH' }));
    const body = await response.json() as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('consumes the used code (single-use): removes matched code from stored list', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(['hash:ABCD-EFGH', 'hash:1234-5678']) as never,
    );

    await POST(makeRequest({ code: 'ABCD-EFGH' }));

    const updateCall = vi.mocked(prismaMock.user.update).mock.calls[0];
    const updateData = updateCall[0].data as { mfaRecoveryCodes: string };
    const remaining: unknown = JSON.parse(updateData.mfaRecoveryCodes);

    expect(Array.isArray(remaining)).toBe(true);
    // The matched hash should be gone; the other should remain
    expect(remaining).not.toContain('hash:ABCD-EFGH');
    expect(remaining).toContain('hash:1234-5678');
    expect((remaining as string[]).length).toBe(1);
  });

  it('normalises submitted code to uppercase before hashing', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(['hash:ABCD-EFGH']) as never,
    );

    // Submit in lowercase
    await POST(makeRequest({ code: 'abcd-efgh' }));

    // hashApiKey should have been called with the uppercase normalised value
    expect(vi.mocked(hashApiKey)).toHaveBeenCalledWith('ABCD-EFGH');
  });

  it('does not update mfaSecret when consuming a recovery code', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(['hash:ABCD-EFGH']) as never,
    );

    await POST(makeRequest({ code: 'ABCD-EFGH' }));

    const updateCall = vi.mocked(prismaMock.user.update).mock.calls[0];
    const updateData = updateCall[0].data as Record<string, unknown>;

    // mfaSecret must not be touched
    expect(updateData.mfaSecret).toBeUndefined();
  });

  it('returns 500 on DB write failure', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(['hash:ABCD-EFGH']) as never,
    );
    vi.mocked(prismaMock.user.update).mockRejectedValueOnce(new Error('DB failure'));

    const response = await POST(makeRequest({ code: 'ABCD-EFGH' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toContain('Failed to process recovery code');
  });

  it('writes an audit event on successful recovery code use', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow(['hash:ABCD-EFGH', 'hash:1234-5678']) as never,
    );

    await POST(makeRequest({ code: 'ABCD-EFGH' }));

    expect(vi.mocked(createAuditEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        resourceType: 'User',
        resourceDescription: 'MFA recovery code used',
        afterState: { remainingRecoveryCodes: 1 },
      }),
    );
  });
});

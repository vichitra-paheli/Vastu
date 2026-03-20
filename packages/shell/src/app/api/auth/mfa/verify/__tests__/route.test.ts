/**
 * Unit tests for POST /api/auth/mfa/verify
 *
 * Covers:
 *   - TOTP verification uses only the clean secret (not the full mfaSecret
 *     string if it ever contained the legacy ||RC: suffix)
 *   - 200 + recoveryCodes returned on valid code
 *   - mfaRecoveryCodes stored as JSON array, mfaSecret stored as pure secret
 *   - 400 on missing/short code
 *   - 400 when mfaSecret is absent (no setup in progress)
 *   - 401 when not authenticated
 *   - 409 when MFA already enabled
 *   - 500 on DB write failure
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports from the module under test
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
  // generateToken(4) → 8 hex chars, mocked as 'abababab'
  generateToken: vi.fn(),
  hashApiKey: vi.fn(),
  createAuditEvent: vi.fn(),
}));

vi.mock('otplib', () => ({
  authenticator: {
    verify: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '../route';
import { prisma } from '@vastu/shared/prisma';
import { generateToken, createAuditEvent, hashApiKey } from '@vastu/shared/utils';
import { authenticator } from 'otplib';
import { auth } from '@/lib/auth';

const prismaMock = vi.mocked(prisma);
const authenticatorMock = vi.mocked(authenticator);
const authMock = vi.mocked(auth);
const generateTokenMock = vi.mocked(generateToken);
const hashApiKeyMock = vi.mocked(hashApiKey);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/mfa/verify', {
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
      email: 'test@example.com',
      organizationId: 'org-1',
      ...overrides,
    },
  };
}

function buildUserRow(overrides: Record<string, unknown> = {}) {
  return {
    mfaSecret: 'TOTP_SECRET_ABC',
    mfaEnabled: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/mfa/verify', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuditEvent).mockResolvedValue(undefined as never);
    vi.mocked(prismaMock.user.update).mockResolvedValue({} as never);
    // generateToken(4) returns 8 hex chars — mocked as 'abababab'
    generateTokenMock.mockReturnValue('abababab');
    // hashApiKey mirrors the real behaviour in a deterministic way for tests
    hashApiKeyMock.mockImplementation((s: string) => `hash:${s}`);
  });

  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValueOnce(null as never);

    const response = await POST(makeRequest({ code: '123456' }));
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

  it('returns 400 when code is fewer than 6 digits', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);

    const response = await POST(makeRequest({ code: '123' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('A 6-digit verification code is required');
  });

  it('returns 409 when MFA is already enabled', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow({ mfaEnabled: true }) as never,
    );

    const response = await POST(makeRequest({ code: '123456' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toContain('already enabled');
  });

  it('returns 400 when no MFA setup is in progress (no mfaSecret)', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow({ mfaSecret: null }) as never,
    );

    const response = await POST(makeRequest({ code: '123456' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('No MFA setup in progress');
  });

  it('returns 400 when TOTP code is invalid', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow() as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(false);

    const response = await POST(makeRequest({ code: '999999' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid verification code');
  });

  it('passes only the pure TOTP secret to authenticator.verify (clean secret)', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow({ mfaSecret: 'PURE_SECRET' }) as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(true);

    await POST(makeRequest({ code: '123456' }));

    expect(authenticatorMock.verify).toHaveBeenCalledWith({
      token: '123456',
      secret: 'PURE_SECRET',
    });
  });

  it('passes only the pure TOTP secret to authenticator.verify when mfaSecret has legacy ||RC: suffix', async () => {
    // This is the core regression test for the bug: a previously packed
    // mfaSecret must be split so only the actual TOTP secret is verified.
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow({ mfaSecret: 'PURE_SECRET||RC:hash1,hash2,hash3' }) as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(true);

    await POST(makeRequest({ code: '123456' }));

    expect(authenticatorMock.verify).toHaveBeenCalledWith({
      token: '123456',
      secret: 'PURE_SECRET',
    });
    // Must NOT receive the packed string
    expect(authenticatorMock.verify).not.toHaveBeenCalledWith({
      token: expect.any(String),
      secret: 'PURE_SECRET||RC:hash1,hash2,hash3',
    });
  });

  it('returns 200 with recovery codes on valid TOTP code and stores them separately', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow({ mfaSecret: 'PURE_SECRET' }) as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(true);

    const response = await POST(makeRequest({ code: '123456' }));
    const body = await response.json() as { recoveryCodes: string[] };

    expect(response.status).toBe(200);
    expect(Array.isArray(body.recoveryCodes)).toBe(true);
    expect(body.recoveryCodes).toHaveLength(6);

    // Each code should be formatted as XXXX-XXXX
    for (const code of body.recoveryCodes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  it('stores mfaSecret as pure TOTP secret and mfaRecoveryCodes as JSON array', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow({ mfaSecret: 'PURE_SECRET' }) as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(true);

    await POST(makeRequest({ code: '123456' }));

    const updateCall = vi.mocked(prismaMock.user.update).mock.calls[0];
    const updateData = updateCall[0].data as {
      mfaEnabled: boolean;
      mfaSecret: string;
      mfaRecoveryCodes: string;
    };

    // mfaSecret must be the pure TOTP secret — no ||RC: suffix
    expect(updateData.mfaSecret).toBe('PURE_SECRET');
    expect(updateData.mfaSecret).not.toContain('||RC:');

    // mfaRecoveryCodes must be valid JSON array of strings
    const parsedCodes: unknown = JSON.parse(updateData.mfaRecoveryCodes);
    expect(Array.isArray(parsedCodes)).toBe(true);
    expect((parsedCodes as string[]).length).toBe(6);

    // mfaEnabled must be true
    expect(updateData.mfaEnabled).toBe(true);
  });

  it('stores clean mfaSecret even when input had legacy ||RC: packed format', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow({ mfaSecret: 'PURE_SECRET||RC:oldhash1,oldhash2' }) as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(true);

    await POST(makeRequest({ code: '123456' }));

    const updateCall = vi.mocked(prismaMock.user.update).mock.calls[0];
    const updateData = updateCall[0].data as { mfaSecret: string };

    expect(updateData.mfaSecret).toBe('PURE_SECRET');
    expect(updateData.mfaSecret).not.toContain('||RC:');
  });

  it('returns 500 when DB update fails', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow() as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(true);
    vi.mocked(prismaMock.user.update).mockRejectedValueOnce(new Error('DB failure'));

    const response = await POST(makeRequest({ code: '123456' }));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toContain('Failed to enable MFA');
  });

  it('strips non-digit characters from submitted code before verification', async () => {
    authMock.mockResolvedValueOnce(buildSession() as never);
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(
      buildUserRow() as never,
    );
    authenticatorMock.verify.mockReturnValueOnce(true);

    // Code submitted with spaces
    await POST(makeRequest({ code: '1 2 3 4 5 6' }));

    expect(authenticatorMock.verify).toHaveBeenCalledWith(
      expect.objectContaining({ token: '123456' }),
    );
  });
});

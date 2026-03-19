/**
 * Unit tests for POST /api/auth/register
 *
 * Tests the full registration flow including:
 * - Input validation
 * - Duplicate email detection
 * - Keycloak user creation
 * - DB transaction
 * - Keycloak cleanup on DB failure (compensating transaction)
 * - Audit event
 *
 * Both Prisma and the Keycloak admin helper are mocked so tests require
 * no live services.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use the mocked modules.
// ---------------------------------------------------------------------------

vi.mock('@vastu/shared/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@vastu/shared/utils', () => ({
  isValidEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/keycloak-admin', () => ({
  createKeycloakUser: vi.fn(),
  deleteKeycloakUser: vi.fn(),
  KeycloakAdminError: class KeycloakAdminError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'KeycloakAdminError';
      this.status = status;
    }
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '../route';
import { prisma } from '@vastu/shared/prisma';
import { createAuditEvent, isValidEmail } from '@vastu/shared/utils';
import { createKeycloakUser, deleteKeycloakUser, KeycloakAdminError } from '@/lib/keycloak-admin';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const prismaMock = vi.mocked(prisma);
const createKeycloakUserMock = vi.mocked(createKeycloakUser);
const deleteKeycloakUserMock = vi.mocked(deleteKeycloakUser);
const createAuditEventMock = vi.mocked(createAuditEvent);
const isValidEmailMock = vi.mocked(isValidEmail);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const VALID_BODY = {
  name: 'Alice Admin',
  orgName: 'Acme Corp',
  email: 'alice@acme.com',
  password: 'SuperSecret1!',
};

const KEYCLOAK_USER_ID = 'kc-user-uuid-1234';

const DB_RESULT = {
  user: { id: 'user-uuid', name: 'Alice Admin', email: 'alice@acme.com', organizationId: 'org-uuid' },
  organization: { id: 'org-uuid', name: 'Acme Corp' },
  tenant: { id: 'tenant-uuid', name: 'Acme Corp', subdomain: 'acme-abcde', organizationId: 'org-uuid' },
};

function makeRequest(body: unknown, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost/api/auth/register', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupHappyPath() {
  vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(null);
  createKeycloakUserMock.mockResolvedValueOnce(KEYCLOAK_USER_ID);
  vi.mocked(prismaMock.$transaction).mockResolvedValueOnce(DB_RESULT as never);
  createAuditEventMock.mockResolvedValue(undefined as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore isValidEmail implementation after resetAllMocks clears it.
    isValidEmailMock.mockImplementation((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    createAuditEventMock.mockResolvedValue(undefined as never);
    deleteKeycloakUserMock.mockResolvedValue(undefined);
  });

  // ---- Validation ----------------------------------------------------------

  it('returns 400 when request body is not JSON', async () => {
    const request = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 when name is missing', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, name: '' }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Full name is required');
  });

  it('returns 400 when orgName is missing', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, orgName: '' }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Organization name is required');
  });

  it('returns 400 when email is invalid', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, email: 'not-an-email' }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('A valid work email is required');
  });

  it('returns 400 when password is too short', async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, password: 'short' }));
    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain('8 characters');
  });

  it('returns 400 when a required field is missing from the body', async () => {
    const { password: _unused, ...bodyWithoutPassword } = VALID_BODY; // eslint-disable-line @typescript-eslint/no-unused-vars
    const response = await POST(makeRequest(bodyWithoutPassword));
    expect(response.status).toBe(400);
  });

  // ---- Duplicate email (DB) -----------------------------------------------

  it('returns 409 when email already exists in the DB', async () => {
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce({ id: 'existing-user' } as never);

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(409);
    const body = await response.json() as { error: string };
    expect(body.error).toContain('already exists');

    // Keycloak must NOT be called when the DB already has the email.
    expect(createKeycloakUserMock).not.toHaveBeenCalled();
  });

  // ---- Keycloak failures ---------------------------------------------------

  it('returns 409 when Keycloak reports the email already exists', async () => {
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(null);
    createKeycloakUserMock.mockRejectedValueOnce(
      new KeycloakAdminError('Conflict', 409),
    );

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(409);

    // No DB records should be attempted.
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns 502 when Keycloak is unreachable', async () => {
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(null);
    createKeycloakUserMock.mockRejectedValueOnce(
      new KeycloakAdminError('Connection refused', 503),
    );

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(502);

    // No DB records should be attempted.
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns 500 when an unexpected error is thrown during Keycloak creation', async () => {
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(null);
    createKeycloakUserMock.mockRejectedValueOnce(new Error('unexpected network error'));

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  // ---- DB transaction failure with Keycloak cleanup -----------------------

  it('deletes the Keycloak user when the DB transaction fails', async () => {
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(null);
    createKeycloakUserMock.mockResolvedValueOnce(KEYCLOAK_USER_ID);
    vi.mocked(prismaMock.$transaction).mockRejectedValueOnce(new Error('DB connection lost'));

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);

    // The Keycloak user must be cleaned up.
    expect(deleteKeycloakUserMock).toHaveBeenCalledOnce();
    expect(deleteKeycloakUserMock).toHaveBeenCalledWith(KEYCLOAK_USER_ID);
  });

  it('returns 500 after DB failure and does not crash if Keycloak cleanup also fails', async () => {
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(null);
    createKeycloakUserMock.mockResolvedValueOnce(KEYCLOAK_USER_ID);
    vi.mocked(prismaMock.$transaction).mockRejectedValueOnce(new Error('DB down'));
    deleteKeycloakUserMock.mockRejectedValueOnce(new Error('Keycloak also down'));

    // Must not throw — deleteKeycloakUser failures are swallowed inside the helper.
    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(500);
  });

  // ---- Happy path ----------------------------------------------------------

  it('returns 201 with userId and organizationId on success', async () => {
    setupHappyPath();

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(201);

    const body = await response.json() as { success: boolean; userId: string; organizationId: string };
    expect(body.success).toBe(true);
    expect(body.userId).toBe(DB_RESULT.user.id);
    expect(body.organizationId).toBe(DB_RESULT.organization.id);
  });

  it('creates Keycloak user with the correct email, name, and password', async () => {
    setupHappyPath();
    await POST(makeRequest(VALID_BODY));

    expect(createKeycloakUserMock).toHaveBeenCalledOnce();
    expect(createKeycloakUserMock).toHaveBeenCalledWith({
      email: VALID_BODY.email,
      name: VALID_BODY.name,
      password: VALID_BODY.password,
    });
  });

  it('normalises email to lowercase before creating Keycloak user', async () => {
    setupHappyPath();
    await POST(makeRequest({ ...VALID_BODY, email: 'Alice@ACME.COM' }));

    expect(createKeycloakUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'alice@acme.com' }),
    );
  });

  it('runs the Prisma transaction only after Keycloak user is created', async () => {
    // Track call order via a shared sequence array.
    const callOrder: string[] = [];
    vi.mocked(prismaMock.user.findUnique).mockResolvedValueOnce(null);
    createKeycloakUserMock.mockImplementationOnce(async () => {
      callOrder.push('keycloak');
      return KEYCLOAK_USER_ID;
    });
    vi.mocked(prismaMock.$transaction).mockImplementationOnce(async () => {
      callOrder.push('db');
      return DB_RESULT;
    });

    await POST(makeRequest(VALID_BODY));

    expect(callOrder).toEqual(['keycloak', 'db']);
  });

  it('writes an audit event after successful registration', async () => {
    setupHappyPath();
    await POST(makeRequest(VALID_BODY));

    // Allow fire-and-forget audit event to settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createAuditEventMock).toHaveBeenCalledOnce();
    expect(createAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        resourceType: 'User',
        resourceId: DB_RESULT.user.id,
        organizationId: DB_RESULT.organization.id,
      }),
    );
  });

  it('includes the keycloakUserId in the audit event afterState', async () => {
    setupHappyPath();
    await POST(makeRequest(VALID_BODY));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        afterState: expect.objectContaining({ keycloakUserId: KEYCLOAK_USER_ID }),
      }),
    );
  });

  it('does not call deleteKeycloakUser on success', async () => {
    setupHappyPath();
    await POST(makeRequest(VALID_BODY));
    expect(deleteKeycloakUserMock).not.toHaveBeenCalled();
  });

  it('trims whitespace from name and orgName', async () => {
    setupHappyPath();
    await POST(makeRequest({ ...VALID_BODY, name: '  Alice Admin  ', orgName: '  Acme Corp  ' }));

    expect(createKeycloakUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice Admin' }),
    );
  });
});

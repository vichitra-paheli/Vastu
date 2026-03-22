/**
 * Unit tests for GET and PUT /api/workspace/pages/[id]/config
 *
 * The session helper is mocked so tests don't require a live DB or auth.
 *
 * Covers:
 * - GET returns config when found
 * - GET returns 404 when not found
 * - GET returns 401 when unauthenticated
 * - GET returns 403 when user lacks read:Page permission
 * - PUT creates/updates config and returns 200
 * - PUT returns 400 for invalid JSON
 * - PUT returns 400 for missing config field
 * - PUT returns 400 for missing templateType
 * - PUT returns 400 for invalid templateType value
 * - PUT returns 401 when unauthenticated
 * - PUT returns 403 when user lacks configure:Page permission
 * - PUT increments version on successive saves
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/session', () => ({
  requireSessionWithAbility: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, PUT } from '../route';
import { requireSessionWithAbility } from '@/lib/session';

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
      name: 'Test User',
      organizationId: 'org-1',
      ...overrides,
    },
  };
}

function setupAuthSession(canResult: boolean = true) {
  sessionMock.mockResolvedValueOnce({
    session: buildSession() as never,
    ability: buildAbility(canResult) as never,
  });
}

function makeGetRequest(pageId: string): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/pages/${pageId}/config`, {
    method: 'GET',
  });
}

function makePutRequest(pageId: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/pages/${pageId}/config`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeRawPutRequest(pageId: string, rawBody: string): NextRequest {
  return new NextRequest(`http://localhost/api/workspace/pages/${pageId}/config`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: rawBody,
  });
}

/** Build route params in the shape Next.js passes them. */
function makeParams(pageId: string) {
  return { params: Promise.resolve({ id: pageId }) };
}

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe('GET /api/workspace/pages/[id]/config', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 404 when no config has been saved yet', async () => {
    setupAuthSession();

    const response = await GET(makeGetRequest('new-page'), makeParams('new-page'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe('No configuration found for this page');
    // The dead defaultConfig field must not leak into the response (finding #4)
    expect(body).not.toHaveProperty('defaultConfig');
  });

  it('returns 200 with config after a successful PUT', async () => {
    const pageId = 'page-get-200';
    const config = { templateType: 'table-listing', fields: [] };

    // PUT to create config
    setupAuthSession();
    await PUT(makePutRequest(pageId, { config }), makeParams(pageId));

    // GET the config back
    setupAuthSession();
    const response = await GET(makeGetRequest(pageId), makeParams(pageId));
    const body = await response.json() as { config: { templateType: string }; version: number };

    expect(response.status).toBe(200);
    expect(body.config.templateType).toBe('table-listing');
    expect(body.version).toBe(1);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await GET(makeGetRequest('any-page'), makeParams('any-page'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks read:Page permission', async () => {
    setupAuthSession(false);

    const response = await GET(makeGetRequest('any-page'), makeParams('any-page'));
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

    await GET(makeGetRequest('any-page'), makeParams('any-page'));

    expect(ability.can).toHaveBeenCalledWith('read', 'Page');
  });
});

// ---------------------------------------------------------------------------
// PUT tests
// ---------------------------------------------------------------------------

describe('PUT /api/workspace/pages/[id]/config', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates a config record and returns 200 with version 1', async () => {
    const pageId = 'page-put-create';
    setupAuthSession();

    const config = { templateType: 'table-listing', fields: [] };
    const response = await PUT(makePutRequest(pageId, { config }), makeParams(pageId));
    const body = await response.json() as { config: { templateType: string }; version: number };

    expect(response.status).toBe(200);
    expect(body.config.templateType).toBe('table-listing');
    expect(body.version).toBe(1);
  });

  it('increments version on successive saves for the same page', async () => {
    const pageId = 'page-put-version';
    const config = { templateType: 'dashboard' };

    setupAuthSession();
    await PUT(makePutRequest(pageId, { config }), makeParams(pageId));

    setupAuthSession();
    const response2 = await PUT(makePutRequest(pageId, { config }), makeParams(pageId));
    const body2 = await response2.json() as { version: number };

    expect(body2.version).toBe(2);
  });

  it('returns 400 for malformed JSON body', async () => {
    setupAuthSession();

    const response = await PUT(
      makeRawPutRequest('any-page', 'not-valid-json{{'),
      makeParams('any-page'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON');
  });

  it('returns 400 when body has no config field', async () => {
    setupAuthSession();

    const response = await PUT(makePutRequest('any-page', {}), makeParams('any-page'));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('"config"');
  });

  it('returns 400 when config is an array instead of an object', async () => {
    setupAuthSession();

    const response = await PUT(
      makePutRequest('any-page', { config: ['table-listing'] }),
      makeParams('any-page'),
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when templateType is missing', async () => {
    setupAuthSession();

    const response = await PUT(
      makePutRequest('any-page', { config: { fields: [] } }),
      makeParams('any-page'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('templateType');
  });

  it('returns 400 when templateType is not a recognised value', async () => {
    setupAuthSession();

    const response = await PUT(
      makePutRequest('any-page', { config: { templateType: 'unknown-template' } }),
      makeParams('any-page'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain('templateType');
  });

  it.each([
    'table-listing',
    'summary-dashboard',
    'multi-tab-detail',
    'data-explorer',
    'form-page',
    'timeline-activity',
    'dashboard',
  ] as const)('accepts valid templateType "%s"', async (templateType) => {
    const pageId = `page-type-${templateType}`;
    setupAuthSession();

    const response = await PUT(
      makePutRequest(pageId, { config: { templateType } }),
      makeParams(pageId),
    );

    expect(response.status).toBe(200);
  });

  it('returns 401 when not authenticated', async () => {
    sessionMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const response = await PUT(
      makePutRequest('any-page', { config: { templateType: 'table-listing' } }),
      makeParams('any-page'),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks configure:Page permission', async () => {
    setupAuthSession(false);

    const response = await PUT(
      makePutRequest('any-page', { config: { templateType: 'table-listing' } }),
      makeParams('any-page'),
    );
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
    const pageId = 'page-casl-check';

    await PUT(
      makePutRequest(pageId, { config: { templateType: 'table-listing' } }),
      makeParams(pageId),
    );

    expect(ability.can).toHaveBeenCalledWith('configure', 'Page');
  });
});

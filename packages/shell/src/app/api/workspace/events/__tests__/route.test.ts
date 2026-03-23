/**
 * Unit tests for GET /api/workspace/events (SSE endpoint).
 *
 * We mock getSession, subscribe/unsubscribe from @vastu/shared/data-engine.
 * The stream is consumed by reading chunks and verifying SSE protocol.
 *
 * Covers:
 * - Returns 401 when unauthenticated
 * - Returns 403 when session has no organizationId
 * - Returns 200 with SSE headers when authenticated
 * - Sends retry + :ok preamble on connect
 * - Forwards emitted events as data: lines
 * - Unsubscribes on stream cancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

let capturedTenantId = '';
let capturedCallback: ((e: unknown) => void) | null = null;
let capturedSubscriptionId = '';
let cancelCallback: (() => void) | null = null;

vi.mock('@vastu/shared/data-engine', () => ({
  subscribe: vi.fn((tenantId: string, cb: (e: unknown) => void) => {
    capturedTenantId = tenantId;
    capturedCallback = cb;
    capturedSubscriptionId = `sub_${tenantId}`;
    return capturedSubscriptionId;
  }),
  unsubscribe: vi.fn(),
}));

const mockGetSession = vi.fn();
vi.mock('@/lib/session', () => ({
  getSession: mockGetSession,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { subscribe, unsubscribe } from '@vastu/shared/data-engine';
import { GET } from '../route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function collectStreamChunks(stream: ReadableStream): Promise<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  // Read a limited number of chunks to avoid infinite loop in tests
  for (let i = 0; i < 5; i++) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(decoder.decode(value));
  }
  reader.cancel();
  return chunks;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  capturedTenantId = '';
  capturedCallback = null;
  capturedSubscriptionId = '';
  cancelCallback = null;
});

describe('GET /api/workspace/events', () => {
  describe('authentication', () => {
    it('returns 401 when session is null', async () => {
      mockGetSession.mockResolvedValue(null);
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns 401 when session has no user', async () => {
      mockGetSession.mockResolvedValue({});
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns 403 when session user has no organizationId', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', organizationId: null },
      });
      const response = await GET();
      expect(response.status).toBe(403);
    });

    it('returns 403 when session user has empty organizationId', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', organizationId: '' },
      });
      const response = await GET();
      expect(response.status).toBe(403);
    });
  });

  describe('successful connection', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', organizationId: 'org-abc' },
      });
    });

    it('returns 200 with SSE content-type', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('returns no-cache headers', async () => {
      const response = await GET();
      expect(response.headers.get('Cache-Control')).toContain('no-cache');
    });

    it('returns X-Accel-Buffering: no', async () => {
      const response = await GET();
      expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    });

    it('sends retry and :ok preamble on connect', async () => {
      const response = await GET();
      const body = response.body;
      expect(body).not.toBeNull();
      const chunks = await collectStreamChunks(body!);
      const combined = chunks.join('');
      expect(combined).toContain('retry: 1000');
      expect(combined).toContain(':ok');
    });

    it('subscribes to the correct tenant on connect', async () => {
      await GET();
      expect(subscribe).toHaveBeenCalledWith('org-abc', expect.any(Function));
    });

    it('forwards events emitted for the tenant', async () => {
      const response = await GET();
      const body = response.body!;
      const reader = body.getReader();
      const decoder = new TextDecoder();

      // Consume preamble chunks
      await reader.read(); // retry
      await reader.read(); // :ok

      // Emit an event via the captured callback
      const event = {
        type: 'record.created',
        table: 'race',
        tenantId: 'org-abc',
        timestamp: '2024-01-01T00:00:00Z',
      };
      capturedCallback!(event);

      const { value } = await reader.read();
      const text = decoder.decode(value);
      expect(text).toContain('data:');
      expect(text).toContain('"record.created"');

      reader.cancel();
    });

    it('unsubscribes when the stream is cancelled', async () => {
      const response = await GET();
      const body = response.body!;
      const reader = body.getReader();

      // Consume preamble
      await reader.read();
      await reader.read();

      // Cancel the stream
      await reader.cancel();

      expect(unsubscribe).toHaveBeenCalledWith(capturedSubscriptionId, 'org-abc');
    });
  });
});

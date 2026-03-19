/**
 * Unit tests for the Redis-backed rate limiter.
 *
 * The Redis client is injected via _setRedisClientForTesting so tests
 * exercise the full logic without a real Redis connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Mock ioredis — must be declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => mockRedisInstance),
  };
});

// Shared mock Redis instance — individual tests override methods as needed.
const mockRedisInstance = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  on: vi.fn(),
} as unknown as Redis;

// ---------------------------------------------------------------------------
// Import module under test after mocks are set up
// ---------------------------------------------------------------------------

import { rateLimit, _setRedisClientForTesting } from '../rate-limit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOptions(overrides?: { key?: string; limit?: number; windowSeconds?: number }) {
  return {
    key: 'test:alice@vastu.dev',
    limit: 3,
    windowSeconds: 600,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rateLimit()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Inject the mock Redis client before each test.
    _setRedisClientForTesting(mockRedisInstance);
    // Defaults — happy path: first request in a new window.
    vi.mocked(mockRedisInstance.incr).mockResolvedValue(1);
    vi.mocked(mockRedisInstance.expire).mockResolvedValue(1);
    vi.mocked(mockRedisInstance.ttl).mockResolvedValue(600);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('allows the first request and sets the window expiry', async () => {
    const result = await rateLimit(makeOptions({ limit: 3, windowSeconds: 600 }));

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 3 - 1 = 2
    expect(mockRedisInstance.incr).toHaveBeenCalledOnce();
    expect(mockRedisInstance.expire).toHaveBeenCalledWith('rl:test:alice@vastu.dev', 600);
  });

  it('allows subsequent requests within the limit', async () => {
    vi.mocked(mockRedisInstance.incr).mockResolvedValue(2);

    const result = await rateLimit(makeOptions({ limit: 3 }));

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    // expire should NOT be called again (count > 1 means window was already set)
    expect(mockRedisInstance.expire).not.toHaveBeenCalled();
  });

  it('allows the request that exactly reaches the limit', async () => {
    vi.mocked(mockRedisInstance.incr).mockResolvedValue(3);

    const result = await rateLimit(makeOptions({ limit: 3 }));

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('blocks the request that exceeds the limit', async () => {
    vi.mocked(mockRedisInstance.incr).mockResolvedValue(4);
    vi.mocked(mockRedisInstance.ttl).mockResolvedValue(300);

    const result = await rateLimit(makeOptions({ limit: 3 }));

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    // resetAt should be approximately now + TTL seconds
    const expectedReset = Date.now() + 300 * 1000;
    expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(expectedReset - 100);
    expect(result.resetAt.getTime()).toBeLessThanOrEqual(expectedReset + 100);
  });

  it('uses the window size as resetAt fallback when TTL is -1', async () => {
    vi.mocked(mockRedisInstance.incr).mockResolvedValue(4);
    vi.mocked(mockRedisInstance.ttl).mockResolvedValue(-1); // key has no expiry (edge case)

    const result = await rateLimit(makeOptions({ limit: 3, windowSeconds: 600 }));

    expect(result.allowed).toBe(false);
    // resetAt falls back to now + windowSeconds
    const expectedReset = Date.now() + 600 * 1000;
    expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(expectedReset - 100);
    expect(result.resetAt.getTime()).toBeLessThanOrEqual(expectedReset + 100);
  });

  // -------------------------------------------------------------------------
  // Redis unavailable — fallback behaviour
  // -------------------------------------------------------------------------

  it('allows the request and warns when Redis is not available (null client)', async () => {
    // Setting the client to null causes getRedisClient() to create a new Redis
    // instance via the ioredis constructor. Make incr reject to simulate the
    // Redis being unreachable so the error-fallback path (allow + warn) runs.
    _setRedisClientForTesting(null);
    vi.mocked(mockRedisInstance.incr).mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await rateLimit(makeOptions({ limit: 3 }));

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Redis error'),
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });

  it('allows the request and warns when Redis throws during incr', async () => {
    vi.mocked(mockRedisInstance.incr).mockRejectedValue(new Error('ECONNRESET'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await rateLimit(makeOptions());

    expect(result.allowed).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Redis error'),
      expect.any(Error),
    );

    warnSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Key namespacing
  // -------------------------------------------------------------------------

  it('prefixes the Redis key with "rl:"', async () => {
    await rateLimit(makeOptions({ key: 'resend-verification:bob@vastu.dev' }));

    expect(mockRedisInstance.incr).toHaveBeenCalledWith('rl:resend-verification:bob@vastu.dev');
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('returns remaining: 0 when count equals limit', async () => {
    vi.mocked(mockRedisInstance.incr).mockResolvedValue(3);

    const result = await rateLimit(makeOptions({ limit: 3 }));

    expect(result.remaining).toBe(0);
  });

  it('returns a resetAt Date in the future', async () => {
    const before = Date.now();
    const result = await rateLimit(makeOptions({ windowSeconds: 60 }));

    expect(result.resetAt.getTime()).toBeGreaterThan(before);
  });
});

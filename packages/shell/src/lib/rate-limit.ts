/**
 * Redis-backed rate limiter for multi-instance deployments.
 *
 * Uses a fixed-window counter strategy:
 *   - On the first request in a window, INCR the key and set an EXPIRE.
 *   - On subsequent requests, INCR and check against the limit.
 *   - If Redis is unavailable, the request is allowed and a warning is logged
 *     so that a Redis outage does not take down the application.
 *
 * Usage:
 *   const result = await rateLimit({ key: `resend:${email}`, limit: 3, windowSeconds: 600 });
 *   if (!result.allowed) { return 429; }
 */

import Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Singleton Redis client
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null;
let redisConnectFailed = false;

function getRedisClient(): Redis | null {
  if (redisConnectFailed) {
    return null;
  }

  if (!redisClient) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

    redisClient = new Redis(url, {
      // Don't retry endlessly — surface failures fast.
      maxRetriesPerRequest: 1,
      // Suppress connection errors from propagating as uncaught exceptions.
      // We handle them in the catch block below.
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on('error', (err: unknown) => {
      console.warn('[rate-limit] Redis connection error — falling back to allow-all mode:', err);
      redisConnectFailed = true;
      redisClient = null;
    });

    redisClient.on('reconnecting', () => {
      redisConnectFailed = false;
    });
  }

  return redisClient;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Unique key identifying the rate limit bucket (e.g. `resend:alice@vastu.dev`). */
  key: string;
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Number of remaining requests in the current window. */
  remaining: number;
  /** Date at which the current window resets (approximate, based on TTL). */
  resetAt: Date;
}

// ---------------------------------------------------------------------------
// Core rate-limit function
// ---------------------------------------------------------------------------

/**
 * Check and increment the rate limit counter for the given key.
 *
 * Returns `{ allowed: true }` if the request is within the limit, or
 * `{ allowed: false }` if the limit has been exceeded.
 *
 * Gracefully falls back to `{ allowed: true }` if Redis is unavailable.
 */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = options;
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const resetAt = new Date(now + windowSeconds * 1000);

  const client = getRedisClient();

  if (!client) {
    // Redis unavailable — allow request and warn.
    console.warn(`[rate-limit] Redis unavailable; allowing request for key "${key}"`);
    return { allowed: true, remaining: limit, resetAt };
  }

  try {
    // INCR returns the new value after incrementing (creates key at 0 first if absent).
    const count = await client.incr(redisKey);

    if (count === 1) {
      // First request in this window — set the expiry.
      await client.expire(redisKey, windowSeconds);
    }

    if (count > limit) {
      // Fetch the actual TTL so we can give a precise resetAt.
      const ttl = await client.ttl(redisKey);
      const windowResetAt = ttl > 0 ? new Date(now + ttl * 1000) : resetAt;
      return { allowed: false, remaining: 0, resetAt: windowResetAt };
    }

    const remaining = Math.max(0, limit - count);
    return { allowed: true, remaining, resetAt };
  } catch (err) {
    // Transient Redis error — allow request rather than blocking users.
    console.warn(`[rate-limit] Redis error for key "${key}"; allowing request:`, err);
    return { allowed: true, remaining: limit, resetAt };
  }
}

// ---------------------------------------------------------------------------
// Exported for testing purposes only — allows tests to inject a mock client.
// ---------------------------------------------------------------------------

/** @internal — do not use outside of tests. */
export function _setRedisClientForTesting(client: Redis | null): void {
  redisClient = client;
  redisConnectFailed = false;
}

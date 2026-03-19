/**
 * Unit tests for packages/shell/src/middleware.ts
 *
 * Strategy: we cannot execute the real next-auth `auth()` wrapper in Vitest
 * (it requires a full Next.js request lifecycle). Instead we:
 *   1. Mock `./lib/auth` so `auth()` becomes a thin wrapper that calls the
 *      inner handler directly with a synthetic request object.
 *   2. Mock `next/server` so `NextResponse.next()` and
 *      `NextResponse.redirect()` return inspectable objects.
 *   3. Import the inner handler directly from middleware, bypassing the
 *      `auth()` wrapper, by re-exporting it from a test helper (see below).
 *
 * Because Next.js middleware wraps the handler via `auth(handler)`, we mock
 * `auth` to capture the handler and call it ourselves with controlled
 * req-like objects.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Types used to describe the minimal request shape the middleware depends on.
// ---------------------------------------------------------------------------

interface MockSession {
  user: { id: string };
}

interface MockRequest {
  nextUrl: { pathname: string };
  url: string;
  auth: MockSession | null;
}

// ---------------------------------------------------------------------------
// Capture the inner middleware handler when auth() is called.
// ---------------------------------------------------------------------------

type MiddlewareHandler = (req: MockRequest) => ReturnType<typeof vi.fn>;

let capturedHandler: MiddlewareHandler | null = null;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn((handler: MiddlewareHandler) => {
    capturedHandler = handler;
    // Return a function that mirrors next-auth's exported middleware shape;
    // not called in unit tests but satisfies the default export requirement.
    return handler;
  }),
}));

// ---------------------------------------------------------------------------
// Mock NextResponse so we can inspect what the middleware returns.
// ---------------------------------------------------------------------------

const mockNextFn = vi.fn(() => ({ type: 'next' }));
const mockRedirectFn = vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() }));

vi.mock('next/server', () => ({
  NextResponse: {
    next: mockNextFn,
    redirect: mockRedirectFn,
  },
}));

// ---------------------------------------------------------------------------
// Importing the middleware triggers the top-level `auth(handler)` call,
// which sets `capturedHandler`.
// ---------------------------------------------------------------------------

// Dynamic import used so mocks above are established first.
await import('../middleware');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequest(pathname: string, session: MockSession | null = null): MockRequest {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    auth: session,
  };
}

const fakeSession: MockSession = { user: { id: 'user-1' } };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('middleware — route protection', () => {
  beforeEach(() => {
    mockNextFn.mockClear();
    mockRedirectFn.mockClear();
  });

  // -------------------------------------------------------------------------
  // Ignored prefixes — middleware is a no-op
  // -------------------------------------------------------------------------

  describe('ignored routes', () => {
    it('passes through /api/auth/* without checking session', () => {
      const req = buildRequest('/api/auth/callback/keycloak', null);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('passes through /_next/* without checking session', () => {
      const req = buildRequest('/_next/data/abc.json', null);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('passes through /favicon.ico without checking session', () => {
      const req = buildRequest('/favicon.ico', null);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Public routes — accessible without a session
  // -------------------------------------------------------------------------

  describe('public routes — unauthenticated', () => {
    const publicPaths = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/sso',
      '/404',
      '/500',
    ];

    for (const path of publicPaths) {
      it(`allows unauthenticated access to ${path}`, () => {
        const req = buildRequest(path, null);
        capturedHandler!(req);
        expect(mockNextFn).toHaveBeenCalledTimes(1);
        expect(mockRedirectFn).not.toHaveBeenCalled();
      });
    }

    it('allows unauthenticated access to sub-paths of public routes', () => {
      const req = buildRequest('/reset-password/token-abc', null);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // /login redirect for authenticated users (AC-3 supporting behaviour)
  // -------------------------------------------------------------------------

  describe('/login — authenticated user', () => {
    it('redirects authenticated user on /login to /workspace', () => {
      const req = buildRequest('/login', fakeSession);
      capturedHandler!(req);
      expect(mockRedirectFn).toHaveBeenCalledTimes(1);
      const redirectUrl: string = mockRedirectFn.mock.calls[0][0].toString();
      expect(redirectUrl).toBe('http://localhost:3000/workspace');
      expect(mockNextFn).not.toHaveBeenCalled();
    });

    it('does not redirect authenticated user for other public routes', () => {
      const req = buildRequest('/register', fakeSession);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Protected routes — unauthenticated access (AC-1, AC-2)
  // -------------------------------------------------------------------------

  describe('protected routes — unauthenticated', () => {
    const protectedPaths = [
      '/workspace',
      '/settings/profile',
      '/settings/organization',
      '/admin/users',
      '/admin/audit-log',
      '/',
    ];

    for (const path of protectedPaths) {
      it(`redirects unauthenticated user from ${path} to /login with redirect param`, () => {
        const req = buildRequest(path, null);
        capturedHandler!(req);
        expect(mockRedirectFn).toHaveBeenCalledTimes(1);
        const redirectUrl = mockRedirectFn.mock.calls[0][0] as URL;
        expect(redirectUrl.pathname).toBe('/login');
        expect(redirectUrl.searchParams.get('redirect')).toBe(path);
        expect(mockNextFn).not.toHaveBeenCalled();
      });
    }
  });

  // -------------------------------------------------------------------------
  // Protected routes — authenticated access (AC-1)
  // -------------------------------------------------------------------------

  describe('protected routes — authenticated', () => {
    it('allows authenticated user to access /workspace', () => {
      const req = buildRequest('/workspace', fakeSession);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('allows authenticated user to access /settings/profile', () => {
      const req = buildRequest('/settings/profile', fakeSession);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('allows authenticated user to access /admin/users', () => {
      const req = buildRequest('/admin/users', fakeSession);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('treats /loginextra as a protected route (not a public route prefix match)', () => {
      // "/login" + "/" check means "/loginextra" is NOT treated as public.
      const req = buildRequest('/loginextra', null);
      capturedHandler!(req);
      expect(mockRedirectFn).toHaveBeenCalledTimes(1);
      const redirectUrl = mockRedirectFn.mock.calls[0][0] as URL;
      expect(redirectUrl.pathname).toBe('/login');
    });

    it('treats /sso/callback as a public sub-path', () => {
      const req = buildRequest('/sso/callback', null);
      capturedHandler!(req);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('redirect param encodes the original pathname correctly', () => {
      const req = buildRequest('/settings/api-keys', null);
      capturedHandler!(req);
      const redirectUrl = mockRedirectFn.mock.calls[0][0] as URL;
      expect(redirectUrl.searchParams.get('redirect')).toBe('/settings/api-keys');
    });
  });
});

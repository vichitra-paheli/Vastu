/**
 * Unit tests for packages/shell/src/middleware.ts
 *
 * The middleware checks for the presence of a session cookie (not a full DB
 * lookup) to gate protected routes. This keeps middleware Edge-compatible.
 *
 * We mock `next/server` so NextResponse.next() and NextResponse.redirect()
 * return inspectable objects, then call the middleware directly with a
 * synthetic NextRequest-like object.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
// Import the middleware (it's the default export, a plain function).
// ---------------------------------------------------------------------------

const { default: middleware } = await import('../middleware');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockCookie {
  name: string;
  value: string;
}

interface MockRequest {
  nextUrl: { pathname: string };
  url: string;
  cookies: {
    get: (name: string) => MockCookie | undefined;
  };
}

function buildRequest(pathname: string, hasSession: boolean): MockRequest {
  const cookies: MockCookie[] = hasSession
    ? [{ name: 'authjs.session-token', value: 'mock-token' }]
    : [];

  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      get: (name: string) => cookies.find((c) => c.name === name),
    },
  };
}

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
      middleware(buildRequest('/api/auth/callback/keycloak', false) as never);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('passes through /_next/* without checking session', () => {
      middleware(buildRequest('/_next/data/abc.json', false) as never);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('passes through /favicon.ico without checking session', () => {
      middleware(buildRequest('/favicon.ico', false) as never);
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
        middleware(buildRequest(path, false) as never);
        expect(mockNextFn).toHaveBeenCalledTimes(1);
        expect(mockRedirectFn).not.toHaveBeenCalled();
      });
    }

    it('allows unauthenticated access to sub-paths of public routes', () => {
      middleware(buildRequest('/reset-password/token-abc', false) as never);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // /login redirect for authenticated users (AC-3 supporting behaviour)
  // -------------------------------------------------------------------------

  describe('/login — authenticated user', () => {
    it('redirects authenticated user on /login to /workspace', () => {
      middleware(buildRequest('/login', true) as never);
      expect(mockRedirectFn).toHaveBeenCalledTimes(1);
      const redirectUrl: string = mockRedirectFn.mock.calls[0]![0].toString();
      expect(redirectUrl).toBe('http://localhost:3000/workspace');
      expect(mockNextFn).not.toHaveBeenCalled();
    });

    it('does not redirect authenticated user for other public routes', () => {
      middleware(buildRequest('/register', true) as never);
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
        middleware(buildRequest(path, false) as never);
        expect(mockRedirectFn).toHaveBeenCalledTimes(1);
        const redirectUrl = mockRedirectFn.mock.calls[0]![0] as URL;
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
      middleware(buildRequest('/workspace', true) as never);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('allows authenticated user to access /settings/profile', () => {
      middleware(buildRequest('/settings/profile', true) as never);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('allows authenticated user to access /admin/users', () => {
      middleware(buildRequest('/admin/users', true) as never);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('treats /loginextra as a protected route (not a public route prefix match)', () => {
      middleware(buildRequest('/loginextra', false) as never);
      expect(mockRedirectFn).toHaveBeenCalledTimes(1);
      const redirectUrl = mockRedirectFn.mock.calls[0]![0] as URL;
      expect(redirectUrl.pathname).toBe('/login');
    });

    it('treats /sso/callback as a public sub-path', () => {
      middleware(buildRequest('/sso/callback', false) as never);
      expect(mockNextFn).toHaveBeenCalledTimes(1);
      expect(mockRedirectFn).not.toHaveBeenCalled();
    });

    it('redirect param encodes the original pathname correctly', () => {
      middleware(buildRequest('/settings/api-keys', false) as never);
      const redirectUrl = mockRedirectFn.mock.calls[0]![0] as URL;
      expect(redirectUrl.searchParams.get('redirect')).toBe('/settings/api-keys');
    });
  });
});

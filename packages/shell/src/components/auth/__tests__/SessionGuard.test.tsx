import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { SessionGuard } from '../SessionGuard';

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn(() => '/settings');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

// Mock notifications
const mockShowWarning = vi.fn();
vi.mock('@/lib/notifications', () => ({
  showWarning: (...args: unknown[]) => mockShowWarning(...args),
}));

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  t: (key: string) => key,
}));

describe('SessionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/settings');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing visible', () => {
    const { container } = render(<SessionGuard />);
    expect(container.innerHTML).toBe('');
  });

  it('sets up an interval on mount (non-auth page)', () => {
    const spy = vi.spyOn(global, 'setInterval');
    render(<SessionGuard />);
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 60_000);
  });

  it('does not set up an interval on auth pages', () => {
    const spy = vi.spyOn(global, 'setInterval');
    mockPathname.mockReturnValue('/login');
    render(<SessionGuard />);
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears interval on unmount', () => {
    const spy = vi.spyOn(global, 'clearInterval');
    const { unmount } = render(<SessionGuard />);
    unmount();
    expect(spy).toHaveBeenCalled();
  });

  it('skips interval on all auth routes', () => {
    const spy = vi.spyOn(global, 'setInterval');
    for (const route of ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/sso', '/mfa']) {
      spy.mockClear();
      mockPathname.mockReturnValue(route);
      render(<SessionGuard />);
      expect(spy).not.toHaveBeenCalled();
    }
  });
});

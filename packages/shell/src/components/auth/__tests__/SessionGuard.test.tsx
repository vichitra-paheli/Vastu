import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { SessionGuard } from '../SessionGuard';

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

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
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    const { container } = render(<SessionGuard />);
    expect(container.innerHTML).toBe('');
  });

  it('does not redirect when session is authenticated', () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    render(<SessionGuard />);
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockShowWarning).not.toHaveBeenCalled();
  });

  it('redirects to login with expired=true when unauthenticated', () => {
    mockUseSession.mockReturnValue({ status: 'unauthenticated' });
    render(<SessionGuard />);
    expect(mockPush).toHaveBeenCalledWith('/login?expired=true');
    expect(mockShowWarning).toHaveBeenCalledWith('error.sessionExpired');
  });

  it('does not redirect when on login page', () => {
    mockPathname.mockReturnValue('/login');
    mockUseSession.mockReturnValue({ status: 'unauthenticated' });
    render(<SessionGuard />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not redirect when on register page', () => {
    mockPathname.mockReturnValue('/register');
    mockUseSession.mockReturnValue({ status: 'unauthenticated' });
    render(<SessionGuard />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not redirect when session is loading', () => {
    mockUseSession.mockReturnValue({ status: 'loading' });
    render(<SessionGuard />);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

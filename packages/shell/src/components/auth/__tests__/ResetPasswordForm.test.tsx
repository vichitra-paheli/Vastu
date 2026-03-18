/**
 * ResetPasswordForm tests — reset password form component.
 *
 * Tests cover:
 * - Rendering when no token is present (error state shown immediately)
 * - Rendering of form fields and navigation links when token is present
 * - Validation errors on blur (empty fields, mismatched passwords, short password)
 * - Success state after a successful API response
 * - Token error state after a 400 API response
 *
 * next/link and next/navigation are mocked because they require a
 * browser/Next.js runtime not available in Vitest's jsdom environment.
 * fetch is mocked to avoid real network calls.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ResetPasswordForm } from '../ResetPasswordForm';
import { TestProviders } from '../../../test-utils/providers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSearchParamsGet = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithToken(token: string | null = 'valid-token-abc123') {
  mockSearchParamsGet.mockImplementation((key: string) => (key === 'token' ? token : null));
  return render(<ResetPasswordForm />, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No token state ─────────────────────────────────────────────────────────

  it('shows an error alert immediately when no token is in the URL', () => {
    renderWithToken(null);
    // Should show the missing token error.
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the back to sign in link when token is missing', () => {
    renderWithToken(null);
    const link = screen.getByRole('link', { name: /back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  it('does not render the password form when token is missing', () => {
    renderWithToken(null);
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
  });

  // ── Rendering with token ───────────────────────────────────────────────────

  it('renders the page title when token is present', () => {
    renderWithToken();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the new password input field', () => {
    renderWithToken();
    // Use anchored pattern to avoid matching "Confirm new password *" as well.
    expect(screen.getByLabelText(/^new password \*/i)).toBeInTheDocument();
  });

  it('renders the confirm password input field', () => {
    renderWithToken();
    expect(screen.getByLabelText(/confirm new password \*/i)).toBeInTheDocument();
  });

  it('renders the reset password submit button', () => {
    renderWithToken();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('renders the back to sign in link pointing to /login', () => {
    renderWithToken();
    const link = screen.getByRole('link', { name: /back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('shows a validation error when password is blurred empty', async () => {
    renderWithToken();
    const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);

    fireEvent.focus(passwordInput);
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows a validation error when password is too short', async () => {
    renderWithToken();
    const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('shows a validation error when confirm password does not match', async () => {
    renderWithToken();
    const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat your new password/i);

    fireEvent.change(passwordInput, { target: { value: 'securepassword' } });
    fireEvent.blur(passwordInput);
    fireEvent.change(confirmInput, { target: { value: 'differentpassword' } });
    fireEvent.blur(confirmInput);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('does not show errors when passwords match and meet length requirement', async () => {
    renderWithToken();
    const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat your new password/i);

    fireEvent.change(passwordInput, { target: { value: 'securepassword' } });
    fireEvent.blur(passwordInput);
    fireEvent.change(confirmInput, { target: { value: 'securepassword' } });
    fireEvent.blur(confirmInput);

    await waitFor(() => {
      expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Password must be at least 8 characters'),
      ).not.toBeInTheDocument();
    });
  });

  // ── Success state ──────────────────────────────────────────────────────────

  it('shows a success message after a successful API response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    renderWithToken();

    const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat your new password/i);

    fireEvent.change(passwordInput, { target: { value: 'securepassword' } });
    fireEvent.change(confirmInput, { target: { value: 'securepassword' } });

    const submitButton = screen.getByRole('button', { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Mantine Alert always renders with role="alert" regardless of the role prop.
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // The form should no longer be visible.
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
  });

  // ── Token error state ──────────────────────────────────────────────────────

  it('shows a token error alert when the API returns 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid or expired reset token' }), { status: 400 }),
    );

    renderWithToken();

    const passwordInput = screen.getByPlaceholderText(/at least 8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/repeat your new password/i);

    fireEvent.change(passwordInput, { target: { value: 'securepassword' } });
    fireEvent.change(confirmInput, { target: { value: 'securepassword' } });

    const submitButton = screen.getByRole('button', { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

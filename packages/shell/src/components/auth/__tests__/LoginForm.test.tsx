/**
 * LoginForm tests — auth login form component.
 *
 * Tests cover:
 * - Rendering of form fields, buttons, and links
 * - Validation errors on blur (empty fields, invalid email format)
 *
 * next-auth/react and next/navigation are mocked because they require
 * a browser/Next.js runtime that is not available in Vitest's jsdom environment.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoginForm } from '../LoginForm';
import { TestProviders } from '@/test-utils/providers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next-auth/react — signIn is used in the form's submit and SSO handlers.
vi.mock('next-auth/react', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true, error: null }),
}));

// Mock next/navigation — useSearchParams is used to read ?redirect and ?expired params.
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock next/link — Link renders as a plain anchor in test env.
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderComponent() {
  return render(<LoginForm />, { wrapper: TestProviders });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the email input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument();
  });

  it('renders the password input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/password \*/i)).toBeInTheDocument();
  });

  it('renders the sign in submit button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument();
  });

  it('renders the SSO sign in button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /sign in with sso/i })).toBeInTheDocument();
  });

  it('renders the forgot password link pointing to /forgot-password', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  it('renders the create account link pointing to /register', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /create one/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('renders the "or" divider between sign in and SSO buttons', () => {
    renderComponent();
    expect(screen.getByText('or')).toBeInTheDocument();
  });

  // ── Validation — email field ───────────────────────────────────────────────

  it('shows a validation error when email field is blurred empty', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email \*/i);

    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('shows a validation error when email has an invalid format', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email \*/i);

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    });
  });

  it('does not show an email error when a valid email is entered', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email \*/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    });
  });

  // ── Validation — password field ────────────────────────────────────────────

  it('shows a validation error when password field is blurred empty', async () => {
    renderComponent();
    // Mantine's PasswordInput renders the visible input without a direct label association.
    // Query by placeholder to locate the password input.
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    fireEvent.focus(passwordInput);
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('does not show a password error when a value is entered', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    fireEvent.change(passwordInput, { target: { value: 'secret' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
    });
  });
});

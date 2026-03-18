/**
 * SsoForm tests — SSO provider lookup form component.
 *
 * Tests cover:
 * - Rendering of form fields, button, and back link
 * - Email validation on blur (empty, invalid format, valid)
 * - Provider lookup: no providers found → error state
 * - Provider lookup: multiple providers → selection list with protocol badges
 * - Provider lookup: single provider → triggers signIn (auto-redirect)
 * - Network/API error → generic error alert
 *
 * next-auth/react, next/navigation, and next/link are mocked because they
 * require a browser/Next.js runtime not available in Vitest's jsdom environment.
 * fetch is mocked globally for each test.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SsoForm } from '../SsoForm';
import { TestProviders } from '../../../test-utils/providers';
import type { SsoProvidersResponse } from '../../../types/sso';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignIn = vi.fn().mockResolvedValue(undefined);

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
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

function renderComponent() {
  return render(<SsoForm />, { wrapper: TestProviders });
}

function mockFetchResponse(body: SsoProvidersResponse, status = 200) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function mockFetchError() {
  global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
}

async function fillAndSubmitEmail(email: string) {
  const emailInput = screen.getByLabelText(/work email \*/i);
  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.blur(emailInput);

  const submitButton = screen.getByRole('button', { name: /continue/i });
  fireEvent.click(submitButton);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SsoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the page title', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /single sign-on/i })).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderComponent();
    expect(
      screen.getByText(/enter your work email to find your sso provider/i),
    ).toBeInTheDocument();
  });

  it('renders the work email input field', () => {
    renderComponent();
    expect(screen.getByLabelText(/work email \*/i)).toBeInTheDocument();
  });

  it('renders the Continue submit button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('renders the Back to sign in link pointing to /login', () => {
    renderComponent();
    const link = screen.getByRole('link', { name: /back to sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });

  // ── Email validation ───────────────────────────────────────────────────────

  it('shows a validation error when email field is blurred empty', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/work email \*/i);

    fireEvent.focus(emailInput);
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('shows a validation error when email has an invalid format', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/work email \*/i);

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    });
  });

  it('does not show a validation error for a valid email', async () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/work email \*/i);

    fireEvent.change(emailInput, { target: { value: 'user@company.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    });
  });

  // ── No providers ───────────────────────────────────────────────────────────

  it('shows a no-providers error when the API returns an empty array', async () => {
    mockFetchResponse({ providers: [] });
    renderComponent();

    await fillAndSubmitEmail('user@unknowndomain.com');

    await waitFor(() => {
      expect(
        screen.getByText(/no sso provider found for this email domain/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/contact your administrator or sign in with email and password/i),
    ).toBeInTheDocument();
  });

  // ── Multiple providers ─────────────────────────────────────────────────────

  it('shows a provider selection list when multiple providers are returned', async () => {
    mockFetchResponse({
      providers: [
        { id: 'p1', name: 'Okta SAML', protocol: 'SAML', keycloakAlias: 'okta-saml' },
        { id: 'p2', name: 'Azure OIDC', protocol: 'OIDC', keycloakAlias: 'azure-oidc' },
      ],
    });
    renderComponent();

    await fillAndSubmitEmail('user@company.com');

    await waitFor(() => {
      expect(screen.getByText('Okta SAML')).toBeInTheDocument();
      expect(screen.getByText('Azure OIDC')).toBeInTheDocument();
    });
  });

  it('renders SAML and OIDC protocol badges when multiple providers are returned', async () => {
    mockFetchResponse({
      providers: [
        { id: 'p1', name: 'Okta SAML', protocol: 'SAML', keycloakAlias: 'okta-saml' },
        { id: 'p2', name: 'Azure OIDC', protocol: 'OIDC', keycloakAlias: 'azure-oidc' },
      ],
    });
    renderComponent();

    await fillAndSubmitEmail('user@company.com');

    await waitFor(() => {
      expect(screen.getByText('SAML')).toBeInTheDocument();
      expect(screen.getByText('OIDC')).toBeInTheDocument();
    });
  });

  it('calls signIn with the correct keycloakAlias when a provider is selected', async () => {
    mockFetchResponse({
      providers: [
        { id: 'p1', name: 'Okta SAML', protocol: 'SAML', keycloakAlias: 'okta-saml' },
        { id: 'p2', name: 'Azure OIDC', protocol: 'OIDC', keycloakAlias: 'azure-oidc' },
      ],
    });
    renderComponent();

    await fillAndSubmitEmail('user@company.com');

    await waitFor(() => {
      expect(screen.getByText('Okta SAML')).toBeInTheDocument();
    });

    const oktaButton = screen.getByRole('button', { name: /sign in with okta saml/i });
    fireEvent.click(oktaButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'keycloak',
        expect.objectContaining({ kc_idp_hint: 'okta-saml' }),
      );
    });
  });

  // ── Single provider auto-redirect ──────────────────────────────────────────

  it('calls signIn immediately when a single provider is returned (auto-redirect)', async () => {
    mockFetchResponse({
      providers: [{ id: 'p1', name: 'Okta SAML', protocol: 'SAML', keycloakAlias: 'okta-saml' }],
    });
    renderComponent();

    await fillAndSubmitEmail('user@company.com');

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'keycloak',
        expect.objectContaining({ kc_idp_hint: 'okta-saml' }),
      );
    });
    // Provider list should NOT appear for single provider
    expect(screen.queryByText(/select your identity provider/i)).not.toBeInTheDocument();
  });

  // ── API / network error ────────────────────────────────────────────────────

  it('shows a generic error alert when the fetch throws a network error', async () => {
    mockFetchError();
    renderComponent();

    await fillAndSubmitEmail('user@company.com');

    await waitFor(() => {
      expect(
        screen.getByText(/failed to look up sso providers. please try again/i),
      ).toBeInTheDocument();
    });
  });

  it('shows a generic error alert when the API returns a non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    } as Response);

    renderComponent();

    await fillAndSubmitEmail('user@company.com');

    await waitFor(() => {
      expect(
        screen.getByText(/failed to look up sso providers. please try again/i),
      ).toBeInTheDocument();
    });
  });
});

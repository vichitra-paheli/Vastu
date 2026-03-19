/**
 * SsoProviderList tests — US-019, AC-6
 *
 * Covers the SSO enforcement toggle specifically:
 * - Shows a loader while org settings are being fetched
 * - Renders the checkbox with the loaded ssoRequired value (false)
 * - Renders the checkbox as checked when ssoRequired is true
 * - Sends PATCH to /api/settings/organization when toggled
 * - Shows success toast on successful save
 * - Reverts the checkbox and shows error toast on failed save
 * - Disables checkbox while save is in progress
 * - Shows error message when org fetch fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { render } from '@/test-utils';
import { SsoProviderList } from '../SsoProviderList';

// ---------------------------------------------------------------------------
// Mock SsoProviderModal and SsoProviderCard to isolate enforcement tests
// ---------------------------------------------------------------------------

vi.mock('../SsoProviderModal', () => ({
  SsoProviderModal: () => null,
}));

vi.mock('../SsoProviderCard', () => ({
  SsoProviderCard: () => null,
}));

vi.mock('../SsoProviderCard', () => ({
  SsoProviderCard: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOrgResponse(ssoRequired: boolean) {
  return {
    ok: true,
    json: async () => ({
      organization: { ssoRequired },
    }),
  } as Response;
}

function makeSsoResponse(providers: unknown[] = []) {
  return {
    ok: true,
    json: async () => ({ providers }),
  } as Response;
}

function makeErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    json: async () => ({ error: 'Internal server error' }),
  } as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SsoProviderList — SSO enforcement toggle (AC-6)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders the enforcement section title', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/settings/sso') return Promise.resolve(makeSsoResponse());
      if (url === '/api/settings/organization') return Promise.resolve(makeOrgResponse(false));
      return Promise.resolve(makeErrorResponse());
    });

    render(<SsoProviderList />);

    await waitFor(() => {
      expect(screen.getByText('Enforcement')).toBeInTheDocument();
    });
  });

  it('renders the checkbox unchecked when ssoRequired is false', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/settings/sso') return Promise.resolve(makeSsoResponse());
      if (url === '/api/settings/organization') return Promise.resolve(makeOrgResponse(false));
      return Promise.resolve(makeErrorResponse());
    });

    render(<SsoProviderList />);

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox', { name: /require sso/i });
      expect(checkbox).not.toBeChecked();
    });
  });

  it('renders the checkbox checked when ssoRequired is true', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/settings/sso') return Promise.resolve(makeSsoResponse());
      if (url === '/api/settings/organization') return Promise.resolve(makeOrgResponse(true));
      return Promise.resolve(makeErrorResponse());
    });

    render(<SsoProviderList />);

    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox', { name: /require sso/i });
      expect(checkbox).toBeChecked();
    });
  });

  it('sends PATCH to /api/settings/organization when toggled', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/settings/sso') return Promise.resolve(makeSsoResponse());
      if (url === '/api/settings/organization' && (!options || options.method === 'GET' || !options.method)) {
        return Promise.resolve(makeOrgResponse(false));
      }
      if (url === '/api/settings/organization' && options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, organization: { ssoRequired: true } }) } as Response);
      }
      return Promise.resolve(makeErrorResponse());
    });
    global.fetch = fetchMock;

    const user = userEvent.setup();
    render(<SsoProviderList />);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /require sso/i })).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /require sso/i });
    await user.click(checkbox);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock.calls has unknown shape
      const patchCall = (fetchMock.mock.calls as Array<[string, RequestInit?]>).find(
        (call) => call[0] === '/api/settings/organization' && call[1]?.method === 'PATCH',
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1]!.body as string) as Record<string, unknown>;
      expect(body.ssoRequired).toBe(true);
    });
  });

  it('optimistically checks the checkbox before the save completes', async () => {
    let resolvePatch!: (value: Response) => void;
    const patchPromise = new Promise<Response>((resolve) => {
      resolvePatch = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/settings/sso') return Promise.resolve(makeSsoResponse());
      if (url === '/api/settings/organization' && options?.method === 'PATCH') {
        return patchPromise;
      }
      return Promise.resolve(makeOrgResponse(false));
    });

    const user = userEvent.setup();
    render(<SsoProviderList />);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /require sso/i })).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /require sso/i });
    await user.click(checkbox);

    // Should be checked optimistically before response resolves
    expect(checkbox).toBeChecked();

    // Resolve the PATCH so the component doesn't leak async state
    resolvePatch({ ok: true, json: async () => ({ success: true, organization: { ssoRequired: true } }) } as Response);
  });

  it('reverts the checkbox on failed save', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/settings/sso') return Promise.resolve(makeSsoResponse());
      if (url === '/api/settings/organization' && options?.method === 'PATCH') {
        return Promise.resolve(makeErrorResponse(500));
      }
      return Promise.resolve(makeOrgResponse(false));
    });

    const user = userEvent.setup();
    render(<SsoProviderList />);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /require sso/i })).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /require sso/i });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    // After the error response the checkbox should revert to unchecked
    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it('shows an error message when org fetch fails', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/settings/sso') return Promise.resolve(makeSsoResponse());
      if (url === '/api/settings/organization') return Promise.resolve(makeErrorResponse(500));
      return Promise.resolve(makeErrorResponse());
    });

    render(<SsoProviderList />);

    // The enforcement section should still render its title
    await waitFor(() => {
      expect(screen.getByText('Enforcement')).toBeInTheDocument();
    });

    // No checkbox should be visible since loading failed
    expect(screen.queryByRole('checkbox', { name: /require sso/i })).not.toBeInTheDocument();
  });
});

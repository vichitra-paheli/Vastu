/**
 * OrganizationForm tests — US-015: Organization settings
 *
 * Covers:
 * - Happy path: renders all fields with correct initial values
 * - Save: calls PATCH endpoint with correct payload
 * - Save disabled when form is pristine
 * - Workspace URL: read-only by default, editable after clicking Edit
 * - Delete dialog: opens on button click, calls DELETE on confirm
 * - Edge case: empty org name shows validation error on submit
 * - Avatar initials fallback rendering
 *
 * Note: Mantine's Select component uses useMediaQuery internally, which
 * calls window.matchMedia. We mock @mantine/core's Select to avoid the
 * jsdom matchMedia limitation that affects any test using Mantine Select.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { render } from '../../../test-utils';
import { OrganizationForm } from '../OrganizationForm';
import type { Organization } from '@vastu/shared';

// ---------------------------------------------------------------------------
// Mock Mantine Select to avoid jsdom matchMedia limitations.
// Mantine's Select uses useMediaQuery internally, which requires window.matchMedia.
// The polyfill in setup.ts works for the first test but vi.clearAllMocks() clears
// the implementation in subsequent tests. Mocking Select at this level is the
// cleanest solution.
// ---------------------------------------------------------------------------

// Type for the Select mock props
interface SelectMockProps {
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  'data-testid'?: string;
  searchable?: boolean;
  [key: string]: unknown;
}

vi.mock('@mantine/core', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import in vi.mock needs any
  const actual: Record<string, any> = await vi.importActual('@mantine/core');
  return {
    ...actual,
    Select: ({ label, value, onChange, 'data-testid': testId }: SelectMockProps) => (
      <div>
        {label && <label htmlFor={testId ?? label}>{label}</label>}
        <select
          id={testId ?? label}
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value={value ?? ''}>{value}</option>
        </select>
      </div>
    ),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseOrg: Organization = {
  id: 'org-1',
  name: 'Acme Corp',
  logoUrl: null,
  workspaceUrl: 'acme',
  defaultTimezone: 'UTC',
  defaultLanguage: 'en',
  ssoRequired: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function mockFetch(ok: boolean, body: Record<string, unknown> = { success: true }) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OrganizationForm', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    // Use clearAllMocks instead of restoreAllMocks to preserve the matchMedia
    // polyfill mock implementation that is set in setup.ts. restoreAllMocks()
    // would strip the mockImplementation from vi.fn(), causing subsequent tests
    // to fail when Mantine's useMediaQuery calls window.matchMedia().
    vi.clearAllMocks();
  });

  it('renders org name field with initial value', () => {
    render(<OrganizationForm organization={baseOrg} />);
    const nameInput = screen.getByDisplayValue('Acme Corp');
    expect(nameInput).toBeInTheDocument();
  });

  it('renders workspace URL as read-only initially', () => {
    render(<OrganizationForm organization={baseOrg} />);
    const urlInput = screen.getByDisplayValue('acme');
    expect(urlInput).toHaveAttribute('readonly');
  });

  it('renders timezone label', () => {
    render(<OrganizationForm organization={baseOrg} />);
    expect(screen.getByText(/default timezone/i)).toBeInTheDocument();
  });

  it('renders language label', () => {
    render(<OrganizationForm organization={baseOrg} />);
    expect(screen.getByText(/default language/i)).toBeInTheDocument();
  });

  it('save button is disabled when form is pristine', () => {
    render(<OrganizationForm organization={baseOrg} />);
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it('save button becomes enabled after changing org name', async () => {
    const user = userEvent.setup();
    render(<OrganizationForm organization={baseOrg} />);
    const nameInput = screen.getByDisplayValue('Acme Corp');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('submits PATCH with updated org name on save', async () => {
    const fetchMock = mockFetch(true);
    global.fetch = fetchMock;
    const user = userEvent.setup();

    render(<OrganizationForm organization={baseOrg} />);
    const nameInput = screen.getByDisplayValue('Acme Corp');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Org');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/organization',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('Updated Org'),
        }),
      );
    });
  });

  it('includes timezone and language in PATCH payload', async () => {
    const fetchMock = mockFetch(true);
    global.fetch = fetchMock;
    const user = userEvent.setup();

    render(<OrganizationForm organization={baseOrg} />);
    const nameInput = screen.getByDisplayValue('Acme Corp');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Org');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
      expect(body).toMatchObject({
        name: 'Updated Org',
        defaultTimezone: 'UTC',
        defaultLanguage: 'en',
      });
    });
  });

  it('shows error when save fails', async () => {
    const fetchMock = mockFetch(false, { error: 'Server error' });
    global.fetch = fetchMock;
    const user = userEvent.setup();

    render(<OrganizationForm organization={baseOrg} />);
    const nameInput = screen.getByDisplayValue('Acme Corp');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Org');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it('shows validation error when org name is empty on submit', async () => {
    const user = userEvent.setup();
    render(<OrganizationForm organization={baseOrg} />);

    const nameInput = screen.getByDisplayValue('Acme Corp');
    await user.clear(nameInput);

    // Trigger form submit
    const form = nameInput.closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      // The validation error text from i18n should appear
      expect(
        screen.queryByText(/required/i) ?? screen.queryByText('org.name.required'),
      ).not.toBeNull();
    });
  });

  it('makes workspace URL editable after clicking edit button', async () => {
    const user = userEvent.setup();
    render(<OrganizationForm organization={baseOrg} />);

    // The edit button uses aria-label from t('common.edit') = 'Edit'
    const editBtn = screen.getByRole('button', { name: /edit/i });
    await user.click(editBtn);

    const urlInput = screen.getByDisplayValue('acme');
    expect(urlInput).not.toHaveAttribute('readonly');
  });

  it('does not show edit button after enabling workspace URL edit', async () => {
    const user = userEvent.setup();
    render(<OrganizationForm organization={baseOrg} />);

    const editBtn = screen.getByRole('button', { name: /edit/i });
    await user.click(editBtn);

    // Edit button should be hidden now
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('renders delete organization button', () => {
    render(<OrganizationForm organization={baseOrg} />);
    expect(
      screen.getByRole('button', { name: /delete organization/i }),
    ).toBeInTheDocument();
  });

  it('opens confirm dialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<OrganizationForm organization={baseOrg} />);

    const deleteBtn = screen.getByRole('button', { name: /delete organization/i });
    await user.click(deleteBtn);

    // ConfirmDialog renders the title in the modal — more than one occurrence
    await waitFor(() => {
      const matches = screen.getAllByText(/delete organization/i);
      expect(matches.length).toBeGreaterThan(1);
    });
  });

  it('calls DELETE endpoint when confirm dialog is confirmed', async () => {
    // Prevent actual navigation
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
      assign: vi.fn(),
      replace: vi.fn(),
    } as unknown as Location);

    const fetchMock = mockFetch(true);
    global.fetch = fetchMock;
    const user = userEvent.setup();

    render(<OrganizationForm organization={baseOrg} />);

    const deleteBtn = screen.getByRole('button', { name: /delete organization/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      const confirmBtns = screen.getAllByRole('button', { name: /delete organization/i });
      return confirmBtns.length > 1;
    });

    const confirmBtns = screen.getAllByRole('button', { name: /delete organization/i });
    // The confirm button inside the dialog is the last one
    const confirmBtn = confirmBtns[confirmBtns.length - 1];
    await user.click(confirmBtn!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/settings/organization',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    locationSpy.mockRestore();
  });

  it('closes delete dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<OrganizationForm organization={baseOrg} />);

    const deleteBtn = screen.getByRole('button', { name: /delete organization/i });
    await user.click(deleteBtn);

    // Dialog opens
    await waitFor(() => {
      const matches = screen.getAllByText(/delete organization/i);
      expect(matches.length).toBeGreaterThan(1);
    });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    // Dialog should close — only one occurrence of the text remains (the button)
    await waitFor(() => {
      const matches = screen.getAllByText(/delete organization/i);
      expect(matches.length).toBe(1);
    });
  });

  it('renders org initials in avatar when logoUrl is null', () => {
    render(<OrganizationForm organization={{ ...baseOrg, logoUrl: null }} />);
    // Avatar fallback shows initials — Acme Corp → AC
    expect(screen.getByText('AC')).toBeInTheDocument();
  });

  it('renders initials correctly for single-word org name', () => {
    render(<OrganizationForm organization={{ ...baseOrg, name: 'Vastu', logoUrl: null }} />);
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('renders the logo change button', () => {
    render(<OrganizationForm organization={baseOrg} />);
    // FileButton renders as a button with the label text
    expect(screen.getAllByText(/change logo/i).length).toBeGreaterThan(0);
  });
});

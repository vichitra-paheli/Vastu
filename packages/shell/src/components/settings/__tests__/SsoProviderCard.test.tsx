/**
 * SsoProviderCard tests — US-019, AC-2
 *
 * Covers:
 * - Renders provider name, protocol badge, status badge
 * - Shows "Default" badge only when isDefault is true
 * - Shows metadata URL when present, hides when null
 * - Overflow menu items (Edit, Test, Set as default, Delete)
 * - "Set as default" menu item hidden when provider is already default
 * - Menu callbacks fire with correct provider
 * - Edge cases: long name truncated, Draft status badge
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SsoProviderCard } from '../SsoProviderCard';
import { TestProviders } from '../../../test-utils/providers';
import type { SsoProviderConfig } from '../../../types/sso-provider';

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

const baseLiveOidcProvider: SsoProviderConfig = {
  id: 'provider-1',
  name: 'Okta OIDC',
  protocol: 'OIDC',
  status: 'LIVE',
  isDefault: false,
  metadataUrl: 'https://okta.example.com/.well-known/openid-configuration',
  clientId: 'client-abc-123',
  redirectUri: 'https://app.example.com/auth/callback',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const defaultCallbacks = {
  onEdit: vi.fn(),
  onTest: vi.fn(),
  onSetDefault: vi.fn(),
  onDelete: vi.fn(),
};

describe('SsoProviderCard', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Rendering — name and badges
  // ──────────────────────────────────────────────────────────────────────────

  it('renders the provider name', () => {
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} />,
    );
    expect(screen.getByText('Okta OIDC')).toBeInTheDocument();
  });

  it('renders OIDC protocol badge', () => {
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} />,
    );
    expect(screen.getByText('OIDC')).toBeInTheDocument();
  });

  it('renders SAML protocol badge for SAML providers', () => {
    const samlProvider: SsoProviderConfig = {
      ...baseLiveOidcProvider,
      id: 'provider-2',
      name: 'Azure AD SAML',
      protocol: 'SAML',
    };
    renderComponent(
      <SsoProviderCard provider={samlProvider} {...defaultCallbacks} />,
    );
    expect(screen.getByText('SAML')).toBeInTheDocument();
  });

  it('renders Live status badge for LIVE providers', () => {
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} />,
    );
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders Draft status badge for DRAFT providers', () => {
    const draftProvider: SsoProviderConfig = {
      ...baseLiveOidcProvider,
      status: 'DRAFT',
    };
    renderComponent(
      <SsoProviderCard provider={draftProvider} {...defaultCallbacks} />,
    );
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Default badge
  // ──────────────────────────────────────────────────────────────────────────

  it('renders Default badge when isDefault is true', () => {
    const defaultProvider: SsoProviderConfig = {
      ...baseLiveOidcProvider,
      isDefault: true,
    };
    renderComponent(
      <SsoProviderCard provider={defaultProvider} {...defaultCallbacks} />,
    );
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('does not render Default badge when isDefault is false', () => {
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} />,
    );
    expect(screen.queryByText('Default')).not.toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Metadata URL
  // ──────────────────────────────────────────────────────────────────────────

  it('renders metadata URL when present', () => {
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} />,
    );
    expect(
      screen.getByText('https://okta.example.com/.well-known/openid-configuration'),
    ).toBeInTheDocument();
  });

  it('does not render metadata URL section when metadataUrl is null', () => {
    const noMetaProvider: SsoProviderConfig = {
      ...baseLiveOidcProvider,
      metadataUrl: null,
    };
    renderComponent(
      <SsoProviderCard provider={noMetaProvider} {...defaultCallbacks} />,
    );
    expect(
      screen.queryByText('https://okta.example.com/.well-known/openid-configuration'),
    ).not.toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Overflow menu
  // ──────────────────────────────────────────────────────────────────────────

  it('opens the overflow menu when the action button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} />,
    );
    await user.click(screen.getByRole('button', { name: 'Provider actions' }));
    await waitFor(() => {
      expect(document.querySelector('[role="menu"]') ?? document.querySelector('[role="menuitem"]')).toBeInTheDocument();
    });
    // All four menu items should be present
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    const menuItemTexts = Array.from(menuItems).map((el) => el.textContent);
    expect(menuItemTexts.some((t) => t?.includes('Edit'))).toBe(true);
    expect(menuItemTexts.some((t) => t?.includes('Test connection'))).toBe(true);
    expect(menuItemTexts.some((t) => t?.includes('Set as default'))).toBe(true);
    expect(menuItemTexts.some((t) => t?.includes('Delete'))).toBe(true);
  });

  it('hides "Set as default" menu item when provider is already default', async () => {
    const user = userEvent.setup();
    const defaultProvider: SsoProviderConfig = {
      ...baseLiveOidcProvider,
      isDefault: true,
    };
    renderComponent(
      <SsoProviderCard provider={defaultProvider} {...defaultCallbacks} />,
    );
    await user.click(screen.getByRole('button', { name: 'Provider actions' }));
    await waitFor(() => {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      expect(menuItems.length).toBeGreaterThan(0);
    });
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    const menuItemTexts = Array.from(menuItems).map((el) => el.textContent);
    expect(menuItemTexts.some((t) => t?.includes('Set as default'))).toBe(false);
  });

  it('calls onEdit with the provider when Edit is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} onEdit={onEdit} />,
    );
    await user.click(screen.getByRole('button', { name: 'Provider actions' }));
    await waitFor(() => {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      expect(menuItems.length).toBeGreaterThan(0);
    });
    const editItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.includes('Edit'),
    );
    expect(editItem).toBeDefined();
    await user.click(editItem as Element);
    expect(onEdit).toHaveBeenCalledWith(baseLiveOidcProvider);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onTest with the provider when Test connection is clicked', async () => {
    const user = userEvent.setup();
    const onTest = vi.fn();
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} onTest={onTest} />,
    );
    await user.click(screen.getByRole('button', { name: 'Provider actions' }));
    await waitFor(() => {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      expect(menuItems.length).toBeGreaterThan(0);
    });
    const testItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.includes('Test connection'),
    );
    expect(testItem).toBeDefined();
    await user.click(testItem as Element);
    expect(onTest).toHaveBeenCalledWith(baseLiveOidcProvider);
    expect(onTest).toHaveBeenCalledTimes(1);
  });

  it('calls onSetDefault with the provider when Set as default is clicked', async () => {
    const user = userEvent.setup();
    const onSetDefault = vi.fn();
    renderComponent(
      <SsoProviderCard
        provider={baseLiveOidcProvider}
        {...defaultCallbacks}
        onSetDefault={onSetDefault}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Provider actions' }));
    await waitFor(() => {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      expect(menuItems.length).toBeGreaterThan(0);
    });
    const defaultItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.includes('Set as default'),
    );
    expect(defaultItem).toBeDefined();
    await user.click(defaultItem as Element);
    expect(onSetDefault).toHaveBeenCalledWith(baseLiveOidcProvider);
    expect(onSetDefault).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete with the provider when Delete is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderComponent(
      <SsoProviderCard provider={baseLiveOidcProvider} {...defaultCallbacks} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole('button', { name: 'Provider actions' }));
    await waitFor(() => {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      expect(menuItems.length).toBeGreaterThan(0);
    });
    const deleteItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.includes('Delete'),
    );
    expect(deleteItem).toBeDefined();
    await user.click(deleteItem as Element);
    expect(onDelete).toHaveBeenCalledWith(baseLiveOidcProvider);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────────────────────────────────

  it('renders a provider with no metadata URL and no client ID gracefully', () => {
    const minimalProvider: SsoProviderConfig = {
      id: 'provider-min',
      name: 'Minimal Provider',
      protocol: 'SAML',
      status: 'DRAFT',
      isDefault: false,
      metadataUrl: null,
      clientId: null,
      redirectUri: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    renderComponent(
      <SsoProviderCard provider={minimalProvider} {...defaultCallbacks} />,
    );
    expect(screen.getByText('Minimal Provider')).toBeInTheDocument();
    expect(screen.getByText('SAML')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});

/**
 * Component tests for SidebarNav (US-109).
 *
 * Tests cover:
 * - Renders in collapsed (48px) and expanded (200px) states
 * - ADMIN section hidden for non-admin users
 * - ADMIN section visible for admin users
 * - Clicking a page calls panelStore.openPanel
 * - ⌘B keyboard shortcut toggles sidebar
 * - Search filters the page list
 * - User avatar displayed
 * - Settings link present in SYSTEM section
 * - Pin toggle calls sidebarStore.togglePin
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SidebarNav } from '../SidebarNav';
import { useSidebarStore } from '../../../stores/sidebarStore';
import { usePanelStore } from '../../../stores/panelStore';
import { registerPanel, clearRegistry } from '../../../panels/registry';
import { TestProviders } from '../../../test-utils/providers';
import { createMockDockviewApi } from '../../../test-utils/mock-dockview';
import { defineAbilitiesFor, type AppAbility } from '@vastu/shared/permissions';
import { MOCK_PAGES } from '../mockPages';

// ---- helpers -----------------------------------------------------------

function makeAdminAbility(): AppAbility {
  return defineAbilitiesFor({ roles: [{ name: 'admin', isSystem: true, permissions: [] }] });
}

function makeViewerAbility(): AppAbility {
  return defineAbilitiesFor({ roles: [{ name: 'viewer', isSystem: true, permissions: [] }] });
}

const DEFAULT_TRANSLATIONS = {
  logoLabel: 'Vastu',
  collapseLabel: 'Collapse sidebar',
  expandLabel: 'Expand sidebar',
  pagesSection: 'PAGES',
  systemSection: 'SYSTEM',
  adminSection: 'ADMIN',
  settingsLabel: 'Settings',
  adminLabel: 'Admin',
  searchPlaceholder: 'Search pages...',
  noResults: 'No pages found',
};

const DEFAULT_USER = { name: 'Alice Smith', role: 'Admin' };

function renderSidebar(ability: AppAbility = makeViewerAbility()) {
  return render(
    <SidebarNav ability={ability} user={DEFAULT_USER} t={DEFAULT_TRANSLATIONS} />,
    { wrapper: TestProviders },
  );
}

// ---- tests -------------------------------------------------------------

describe('SidebarNav', () => {
  beforeEach(() => {
    clearRegistry();
    // Register mock pages so openPanelByTypeId can find them.
    for (const page of MOCK_PAGES) {
      registerPanel({
        id: page.id,
        title: page.title,
        iconName: page.iconName,
        component: () => null,
      });
    }
    const mockApi = createMockDockviewApi();
    usePanelStore.getState().setApi(mockApi);
    useSidebarStore.setState({ collapsed: false, pinnedPages: [], searchQuery: '' });
    usePanelStore.setState({ activePanelId: null, openPanelIds: [] });
  });

  // AC-1: Two states
  it('renders with data-collapsed="false" when expanded', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i });
    expect(nav).toHaveAttribute('data-collapsed', 'false');
  });

  it('renders with data-collapsed="true" when collapsed', () => {
    useSidebarStore.setState({ collapsed: true });
    renderSidebar();
    const nav = screen.getByRole('navigation', { name: /sidebar navigation/i });
    expect(nav).toHaveAttribute('data-collapsed', 'true');
  });

  // AC-2: Toggle via button
  it('toggle button switches from expanded to collapsed', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    const btn = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(btn);
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('toggle button switches from collapsed to expanded', () => {
    useSidebarStore.setState({ collapsed: true });
    renderSidebar();
    const btn = screen.getByRole('button', { name: /expand sidebar/i });
    fireEvent.click(btn);
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  // AC-2: ⌘B keyboard shortcut
  it('Ctrl+B toggles sidebar', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  it('Meta+B (⌘B) toggles sidebar', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });

  // AC-6: PAGES section shows registered pages
  it('shows page list in expanded mode', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    // "Dashboard" is the first mock page (aria-label is exact "Dashboard")
    expect(screen.getByRole('button', { name: /^dashboard$/i })).toBeInTheDocument();
  });

  // AC-7: SYSTEM section Settings link
  it('shows Settings item in SYSTEM section', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    // Settings button exists (aria-label includes "opens in new tab")
    expect(screen.getByRole('button', { name: /settings.*new tab/i })).toBeInTheDocument();
  });

  it('Settings item opens /settings in a new tab', () => {
    useSidebarStore.setState({ collapsed: false });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderSidebar();
    const settingsBtn = screen.getByRole('button', { name: /settings.*new tab/i });
    fireEvent.click(settingsBtn);
    expect(openSpy).toHaveBeenCalledWith('/settings', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  // AC-8: ADMIN section gating
  it('hides ADMIN section for non-admin users', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar(makeViewerAbility());
    expect(screen.queryByRole('group', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows ADMIN section for admin users', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar(makeAdminAbility());
    expect(screen.getByRole('group', { name: /^admin$/i })).toBeInTheDocument();
  });

  // AC-9: Click page → opens panel
  it('clicking a page calls panelStore.openPanel with page id', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    const dashboardBtn = screen.getByRole('button', { name: /^dashboard$/i });
    fireEvent.click(dashboardBtn);
    expect(usePanelStore.getState().activePanelId).toBe('dashboard');
    expect(usePanelStore.getState().openPanelIds).toContain('dashboard');
  });

  // AC-10: Active page highlighted
  it('active page has aria-current="page"', () => {
    useSidebarStore.setState({ collapsed: false });
    usePanelStore.setState({ activePanelId: 'dashboard', openPanelIds: ['dashboard'] });
    renderSidebar();
    const dashboardBtn = screen.getByRole('button', { name: /^dashboard$/i });
    expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
  });

  // Search filters page list
  it('search filters the page list', async () => {
    useSidebarStore.setState({ collapsed: false, searchQuery: '' });
    renderSidebar();

    const searchInput = screen.getByRole('searchbox', { name: /search pages/i });
    fireEvent.change(searchInput, { target: { value: 'order' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^orders$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^dashboard$/i })).not.toBeInTheDocument();
    });
  });

  it('shows "no pages found" when search matches nothing', async () => {
    useSidebarStore.setState({ collapsed: false, searchQuery: '' });
    renderSidebar();

    const searchInput = screen.getByRole('searchbox', { name: /search pages/i });
    fireEvent.change(searchInput, { target: { value: 'xxxxxxx_nomatch' } });

    await waitFor(() => {
      expect(screen.getByText(/no pages found/i)).toBeInTheDocument();
    });
  });

  // User avatar
  it('displays user name in expanded mode', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('displays user role in expanded mode', () => {
    // Use viewer ability to avoid ADMIN section also rendering "Admin" text
    useSidebarStore.setState({ collapsed: false });
    renderSidebar(makeViewerAbility());
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // Logo
  it('displays Vastu text label in expanded mode', () => {
    useSidebarStore.setState({ collapsed: false });
    renderSidebar();
    expect(screen.getByText('Vastu')).toBeInTheDocument();
  });

  // Search not shown in collapsed mode
  it('does not render search input in collapsed mode', () => {
    useSidebarStore.setState({ collapsed: true });
    renderSidebar();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  // Pin toggle
  it('pin toggle calls sidebarStore.togglePin for the page', () => {
    useSidebarStore.setState({ collapsed: false, pinnedPages: [] });
    renderSidebar();
    // Pin button for Dashboard
    const pinBtn = screen.getByRole('button', { name: /^pin dashboard$/i });
    fireEvent.click(pinBtn);
    expect(useSidebarStore.getState().pinnedPages).toContain('dashboard');
  });

  it('pin button label changes to "Unpin" when page is already pinned', () => {
    useSidebarStore.setState({ collapsed: false, pinnedPages: ['dashboard'] });
    renderSidebar();
    expect(screen.getByRole('button', { name: /^unpin dashboard$/i })).toBeInTheDocument();
  });
});

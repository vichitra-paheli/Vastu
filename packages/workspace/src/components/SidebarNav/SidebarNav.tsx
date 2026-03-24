'use client';

/**
 * SidebarNav — workspace sidebar navigation component.
 *
 * Two states:
 *   Collapsed (48px): icon rail with tooltips, logo icon, user avatar at bottom.
 *   Expanded (200px): logo + text, search, sections (PAGES / SYSTEM / ADMIN),
 *                     pin toggles, user avatar + name + role.
 *
 * Toggle: click the toggle button or press ⌘B (Mac) / Ctrl+B (Windows/Linux).
 * State is persisted to localStorage via sidebarStore.
 *
 * ADMIN section is hidden for non-admin users (CASL: ability.can('manage', 'all')).
 *
 * All colors via --v-* CSS custom properties.
 * All user-facing strings through the `t` prop from next-intl.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Tooltip } from '@mantine/core';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSettings,
  IconShieldCog,
  IconLayoutDashboard,
  IconUsers,
  IconShoppingCart,
  IconPackage,
  IconChartBar,
  IconFileText,
  IconReceipt,
} from '@tabler/icons-react';
import type { AppAbility } from '@vastu/shared/permissions';
import { useSidebarStore } from '../../stores/sidebarStore';
import { usePanelStore } from '../../stores/panelStore';
import { getPanel } from '../../panels/registry';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { SidebarSearch } from './SidebarSearch';
import { SidebarUserAvatar } from './SidebarUserAvatar';
import { getAllPages } from '../../pages/registry';
import classes from './SidebarNav.module.css';

/** Map of icon names used in the mock page registry to Tabler icon components. */
const PAGE_ICONS: Record<string, React.ReactNode> = {
  LayoutDashboard: <IconLayoutDashboard size={16} />,
  Users: <IconUsers size={16} />,
  ShoppingCart: <IconShoppingCart size={16} />,
  Package: <IconPackage size={16} />,
  ChartBar: <IconChartBar size={16} />,
  FileText: <IconFileText size={16} />,
  Receipt: <IconReceipt size={16} />,
};

function getPageIcon(iconName: string): React.ReactNode {
  // Support both "LayoutDashboard" and "IconLayoutDashboard" formats.
  const normalized = iconName.startsWith('Icon') ? iconName.slice(4) : iconName;
  return PAGE_ICONS[normalized] ?? <IconLayoutDashboard size={16} />;
}

interface SidebarNavUser {
  /** User display name. */
  name: string;
  /** User role label. */
  role: string;
  /** Optional avatar URL. */
  avatarUrl?: string;
}

interface SidebarNavTranslations {
  /** Vastu wordmark text */
  logoLabel: string;
  /** Collapse button aria-label */
  collapseLabel: string;
  /** Expand button aria-label */
  expandLabel: string;
  /** PAGES section header */
  pagesSection: string;
  /** SYSTEM section header */
  systemSection: string;
  /** ADMIN section header */
  adminSection: string;
  /** Settings link label */
  settingsLabel: string;
  /** Admin link label */
  adminLabel: string;
  /** Search placeholder */
  searchPlaceholder: string;
  /** No results text */
  noResults: string;
}

interface SidebarNavProps {
  /** Resolved CASL ability for the current user. */
  ability: AppAbility;
  /** Current user info for avatar display. */
  user: SidebarNavUser;
  /** Translation strings. */
  t: SidebarNavTranslations;
}

export function SidebarNav({ ability, user, t }: SidebarNavProps) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const pinnedPages = useSidebarStore((s) => s.pinnedPages);
  const togglePin = useSidebarStore((s) => s.togglePin);
  const searchQuery = useSidebarStore((s) => s.searchQuery);
  const setSearchQuery = useSidebarStore((s) => s.setSearchQuery);
  const activePanelId = usePanelStore((s) => s.activePanelId);
  const openPanelFn = usePanelStore((s) => s.openPanel);

  /** Open a page by looking up its template type and opening that panel. */
  const openPage = (pageId: string) => {
    const page = allPages.find((p) => p.id === pageId);
    if (!page) return;

    // Look up the panel definition for the page's template type.
    const panelDef = getPanel(page.template);
    if (!panelDef) {
      console.warn(`[SidebarNav] No panel registered for template "${page.template}" (page "${pageId}")`);
      return;
    }

    // Open the template panel with the page ID as instance ID and pass pageId in params.
    openPanelFn({ ...panelDef, title: page.name }, pageId);
  };

  const isAdmin = ability.can('manage', 'all');

  // Register ⌘B / Ctrl+B keyboard shortcut to toggle sidebar.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggle();
      }
    },
    [toggle],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get pages from the registry (registered via registerPage() side-effects).
  const allPages = getAllPages();

  // Filter pages by search query (case-insensitive).
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return allPages;
    const q = searchQuery.toLowerCase();
    return allPages.filter((p) => p.name.toLowerCase().includes(q));
  }, [searchQuery, allPages]);

  const toggleButton = (
    <button
      type="button"
      className={classes.toggleButton}
      onClick={toggle}
      aria-label={collapsed ? t.expandLabel : t.collapseLabel}
      title={collapsed ? t.expandLabel : t.collapseLabel}
    >
      {collapsed ? (
        <IconLayoutSidebarLeftExpand size={16} />
      ) : (
        <IconLayoutSidebarLeftCollapse size={16} />
      )}
    </button>
  );

  return (
    <nav
      className={classes.sidebar}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Sidebar navigation"
    >
      {/* Logo + toggle */}
      <div className={classes.logo}>
        {/* Vastu logo icon (always visible) */}
        <span className={classes.logoIconWrapper} aria-hidden="true">
          {/* Simple text logo icon — in Phase 1+ this will be an SVG Vastu mark */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <rect width="20" height="20" rx="4" fill="var(--v-accent-primary)" />
            <text
              x="10"
              y="14"
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fill="var(--v-text-inverse)"
              fontFamily="var(--v-font-sans)"
            >
              V
            </text>
          </svg>
        </span>

        {/* "Vastu" text — hidden in collapsed mode */}
        {!collapsed && (
          <span className={classes.logoText} aria-label={t.logoLabel}>
            Vastu
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Toggle button — in collapsed mode wrap with tooltip */}
        {collapsed ? (
          <Tooltip
            label={t.expandLabel}
            position="right"
            openDelay={300}
            styles={{
              tooltip: {
                background: 'var(--v-bg-elevated)',
                boxShadow: 'var(--v-shadow-sm)',
                fontSize: 'var(--v-text-sm)',
                color: 'var(--v-text-primary)',
                border: '1px solid var(--v-border-default)',
              },
            }}
          >
            {toggleButton}
          </Tooltip>
        ) : (
          toggleButton
        )}
      </div>

      {/* Search — only in expanded mode */}
      {!collapsed && (
        <SidebarSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.searchPlaceholder}
        />
      )}

      {/* Scrollable nav body */}
      <div className={classes.navBody}>
        {/* PAGES section */}
        <SidebarSection label={t.pagesSection} collapsed={collapsed}>
          {filteredPages.length === 0 ? (
            !collapsed && (
              <div
                style={{
                  padding: 'var(--v-space-2) var(--v-space-3)',
                  fontSize: 'var(--v-text-sm)',
                  color: 'var(--v-text-tertiary)',
                }}
              >
                {t.noResults}
              </div>
            )
          ) : (
            filteredPages.map((page) => (
              <SidebarItem
                key={page.id}
                id={page.id}
                label={page.name}
                icon={getPageIcon(page.icon)}
                active={activePanelId === page.id}
                pinned={pinnedPages.includes(page.id)}
                showPin={true}
                collapsed={collapsed}
                onClick={() => openPage(page.id)}
                onPinToggle={() => togglePin(page.id)}
              />
            ))
          )}
        </SidebarSection>

        {/* SYSTEM section — Settings (opens in new browser tab) */}
        <SidebarSection label={t.systemSection} collapsed={collapsed}>
          <SidebarItem
            id="settings"
            label={t.settingsLabel}
            icon={<IconSettings size={16} />}
            collapsed={collapsed}
            onClick={() => {
              window.open('/settings', '_blank', 'noopener,noreferrer');
            }}
            ariaLabel={`${t.settingsLabel} (opens in new tab)`}
          />
        </SidebarSection>

        {/* ADMIN section — only visible for admin role */}
        {isAdmin && (
          <SidebarSection label={t.adminSection} collapsed={collapsed}>
            <SidebarItem
              id="admin"
              label={t.adminLabel}
              icon={<IconShieldCog size={16} />}
              collapsed={collapsed}
              onClick={() => {
                window.open('/admin', '_blank', 'noopener,noreferrer');
              }}
              ariaLabel={`${t.adminLabel} (opens in new tab)`}
            />
          </SidebarSection>
        )}
      </div>

      {/* User avatar at bottom */}
      <SidebarUserAvatar
        name={user.name}
        role={user.role}
        avatarUrl={user.avatarUrl}
        collapsed={collapsed}
      />
    </nav>
  );
}

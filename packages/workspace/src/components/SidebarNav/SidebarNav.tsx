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
 * Pages come from the PageRegistry (code-registered). Static pages appear first,
 * with a subtle "System" badge in builder mode. Dynamic pages (from the database)
 * are appended after static pages, separated by a subtle divider.
 *
 * All colors via --v-* CSS custom properties.
 * All user-facing strings through the `t` prop from next-intl.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { Badge, Tooltip } from '@mantine/core';
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
  IconFlag,
  IconClock,
  IconStar,
  IconTable,
  IconForms,
  IconHistory,
  IconHome,
} from '@tabler/icons-react';
import type { AppAbility } from '@vastu/shared/permissions';
import { useSidebarStore } from '../../stores/sidebarStore';
import { usePanelStore, openPanelByTypeId } from '../../stores/panelStore';
import { getAllPages } from '../../pages/registry';
import type { PageDefinition } from '../../pages/types';
import { SidebarSection } from './SidebarSection';
import { SidebarItem } from './SidebarItem';
import { SidebarSearch } from './SidebarSearch';
import { SidebarUserAvatar } from './SidebarUserAvatar';
import classes from './SidebarNav.module.css';

/**
 * Map of Tabler icon name strings to icon components.
 *
 * Extend this map when new page icons are needed.
 * Convention: key is the icon name without "Icon" prefix.
 */
const PAGE_ICONS: Record<string, React.ReactNode> = {
  // Legacy names kept for backward compatibility
  LayoutDashboard: <IconLayoutDashboard size={16} />,
  Users: <IconUsers size={16} />,
  ShoppingCart: <IconShoppingCart size={16} />,
  Package: <IconPackage size={16} />,
  ChartBar: <IconChartBar size={16} />,
  FileText: <IconFileText size={16} />,
  Receipt: <IconReceipt size={16} />,
  // F1 demo page icons
  Flag: <IconFlag size={16} />,
  Clock: <IconClock size={16} />,
  Star: <IconStar size={16} />,
  Table: <IconTable size={16} />,
  Forms: <IconForms size={16} />,
  History: <IconHistory size={16} />,
  Home: <IconHome size={16} />,
  Settings: <IconSettings size={16} />,
  ShieldCog: <IconShieldCog size={16} />,
};

/** Resolve a Tabler icon name string to a React icon element. */
function getPageIcon(iconName: string): React.ReactNode {
  return PAGE_ICONS[iconName] ?? <IconLayoutDashboard size={16} />;
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
  /** "System" badge label for static pages in builder mode */
  systemBadge?: string;
}

interface SidebarNavProps {
  /** Resolved CASL ability for the current user. */
  ability: AppAbility;
  /** Current user info for avatar display. */
  user: SidebarNavUser;
  /** Translation strings. */
  t: SidebarNavTranslations;
  /**
   * Optional list of dynamic (database) pages to merge with code-registered pages.
   * Static pages always appear first, then dynamic-only pages after a subtle divider.
   * When not provided, only code-registered pages are shown.
   */
  dynamicPages?: PageDefinition[];
}

export function SidebarNav({ ability, user, t, dynamicPages = [] }: SidebarNavProps) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const pinnedPages = useSidebarStore((s) => s.pinnedPages);
  const togglePin = useSidebarStore((s) => s.togglePin);
  const searchQuery = useSidebarStore((s) => s.searchQuery);
  const setSearchQuery = useSidebarStore((s) => s.setSearchQuery);
  const activePanelId = usePanelStore((s) => s.activePanelId);
  const panelModes = usePanelStore((s) => s.panelModes);

  /** True when the currently active panel is in builder mode. */
  const isBuilderMode = activePanelId != null
    ? (panelModes[activePanelId] ?? 'editor') === 'builder'
    : false;

  const isAdmin = ability.can('manage', 'all');

  const openPanel = (pageId: string) => openPanelByTypeId(pageId);

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

  /**
   * All pages in display order:
   *   - Static pages (from code registry) first, sorted by section + order + name.
   *   - Dynamic-only pages (from DB) appended after.
   *
   * Dynamic pages supplied via `dynamicPages` prop are filtered to 'pages' section
   * only (system/admin items are always code-registered).
   */
  const staticPages = useMemo(() => getAllPages().filter((p) => (p.section ?? 'pages') === 'pages'), []);
  const dynamicOnlyPages = useMemo(
    () => dynamicPages.filter((p) => !staticPages.some((s) => s.id === p.id)),
    [dynamicPages, staticPages],
  );

  /** Whether there are dynamic-only pages to show after the divider. */
  const hasDynamicOnly = dynamicOnlyPages.length > 0;

  // Filter pages by search query (case-insensitive). Searches both static and dynamic pages.
  const { filteredStatic, filteredDynamic } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredStatic: staticPages, filteredDynamic: dynamicOnlyPages };
    }
    const q = searchQuery.toLowerCase();
    return {
      filteredStatic: staticPages.filter((p) => p.name.toLowerCase().includes(q)),
      filteredDynamic: dynamicOnlyPages.filter((p) => p.name.toLowerCase().includes(q)),
    };
  }, [searchQuery, staticPages, dynamicOnlyPages]);

  const totalFiltered = filteredStatic.length + filteredDynamic.length;

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

  /** Render a "System" badge next to a static page in builder mode. */
  const systemBadge = isBuilderMode && !collapsed ? (
    <Badge
      size="xs"
      variant="light"
      style={{
        fontSize: 'var(--v-text-xs)',
        color: 'var(--v-text-tertiary)',
        background: 'var(--v-bg-tertiary)',
        border: '1px solid var(--v-border-subtle)',
        fontWeight: 'var(--v-font-regular)',
        letterSpacing: 0,
        textTransform: 'none',
        flexShrink: 0,
      }}
    >
      {t.systemBadge ?? 'System'}
    </Badge>
  ) : null;

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
          {totalFiltered === 0 ? (
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
            <>
              {/* Static (code-registered) pages */}
              {filteredStatic.map((page) => (
                <div key={page.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SidebarItem
                      id={page.id}
                      label={page.name}
                      icon={getPageIcon(page.icon)}
                      active={activePanelId === page.id}
                      pinned={pinnedPages.includes(page.id)}
                      showPin={true}
                      collapsed={collapsed}
                      onClick={() => openPanel(page.id)}
                      onPinToggle={() => togglePin(page.id)}
                    />
                  </div>
                  {systemBadge}
                </div>
              ))}

              {/* Subtle divider between static and dynamic-only pages */}
              {hasDynamicOnly && filteredStatic.length > 0 && filteredDynamic.length > 0 && (
                <div
                  aria-hidden="true"
                  style={{
                    height: '1px',
                    background: 'var(--v-border-subtle)',
                    margin: 'var(--v-space-1) var(--v-space-3)',
                  }}
                />
              )}

              {/* Dynamic-only pages (from the database, not code-registered) */}
              {filteredDynamic.map((page) => (
                <SidebarItem
                  key={page.id}
                  id={page.id}
                  label={page.name}
                  icon={getPageIcon(page.icon)}
                  active={activePanelId === page.id}
                  pinned={pinnedPages.includes(page.id)}
                  showPin={true}
                  collapsed={collapsed}
                  onClick={() => openPanel(page.id)}
                  onPinToggle={() => togglePin(page.id)}
                />
              ))}
            </>
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

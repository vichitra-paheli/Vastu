'use client';

/**
 * WorkspaceShell — three-region workspace layout.
 *
 * Regions:
 *   - Sidebar (left): 48px collapsed (icon rail) / 200px expanded.
 *     Controlled by sidebarStore, persisted to localStorage.
 *   - Main content (center): fills remaining space.
 *     This is where Dockview will be mounted in US-107.
 *   - Tray bar (bottom): 44px fixed. Populated in US-115.
 *
 * Updated in US-109: renders SidebarNav with user + ability props.
 *
 * All colors via --v-* CSS custom properties. No hardcoded values.
 */

import React from 'react';
import { defineAbilitiesFor, type AppAbility } from '@vastu/shared/permissions';
import { useSidebarStore } from '../stores/sidebarStore';
import { SidebarNav } from './SidebarNav';
import classes from './WorkspaceShell.module.css';

const SIDEBAR_COLLAPSED_WIDTH = 48;
const SIDEBAR_EXPANDED_WIDTH = 200;

/** User data forwarded to the sidebar nav. */
export interface WorkspaceUser {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface WorkspaceShellProps {
  children?: React.ReactNode;
  /** Current user info for the sidebar avatar. Defaults to a placeholder if omitted. */
  user?: WorkspaceUser;
  /**
   * CASL ability for the current user (used for ADMIN section gating).
   * If omitted, a no-permissions ability is used (hides ADMIN section).
   */
  ability?: AppAbility;
}

/** Fallback no-permissions ability when none is provided. */
function createNoOpAbility(): AppAbility {
  return defineAbilitiesFor({ roles: [] });
}

/** Default translations for the sidebar nav. All strings should come from i18n in a full integration. */
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

export function WorkspaceShell({ children, user, ability }: WorkspaceShellProps) {
  const collapsed = useSidebarStore((state) => state.collapsed);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  const resolvedUser: WorkspaceUser = user ?? {
    name: 'User',
    role: 'Member',
  };

  const resolvedAbility: AppAbility = ability ?? createNoOpAbility();

  return (
    <div
      className={classes.workspace}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      <aside
        className={classes.sidebar}
        aria-label="Workspace sidebar"
        data-collapsed={collapsed}
      >
        <SidebarNav
          ability={resolvedAbility}
          user={resolvedUser}
          t={DEFAULT_TRANSLATIONS}
        />
      </aside>

      <main className={classes.main} id="workspace-main">
        {children}
      </main>

      <div className={classes.tray} role="region" aria-label="Workspace tray">
        {/* Tray bar items populated in US-115 */}
      </div>
    </div>
  );
}

'use client';

/**
 * WorkspaceShell — three-region workspace layout.
 *
 * Regions:
 *   - Sidebar (left): 48px collapsed (icon rail) / 200px expanded.
 *     Controlled by sidebarStore, persisted to localStorage.
 *   - Main content (center): hosts DockviewHost (US-107).
 *   - Tray bar (bottom): 44px fixed. Implemented in US-115 (TrayBar component).
 *
 * Built-in panels are registered at import time via panels/index.ts.
 * Updated in US-109: renders SidebarNav with user + ability props.
 * All colors via --v-* CSS custom properties. No hardcoded values.
 */

// Register all built-in panel types before DockviewHost mounts.
// This import has a side effect: it calls registerPanel() for each built-in.
import '../panels/index';

import React from 'react';
import { defineAbilitiesFor, type AppAbility } from '@vastu/shared/permissions';
import { useSidebarStore } from '../stores/sidebarStore';
import { usePanelStore } from '../stores/panelStore';
import { DockviewHost } from './DockviewHost/DockviewHost';
import { SidebarNav } from './SidebarNav';
import { TrayBar } from './TrayBar';
import { ViewToolbar } from './ViewToolbar';
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
  /**
   * Page ID for the currently active panel.
   * Forwarded to ViewToolbar so it can associate saved views with a page.
   * When not provided, ViewToolbar is not rendered (e.g., during initial load).
   */
  activePageId?: string;
  /**
   * Current user's ID — forwarded to ViewToolbar / ViewSelector for
   * splitting MY VIEWS vs SHARED WITH ME.
   */
  currentUserId?: string;
}

/** Fallback no-permissions ability when none is provided. */
function createNoOpAbility(): AppAbility {
  return defineAbilitiesFor({ roles: [] });
}

/** Default translations for the sidebar nav. */
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

export function WorkspaceShell({
  children,
  user,
  ability,
  activePageId,
  currentUserId,
}: WorkspaceShellProps) {
  const collapsed = useSidebarStore((state) => state.collapsed);
  // Derive the active page ID from the Dockview active panel.
  // Falls back to the explicitly-provided prop for SSR / static usage.
  const activePanelId = usePanelStore((state) => state.activePanelId);
  const resolvedActivePageId = activePanelId ?? activePageId ?? '';

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
        style={{ width: sidebarWidth }}
        data-collapsed={collapsed}
      >
        <SidebarNav
          ability={resolvedAbility}
          user={resolvedUser}
          t={DEFAULT_TRANSLATIONS}
        />
      </aside>

      <main className={classes.main} id="workspace-main">
        {/* ViewToolbar sits between the sidebar and the Dockview panel area.
            Always rendered; shows "Default view" when no page is active.
            WorkspaceShell is the single source of truth for activePanelId:
            it resolves panelStore.activePanelId with the prop fallback here,
            then passes the resolved value down. ViewToolbar does not do its
            own panelStore lookup. */}
        <ViewToolbar pageId={resolvedActivePageId} currentUserId={currentUserId} />
        <DockviewHost />
        {children}
      </main>

      <div className={classes.tray} role="region" aria-label="Workspace tray">
        <TrayBar />
      </div>
    </div>
  );
}

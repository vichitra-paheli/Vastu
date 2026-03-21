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
 * All colors via --v-* CSS custom properties. No hardcoded values.
 */

import React from 'react';
import { useSidebarStore } from '../stores/sidebarStore';
import classes from './WorkspaceShell.module.css';

const SIDEBAR_COLLAPSED_WIDTH = 48;
const SIDEBAR_EXPANDED_WIDTH = 200;

interface WorkspaceShellProps {
  children?: React.ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const collapsed = useSidebarStore((state) => state.collapsed);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

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
        {/* Sidebar content — icon rail and expanded nav populated in US-107 */}
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

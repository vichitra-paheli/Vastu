'use client';

/**
 * WorkspaceShell — three-region workspace layout.
 *
 * Regions:
 *   - Sidebar (left): 48px collapsed (icon rail) / 200px expanded.
 *     Controlled by sidebarStore, persisted to localStorage.
 *   - Main content (center): hosts DockviewHost (US-107).
 *   - Tray bar (bottom): 44px fixed. Populated in US-115.
 *
 * Built-in panels are registered at import time via panels/index.ts.
 * All colors via --v-* CSS custom properties. No hardcoded values.
 */

// Register all built-in panel types before DockviewHost mounts.
// This import has a side effect: it calls registerPanel() for each built-in.
import '../panels/index';

import React from 'react';
import { useSidebarStore } from '../stores/sidebarStore';
import { DockviewHost } from './DockviewHost/DockviewHost';
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
        {/* Sidebar content — icon rail and expanded nav populated in US-109 */}
      </aside>

      <main className={classes.main} id="workspace-main">
        {/* DockviewHost is the primary content area (US-107) */}
        <DockviewHost />
        {/* Legacy children prop — kept for backward compatibility with existing tests */}
        {children}
      </main>

      <div className={classes.tray} role="region" aria-label="Workspace tray">
        {/* Tray bar items populated in US-115 */}
      </div>
    </div>
  );
}

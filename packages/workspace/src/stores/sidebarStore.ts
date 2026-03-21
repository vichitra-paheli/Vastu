/**
 * sidebarStore — controls the expanded/collapsed state of the workspace sidebar.
 *
 * State is persisted to localStorage under `vastu-sidebar-state` so the user's
 * preference survives page refreshes.
 *
 * Collapsed: 48px icon-only rail.
 * Expanded:  200px full sidebar with labels.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  /** Whether the sidebar is currently collapsed to the 48px icon rail. */
  collapsed: boolean;
  /** Toggle between collapsed and expanded states. */
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    {
      name: 'vastu-sidebar-state',
    },
  ),
);

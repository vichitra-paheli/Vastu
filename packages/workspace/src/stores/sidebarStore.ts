/**
 * sidebarStore — controls the expanded/collapsed state of the workspace sidebar
 * and persists user preferences (pinned pages, search query).
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

  /** Set of pinned page IDs. Persisted to localStorage. */
  pinnedPages: string[];
  /** Toggle the pinned state of a page by ID. */
  togglePin: (pageId: string) => void;

  /** Current search query for the PAGES section. NOT persisted. */
  searchQuery: string;
  /** Update the search query. */
  setSearchQuery: (query: string) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),

      pinnedPages: [],
      togglePin: (pageId: string) =>
        set((state) => ({
          pinnedPages: state.pinnedPages.includes(pageId)
            ? state.pinnedPages.filter((id) => id !== pageId)
            : [...state.pinnedPages, pageId],
        })),

      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),
    }),
    {
      name: 'vastu-sidebar-state',
      // Only persist collapsed and pinnedPages — not the ephemeral searchQuery.
      partialize: (state) => ({
        collapsed: state.collapsed,
        pinnedPages: state.pinnedPages,
      }),
    },
  ),
);

/**
 * drawerStore — manages state for the RecordDrawer slide-out panel.
 *
 * Tracks the open/closed state, current record ID, active tab,
 * and navigation stack for prev/next record navigation.
 *
 * Implements US-128a.
 */

import { create } from 'zustand';

/** Tab identifiers for the record drawer. */
export type DrawerTab = 'details' | 'items' | 'history' | 'notes' | 'permissions';

/** A single navigation entry (record in the current result set). */
export interface DrawerNavigationEntry {
  recordId: string;
  title: string;
}

interface DrawerStoreState {
  /** Whether the drawer is currently open. */
  isOpen: boolean;

  /** The ID of the currently displayed record. Null when closed. */
  recordId: string | null;

  /** Currently active tab. */
  activeTab: DrawerTab;

  /**
   * Ordered list of record IDs available for prev/next navigation.
   * Populated from the table row set when openDrawer is called.
   */
  navigationStack: DrawerNavigationEntry[];

  /**
   * Index of the current record within navigationStack.
   * -1 when navigationStack is empty or record not found in stack.
   */
  navigationIndex: number;

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Open the drawer with the given record.
   *
   * @param recordId - ID of the record to display.
   * @param navigationStack - Ordered list of navigation entries (e.g. current table page rows).
   * @param navigationIndex - Index of recordId in navigationStack.
   */
  openDrawer: (
    recordId: string,
    navigationStack?: DrawerNavigationEntry[],
    navigationIndex?: number,
  ) => void;

  /** Close the drawer and reset transient state (keeps last tab active). */
  closeDrawer: () => void;

  /**
   * Switch the active tab.
   * No-op when the drawer is closed.
   */
  setActiveTab: (tab: DrawerTab) => void;

  /**
   * Navigate directly to a record by ID without changing the navigation stack.
   * Useful for "open in drawer" actions outside of a table context.
   */
  navigateToRecord: (recordId: string) => void;

  /**
   * Move to the previous record in the navigation stack.
   * Clamps at index 0 (does not wrap).
   */
  goBack: () => void;

  /**
   * Move to the next record in the navigation stack.
   * Clamps at the last index (does not wrap).
   */
  goForward: () => void;
}

export const useDrawerStore = create<DrawerStoreState>()((set, get) => ({
  isOpen: false,
  recordId: null,
  activeTab: 'details',
  navigationStack: [],
  navigationIndex: -1,

  openDrawer: (recordId, navigationStack = [], navigationIndex = -1) => {
    const resolvedIndex =
      navigationIndex >= 0
        ? navigationIndex
        : navigationStack.findIndex((e) => e.recordId === recordId);

    set({
      isOpen: true,
      recordId,
      navigationStack,
      navigationIndex: resolvedIndex,
    });
  },

  closeDrawer: () => {
    set({
      isOpen: false,
      recordId: null,
      navigationStack: [],
      navigationIndex: -1,
    });
  },

  setActiveTab: (tab) => {
    if (!get().isOpen) return;
    set({ activeTab: tab });
  },

  navigateToRecord: (recordId) => {
    const { navigationStack } = get();
    const idx = navigationStack.findIndex((e) => e.recordId === recordId);
    set({
      isOpen: true,
      recordId,
      navigationIndex: idx,
    });
  },

  goBack: () => {
    const { navigationStack, navigationIndex } = get();
    if (navigationIndex <= 0 || navigationStack.length === 0) return;
    const newIndex = navigationIndex - 1;
    const entry = navigationStack[newIndex];
    set({ navigationIndex: newIndex, recordId: entry.recordId });
  },

  goForward: () => {
    const { navigationStack, navigationIndex } = get();
    if (navigationIndex < 0 || navigationIndex >= navigationStack.length - 1) return;
    const newIndex = navigationIndex + 1;
    const entry = navigationStack[newIndex];
    set({ navigationIndex: newIndex, recordId: entry.recordId });
  },
}));

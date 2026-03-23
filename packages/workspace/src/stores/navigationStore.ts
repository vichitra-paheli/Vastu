/**
 * navigationStore — Zustand store for cross-page navigation intents.
 *
 * When a user clicks a LinkCell, the navigation system:
 *   1. Stores a NavigationIntent in this store, keyed by the target panel ID.
 *   2. Opens (or focuses) the target panel in Dockview.
 *   3. The target page reads the intent on mount via getNavigationIntent(panelId).
 *   4. The target page clears the intent after consuming it.
 *
 * This one-way mailbox pattern avoids coupling source and target panels
 * directly and works regardless of whether the panel was already open or new.
 *
 * Implements US-209c (VASTU-2A-209).
 */

import { create } from 'zustand';
import type { NavigationIntent } from '../navigation/types';

interface NavigationStoreState {
  /**
   * Pending navigation intents keyed by panel instance ID.
   *
   * When a panel opens due to a navigation action, its intent is stored here.
   * The target page reads this value on mount and calls clearIntent() to remove it.
   */
  intents: Record<string, NavigationIntent>;

  /**
   * Store a navigation intent for a specific panel.
   *
   * @param panelId - The Dockview panel instance ID that will receive the intent.
   * @param intent  - The navigation intent to deliver.
   */
  setIntent: (panelId: string, intent: NavigationIntent) => void;

  /**
   * Read the pending intent for a panel, then clear it.
   *
   * Returns undefined if no intent is pending for this panel.
   * Automatically removes the intent from the store after returning it.
   *
   * @param panelId - The Dockview panel instance ID to consume the intent for.
   * @returns The pending NavigationIntent, or undefined if none.
   */
  consumeIntent: (panelId: string) => NavigationIntent | undefined;

  /**
   * Clear the pending intent for a specific panel without returning it.
   * Use this when the panel is closed before the intent is consumed.
   *
   * @param panelId - The panel ID whose intent should be cleared.
   */
  clearIntent: (panelId: string) => void;

  /**
   * Clear all pending intents.
   * Called when the workspace resets (e.g., all panels closed).
   */
  clearAllIntents: () => void;
}

export const useNavigationStore = create<NavigationStoreState>()((set, get) => ({
  intents: {},

  setIntent: (panelId, intent) => {
    set((state) => ({
      intents: { ...state.intents, [panelId]: intent },
    }));
  },

  consumeIntent: (panelId) => {
    const intent = get().intents[panelId];
    if (intent !== undefined) {
      set((state) => {
        const next = { ...state.intents };
        delete next[panelId];
        return { intents: next };
      });
    }
    return intent;
  },

  clearIntent: (panelId) => {
    set((state) => {
      const next = { ...state.intents };
      delete next[panelId];
      return { intents: next };
    });
  },

  clearAllIntents: () => {
    set({ intents: {} });
  },
}));

/**
 * getNavigationIntent — utility for target pages to consume their navigation intent.
 *
 * Call this inside the target page component on mount (e.g. in a useEffect or
 * directly in the component body as a one-time read).
 * It reads and clears the pending intent for the given panel ID from the store.
 *
 * This is NOT a React hook (it contains no hook calls). It reads from the Zustand
 * store imperatively via getState(), which is safe to call outside of React.
 *
 * @example
 * function DriverProfilePanel({ params }: PanelProps) {
 *   const intent = getNavigationIntent(params.panelId);
 *   useEffect(() => {
 *     if (intent?.recordId) setSelectedDriverId(intent.recordId);
 *   }, [intent]);
 * }
 *
 * @param panelId - The Dockview panel instance ID.
 * @returns The pending NavigationIntent, or undefined if none.
 */
export function getNavigationIntent(panelId: string): NavigationIntent | undefined {
  // Read once on mount — consumeIntent removes it from the store.
  // Using getState() directly (not a hook selector) because this is a
  // one-time read, not a reactive subscription.
  return useNavigationStore.getState().consumeIntent(panelId);
}

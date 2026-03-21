/**
 * usePanelPersistence — Dockview layout persistence to localStorage.
 *
 * This hook wires the Dockview layout change events to localStorage,
 * saving the serialized layout with a 500ms debounce.
 *
 * On first mount it pre-loads the persisted layout into the panelStore
 * so DockviewHost can restore it when the API becomes ready.
 *
 * localStorage key: 'vastu-panel-layout'
 *
 * Corruption handling:
 * - If the stored JSON is malformed: clear the entry and log a warning.
 * - If restoreLayout() throws: the store handles it and resets to null.
 *
 * Implements US-107 AC-8 (localStorage persistence).
 */

import { useEffect, useRef } from 'react';
import { usePanelStore } from '../stores/panelStore';
import type { SerializedLayout } from '../types/panel';
import { t } from '../lib/i18n';

/** localStorage key for the serialized panel layout. */
export const PANEL_LAYOUT_STORAGE_KEY = 'vastu-panel-layout';

/** Debounce delay in milliseconds for layout saves. */
const SAVE_DEBOUNCE_MS = 500;

/**
 * Load the persisted layout from localStorage.
 *
 * Returns null if:
 * - No entry exists
 * - The entry is not valid JSON
 * - The entry is empty
 */
function loadPersistedLayout(): SerializedLayout | null {
  try {
    const raw = localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedLayout;
  } catch (err) {
    // Corrupted JSON — clear and warn
    console.warn(t('workspace.dockview.loadError'), err);
    try {
      localStorage.removeItem(PANEL_LAYOUT_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    return null;
  }
}

/**
 * Persist the given layout to localStorage.
 * Silent failure — storage errors are caught and logged.
 */
function persistLayout(layout: SerializedLayout): void {
  try {
    localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch (err) {
    console.warn('[usePanelPersistence] Failed to save layout to localStorage.', err);
  }
}

/**
 * usePanelPersistence — attach to DockviewHost to enable layout persistence.
 *
 * Mount this hook once inside DockviewHost or a parent that has access
 * to the Dockview API via panelStore.
 *
 * The hook:
 * 1. Loads the persisted layout from localStorage and pre-loads it into the store.
 * 2. Subscribes to the Dockview API's onDidLayoutChange event.
 * 3. Debounces layout saves at 500ms.
 * 4. Cleans up the subscription and any pending debounce timer on unmount.
 */
export function usePanelPersistence(): void {
  const api = usePanelStore((state) => state.api);
  const setLayout = usePanelStore((state) => state.setLayout);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 1: Pre-load persisted layout into the store on first render.
  // This runs once, before the API is ready — the layout is stored in state
  // so restoreLayout() can use it when onReady fires.
  useEffect(() => {
    const persisted = loadPersistedLayout();
    if (persisted) {
      setLayout(persisted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once
  }, []);

  // Step 2: Subscribe to layout changes once the API is available.
  useEffect(() => {
    if (!api) return;

    const subscription = api.onDidLayoutChange(() => {
      // Debounce layout saves to avoid writing on every pixel of a resize
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        const layout = api.toJSON();
        setLayout(layout);
        persistLayout(layout);
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      // Clean up the event subscription and any pending save
      subscription.dispose();
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [api, setLayout]);
}

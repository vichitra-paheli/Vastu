/**
 * trayStore — manages the bottom tray bar state.
 *
 * Tracks minimized panels and exposes actions to add, remove, and restore
 * tray items. Wired to panelStore via minimizePanel (US-115).
 *
 * Implements US-115 (AC-2, AC-3, AC-4, AC-7).
 */

import { create } from 'zustand';
import type { PanelId } from '../types/panel';

/** A single entry in the tray bar — a minimized panel snapshot. */
export interface TrayItem {
  /** The Dockview panel instance ID. */
  panelId: PanelId;
  /** Display title shown in the tray chip. */
  title: string;
  /** Optional Tabler icon name for the panel. */
  iconName?: string;
}

interface TrayState {
  /** Panel IDs that have been minimized to the tray. */
  minimizedPanelIds: PanelId[];

  /** Full tray item records keyed by panelId, preserving title + iconName. */
  trayItems: TrayItem[];

  // ---- Actions ----

  /**
   * Add a panel to the tray.
   * No-op if the panel is already in the tray.
   */
  addToTray: (item: TrayItem) => void;

  /**
   * Remove a panel from the tray permanently (close action).
   * Does NOT restore the panel to Dockview — the caller must close it.
   */
  removeFromTray: (panelId: PanelId) => void;

  /**
   * Restore a panel from the tray back to Dockview.
   * Removes it from the tray; the caller opens it via panelStore.
   */
  restoreFromTray: (panelId: PanelId) => void;
}

export const useTrayStore = create<TrayState>()((set, get) => ({
  minimizedPanelIds: [],
  trayItems: [],

  addToTray: (item) => {
    const { trayItems } = get();
    // Prevent duplicates
    if (trayItems.some((t) => t.panelId === item.panelId)) return;

    set((state) => ({
      minimizedPanelIds: [...state.minimizedPanelIds, item.panelId],
      trayItems: [...state.trayItems, item],
    }));
  },

  removeFromTray: (panelId) => {
    set((state) => ({
      minimizedPanelIds: state.minimizedPanelIds.filter((id) => id !== panelId),
      trayItems: state.trayItems.filter((t) => t.panelId !== panelId),
    }));
  },

  restoreFromTray: (panelId) => {
    set((state) => ({
      minimizedPanelIds: state.minimizedPanelIds.filter((id) => id !== panelId),
      trayItems: state.trayItems.filter((t) => t.panelId !== panelId),
    }));
  },
}));

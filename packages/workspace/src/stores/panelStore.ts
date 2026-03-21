/**
 * panelStore — manages the Dockview panel registry and active panel state.
 *
 * Stub for US-107. This store will track open panels, their layout, and
 * the currently focused panel once Dockview is integrated.
 *
 * Updated in US-109 to expose openPanel() for sidebar navigation.
 */

import { create } from 'zustand';
import type { PanelId } from '../types/panel';

interface PanelState {
  /** ID of the currently active/focused panel. */
  activePanelId: PanelId | null;
  /** List of open panel IDs in the current Dockview layout. */
  openPanelIds: PanelId[];

  /**
   * Open a panel by ID. If the panel is already open, it is focused.
   * If not, it is added to openPanelIds and set as active.
   *
   * Full Dockview integration will replace this stub in US-107.
   */
  openPanel: (panelId: PanelId) => void;
}

export const usePanelStore = create<PanelState>()((set) => ({
  activePanelId: null,
  openPanelIds: [],

  openPanel: (panelId: PanelId) =>
    set((state) => {
      const alreadyOpen = state.openPanelIds.includes(panelId);
      return {
        activePanelId: panelId,
        openPanelIds: alreadyOpen ? state.openPanelIds : [...state.openPanelIds, panelId],
      };
    }),
}));

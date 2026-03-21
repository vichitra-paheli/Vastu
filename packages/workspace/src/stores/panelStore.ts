/**
 * panelStore — manages the Dockview panel registry and active panel state.
 *
 * Stub for US-107. This store will track open panels, their layout, and
 * the currently focused panel once Dockview is integrated.
 */

import { create } from 'zustand';
import type { PanelId } from '../types/panel';

interface PanelState {
  /** ID of the currently active/focused panel. */
  activePanelId: PanelId | null;
  /** List of open panel IDs in the current Dockview layout. */
  openPanelIds: PanelId[];
}

export const usePanelStore = create<PanelState>()(() => ({
  activePanelId: null,
  openPanelIds: [],
}));

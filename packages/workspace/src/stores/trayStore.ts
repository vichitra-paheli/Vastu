/**
 * trayStore — manages the bottom tray bar state.
 *
 * Stub for US-115. This store will track minimized panels and tray items
 * once the tray bar is implemented.
 */

import { create } from 'zustand';
import type { PanelId } from '../types/panel';

interface TrayState {
  /** Panel IDs that have been minimized to the tray. */
  minimizedPanelIds: PanelId[];
}

export const useTrayStore = create<TrayState>()(() => ({
  minimizedPanelIds: [],
}));

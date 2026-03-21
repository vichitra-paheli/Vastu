/**
 * panelStore — manages Dockview API reference, panel state, and layout serialization.
 *
 * The store holds a reference to the DockviewApi (set when DockviewHost mounts)
 * and exposes operations to open, close, focus, and minimize panels.
 *
 * Layout persistence is handled separately by usePanelPersistence hook,
 * which calls serializeLayout() on changes and restoreLayout() on mount.
 *
 * Implements US-107 (AC-2, AC-7, AC-8, AC-9, AC-10).
 * Updated in US-115: minimizePanel now moves the panel to trayStore.
 */

import { create } from 'zustand';
import type { DockviewApi } from 'dockview-core';
import type { PanelDefinition, PanelId, SerializedLayout } from '../types/panel';
import { getPanel } from '../panels/registry';
import { useTrayStore } from './trayStore';

interface PanelStoreState {
  /**
   * Live reference to the Dockview API.
   * Set when DockviewHost fires onReady.
   * Null before DockviewHost mounts.
   */
  api: DockviewApi | null;

  /** ID of the currently active/focused panel. */
  activePanelId: PanelId | null;

  /** IDs of all panels currently open in the Dockview layout. */
  openPanelIds: PanelId[];

  /**
   * The last serialized layout snapshot.
   * Updated by the persistence hook on every layout change.
   * Used to restore the layout on page reload.
   */
  layout: SerializedLayout | null;

  // ---- Actions ----

  /** Set the DockviewApi reference (called from DockviewHost.onReady). */
  setApi: (api: DockviewApi) => void;

  /**
   * Open a panel of the given type.
   *
   * If a panel with the same ID is already open, focuses it instead.
   * The panel ID defaults to the type ID (one panel per type) unless
   * panelId is explicitly provided.
   *
   * @param definition - The panel type definition from the registry.
   * @param panelId - Optional explicit panel instance ID. Defaults to definition.id.
   */
  openPanel: (definition: PanelDefinition, panelId?: PanelId) => void;

  /**
   * Close a panel by its instance ID.
   * No-op if the panel is not open or the API is not ready.
   */
  closePanel: (panelId: PanelId) => void;

  /**
   * Focus (activate) an existing open panel.
   * No-op if the panel is not open or the API is not ready.
   */
  focusPanel: (panelId: PanelId) => void;

  /**
   * Minimize a panel to the tray bar.
   *
   * Removes the panel from Dockview and adds a TrayItem to trayStore.
   * The panel title and iconName are captured from the Dockview panel
   * params or the registered panel definition before removal.
   *
   * Implements US-115 (AC-7).
   */
  minimizePanel: (panelId: PanelId) => void;

  /**
   * Restore a minimized panel from the tray back to Dockview.
   *
   * Re-opens the panel via openPanel and removes it from trayStore.
   * If the panel type is not registered, logs a warning and only
   * removes it from the tray.
   *
   * Implements US-115 (AC-3).
   */
  restorePanel: (panelId: PanelId) => void;

  /**
   * Serialize the current Dockview layout to JSON.
   *
   * Returns null if the API is not ready.
   * The result can be stored in localStorage or a URL parameter.
   */
  serializeLayout: () => SerializedLayout | null;

  /**
   * Restore a previously serialized layout into Dockview.
   *
   * Called by DockviewHost on mount after the API is ready.
   * If the layout data is corrupted or incompatible, this method logs a warning
   * and leaves Dockview in its default empty state.
   *
   * @param api - The Dockview API (required because the store api may not be set yet when this runs)
   * @param layout - The serialized layout, or null to skip restoration.
   */
  restoreLayout: (api: DockviewApi, layout?: SerializedLayout | null) => void;

  /**
   * Update the stored layout snapshot.
   * Called by the persistence hook on every Dockview layout change event.
   */
  setLayout: (layout: SerializedLayout) => void;
}

export const usePanelStore = create<PanelStoreState>()((set, get) => ({
  api: null,
  activePanelId: null,
  openPanelIds: [],
  layout: null,

  setApi: (api) => {
    set({ api });
  },

  openPanel: (definition, panelId) => {
    const { api } = get();
    if (!api) return;

    const id = panelId ?? definition.id;

    // If the panel is already open, focus it rather than opening a duplicate
    const existingPanel = api.getPanel(id);
    if (existingPanel) {
      existingPanel.api.setActive();
      set({ activePanelId: id });
      return;
    }

    api.addPanel({
      id,
      title: definition.title,
      component: definition.id,
      params: {
        panelTypeId: definition.id,
        title: definition.title,
      },
    });

    set((state) => ({
      activePanelId: id,
      openPanelIds: state.openPanelIds.includes(id)
        ? state.openPanelIds
        : [...state.openPanelIds, id],
    }));
  },

  closePanel: (panelId) => {
    const { api } = get();
    if (!api) return;

    const panel = api.getPanel(panelId);
    if (!panel) return;

    api.removePanel(panel);

    set((state) => ({
      openPanelIds: state.openPanelIds.filter((id) => id !== panelId),
      activePanelId: state.activePanelId === panelId ? null : state.activePanelId,
    }));
  },

  focusPanel: (panelId) => {
    const { api } = get();
    if (!api) return;

    const panel = api.getPanel(panelId);
    if (!panel) return;

    panel.api.setActive();
    set({ activePanelId: panelId });
  },

  minimizePanel: (panelId) => {
    const { api } = get();
    if (!api) return;

    const panel = api.getPanel(panelId);
    if (!panel) return;

    // Capture title and iconName before removing from Dockview.
    // Prefer the live panel title; fall back to the registry definition.
    const title = panel.title ?? panelId;
    const panelTypeId = (panel.params as { panelTypeId?: string } | undefined)?.panelTypeId;
    const definition = panelTypeId ? getPanel(panelTypeId) : undefined;
    const iconName = definition?.iconName;

    // Add to tray before removing so the item is available immediately
    useTrayStore.getState().addToTray({ panelId, title, iconName });

    // Remove from Dockview
    api.removePanel(panel);

    set((state) => ({
      openPanelIds: state.openPanelIds.filter((id) => id !== panelId),
      activePanelId: state.activePanelId === panelId ? null : state.activePanelId,
    }));
  },

  restorePanel: (panelId) => {
    const { api } = get();

    // Remove from tray regardless of whether we can re-open it
    const trayItem = useTrayStore.getState().trayItems.find((t) => t.panelId === panelId);
    useTrayStore.getState().restoreFromTray(panelId);

    if (!api || !trayItem) return;

    // We need a registered panel definition to re-open.
    // Try to find it by panelId (which equals the type ID for single-instance panels).
    const definition = getPanel(panelId);
    if (!definition) {
      console.warn(
        `[panelStore] Cannot restore panel "${panelId}" — no registered definition found.`,
      );
      return;
    }

    get().openPanel(definition, panelId);
  },

  serializeLayout: () => {
    const { api } = get();
    if (!api) return null;
    return api.toJSON();
  },

  restoreLayout: (api, layout) => {
    // Determine what layout to restore:
    // 1. Use the explicitly passed layout argument if provided
    // 2. Fall back to the layout stored in state (from persistence hook)
    const targetLayout = layout !== undefined ? layout : get().layout;

    if (!targetLayout) return;

    try {
      api.fromJSON(targetLayout);

      // Sync open panel IDs from the restored layout
      const openIds = api.panels.map((p) => p.id);
      const activeId = api.activePanel?.id ?? null;
      set({ openPanelIds: openIds, activePanelId: activeId });
    } catch (err) {
      // Corrupted layout — log warning and leave Dockview in empty state
      console.warn('[panelStore] Failed to restore layout — layout may be corrupted.', err);
      set({ layout: null });
    }
  },

  setLayout: (layout) => {
    set({ layout });
  },

  // Ensure openPanelIds is always reconciled with the panel registry
  // when the panel type is looked up by ID.
  // (Consumers should prefer checking via api.panels directly for fresh data.)
}));

/**
 * Convenience selector: look up a PanelDefinition by type ID from the registry.
 * Used by sidebar and command palette to open panels by type.
 */
export function openPanelByTypeId(typeId: string, panelId?: PanelId): void {
  const definition = getPanel(typeId);
  if (!definition) {
    console.warn(`[panelStore] No panel registered for type ID: "${typeId}"`);
    return;
  }
  usePanelStore.getState().openPanel(definition, panelId);
}

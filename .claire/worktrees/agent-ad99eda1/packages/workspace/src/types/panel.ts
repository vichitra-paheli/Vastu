/**
 * panel.ts — core panel type definitions for the workspace.
 *
 * These types describe the Dockview-managed panels that make up the workspace
 * surface. Full panel implementation comes in US-107.
 */

/** Unique identifier for a panel within the Dockview layout. */
export type PanelId = string;

/**
 * Represents a panel registered in the workspace layout.
 * Each panel has an ID, a display title, and an optional icon key
 * (Tabler icon name used in the tray bar).
 */
export interface Panel {
  /** Unique identifier used by Dockview and stores. */
  id: PanelId;
  /** Human-readable display title shown in the panel tab. */
  title: string;
  /** Tabler icon name for this panel (used in tray bar). Optional. */
  iconName?: string;
}

/**
 * panel.ts — core panel type definitions for the workspace.
 *
 * These types describe the Dockview-managed panels that make up the workspace
 * surface. Full panel implementation in US-107.
 */

import type React from 'react';
import type { SerializedDockview } from 'dockview-core';

/** Unique identifier for a panel within the Dockview layout. */
export type PanelId = string;

/** Unique identifier for a panel type in the registry. */
export type PanelTypeId = string;

/**
 * Represents a panel instance registered in the workspace layout.
 * Each panel has an ID, a display title, and an optional icon key.
 */
export interface Panel {
  /** Unique identifier used by Dockview and stores. */
  id: PanelId;
  /** Human-readable display title shown in the panel tab. */
  title: string;
  /** Tabler icon name for this panel (used in tray bar). Optional. */
  iconName?: string;
}

/**
 * Defines a panel type in the registry.
 *
 * Each panel type has a stable ID, a default title, an optional icon,
 * and the React component that renders its content.
 */
export interface PanelDefinition {
  /** Stable panel type identifier used in Dockview component registry. */
  id: PanelTypeId;
  /** Default display title shown in the tab. */
  title: string;
  /** Tabler icon name used in the tab and tray. Optional. */
  iconName?: string;
  /** The React component that renders panel content. */
  component: React.ComponentType<PanelProps>;
}

/**
 * Props passed to every panel component by Dockview.
 * Includes the panel's own params plus the Dockview API handles.
 */
export interface PanelParams {
  /** The panel type ID (matches PanelDefinition.id). */
  panelTypeId: PanelTypeId;
  /** Optional custom title to override the default. */
  title?: string;
  /** Any additional data for the panel. */
  [key: string]: unknown;
}

/** Alias for Dockview's panel props used by panel content components. */
export type PanelProps = {
  params: PanelParams;
};

/**
 * Serializable snapshot of the Dockview layout.
 * Used for localStorage persistence and URL sharing (AC-7, AC-8, AC-9).
 */
export type SerializedLayout = SerializedDockview;

/**
 * State for a single open panel (supplementary to Dockview's own state).
 */
export interface PanelState {
  /** Panel instance ID. */
  id: PanelId;
  /** Panel type ID (matches PanelDefinition.id). */
  panelTypeId: PanelTypeId;
  /** Display title. */
  title: string;
}

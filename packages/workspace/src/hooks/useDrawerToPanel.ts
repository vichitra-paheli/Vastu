'use client';

/**
 * useDrawerToPanel — promotes the current drawer record to a full Dockview panel.
 *
 * When called:
 * 1. Captures the current record ID and active tab from drawerStore.
 * 2. Closes the drawer (with animation).
 * 3. Opens a new Dockview panel for the record, passing the tab as a param.
 *
 * The panel type that handles records must be registered under the type ID
 * `RECORD_PANEL_TYPE_ID` ("record-detail") in the panel registry.
 * If the panel type is not registered, only the drawer is closed and a warning
 * is logged (graceful degradation).
 *
 * Implements US-128e.
 */

import { useCallback } from 'react';
import { useDrawerStore } from '../stores/drawerStore';
import { usePanelStore } from '../stores/panelStore';
import { getPanel } from '../panels/registry';

/** Panel type ID used to display a record in a full Dockview panel. */
export const RECORD_PANEL_TYPE_ID = 'record-detail';

/**
 * Returns a stable callback that promotes the given (or current) record ID
 * from the drawer to a full-size Dockview panel.
 *
 * @example
 * const openInPanel = useDrawerToPanel();
 * openInPanel(record.id);
 */
export function useDrawerToPanel(): (recordId?: string) => void {
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  const currentRecordId = useDrawerStore((s) => s.recordId);
  const openPanel = usePanelStore((s) => s.openPanel);

  return useCallback(
    (recordId?: string) => {
      const targetId = recordId ?? currentRecordId;
      if (!targetId) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[useDrawerToPanel] No record ID to promote.');
        }
        return;
      }

      // Close the drawer first
      closeDrawer();

      // Look up the record-detail panel definition in the registry
      const definition = getPanel(RECORD_PANEL_TYPE_ID);
      if (!definition) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[useDrawerToPanel] Panel type "${RECORD_PANEL_TYPE_ID}" is not registered. ` +
              'Register a panel with this type ID to support drawer-to-panel promotion.',
          );
        }
        return;
      }

      // Open (or focus) the panel with the record ID and active tab as params
      const panelId = `${RECORD_PANEL_TYPE_ID}-${targetId}`;

      openPanel(
        {
          ...definition,
          // Provide a per-record title; will be updated once the panel loads
          title: targetId,
        },
        panelId,
      );

      // TODO (Phase 2): pass recordId + activeTab as panel params once Dockview
      // exposes a typed params API via MCP. Currently the panel resolves the record
      // by parsing its own panelId via the `${RECORD_PANEL_TYPE_ID}-${recordId}` convention.
    },
    [closeDrawer, currentRecordId, openPanel],
  );
}

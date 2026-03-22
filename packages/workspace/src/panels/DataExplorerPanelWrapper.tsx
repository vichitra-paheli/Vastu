'use client';

/**
 * DataExplorerPanelWrapper — adapts PanelProps to DataExplorerPanel.
 *
 * Extracts the pageId from panel params and renders the DataExplorerPanel
 * which calls useTemplateConfig internally. Falls back to a default pageId
 * when the panel is opened without one (e.g. from the command palette).
 *
 * Implements US-132.
 */

import React from 'react';
import { DataExplorerPanel } from '../templates/DataExplorer';
import type { PanelProps } from '../types/panel';

/**
 * Thin adapter between the Dockview panel system and the DataExplorer template.
 * Reads `pageId` from panel params, defaulting to 'data-explorer-default'.
 */
export function DataExplorerPanelWrapper({ params }: PanelProps) {
  const pageId =
    typeof params.pageId === 'string' && params.pageId.length > 0
      ? params.pageId
      : 'data-explorer-default';

  return <DataExplorerPanel pageId={pageId} />;
}

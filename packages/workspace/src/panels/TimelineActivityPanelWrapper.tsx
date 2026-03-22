'use client';

/**
 * TimelineActivityPanelWrapper — adapts PanelProps to TimelineActivityTemplate.
 *
 * Extracts the pageId from panel params and renders the TimelineActivityTemplate
 * which manages its own fetch and filter state. Falls back to a default pageId
 * when the panel is opened without one (e.g. from the command palette).
 *
 * Implements US-134.
 */

import React from 'react';
import { TimelineActivityTemplate } from '../templates/TimelineActivity/TimelineActivityTemplate';
import type { PanelProps } from '../types/panel';

/**
 * Thin adapter between the Dockview panel system and the timeline-activity template.
 * Reads `pageId` from panel params, defaulting to 'timeline-activity-default'.
 */
export function TimelineActivityPanelWrapper({ params }: PanelProps) {
  const pageId =
    typeof params.pageId === 'string' && params.pageId.length > 0
      ? params.pageId
      : 'timeline-activity-default';

  return (
    <TimelineActivityTemplate
      pageId={pageId}
      config={{ templateType: 'timeline-activity' }}
    />
  );
}

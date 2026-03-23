'use client';

/**
 * useNavigateToPage — hook for cross-page navigation in the workspace.
 *
 * Returns a `navigateToPage(intent)` function that:
 *   1. Resolves the target panel type from the page/panel registry.
 *   2. Generates a unique panel instance ID for the navigation target.
 *   3. Stores the NavigationIntent in navigationStore keyed by that panel ID.
 *   4. Opens the target panel via panelStore.openPanel (or focuses it if already open).
 *
 * If the target page is already open (same page type), it focuses the existing
 * panel and updates its intent. If `forceNewPanel` is true, a new panel instance
 * is always created (⌘+Click behavior per AC-3).
 *
 * Implements US-209b (VASTU-2A-209).
 */

import { useCallback } from 'react';
import { usePanelStore } from '../stores/panelStore';
import { useNavigationStore } from '../stores/navigationStore';
import { getPanel } from '../panels/registry';
import { getPageById } from '../pages/registry';
import type { NavigationIntent } from './types';

export interface UseNavigateToPageReturn {
  /**
   * Navigate to the target page with the given intent.
   *
   * @param intent        - The navigation intent (required: targetPageId).
   * @param forceNewPanel - When true, always opens a new panel instance.
   *                        Used for ⌘+Click / Ctrl+Click (AC-3).
   */
  navigateToPage: (intent: NavigationIntent, forceNewPanel?: boolean) => void;

  /**
   * Whether the target page ID is registered (panel or page registry).
   * Returns false if the page is not configured — callers can show a tooltip.
   *
   * @param targetPageId - The page ID to check.
   */
  isPageRegistered: (targetPageId: string) => boolean;
}

/**
 * Generate a stable panel instance ID for a navigation target.
 *
 * When `forceNewPanel` is false, we use the page ID as the panel instance ID
 * so navigating to the same page repeatedly focuses the existing panel.
 *
 * When `forceNewPanel` is true, we append a UUID to guarantee uniqueness
 * even when multiple navigations happen in rapid succession (avoids Date.now()
 * collisions that could occur within the same millisecond).
 */
function resolvePanelId(targetPageId: string, forceNewPanel: boolean): string {
  if (forceNewPanel) {
    return `${targetPageId}--${crypto.randomUUID()}`;
  }
  return targetPageId;
}

/**
 * useNavigateToPage
 *
 * @returns An object with `navigateToPage` and `isPageRegistered` helpers.
 */
export function useNavigateToPage(): UseNavigateToPageReturn {
  const openPanel = usePanelStore((s) => s.openPanel);
  const focusPanel = usePanelStore((s) => s.focusPanel);
  const openPanelIds = usePanelStore((s) => s.openPanelIds);
  const setIntent = useNavigationStore((s) => s.setIntent);

  const navigateToPage = useCallback(
    (intent: NavigationIntent, forceNewPanel = false) => {
      const { targetPageId } = intent;

      // Resolve the panel definition — try panel registry first, then page registry.
      // Page registry pages have a matching panel type registered via registerPagePanels().
      const definition = getPanel(targetPageId);
      if (!definition) {
        console.warn(
          `[useNavigateToPage] No panel registered for page "${targetPageId}". ` +
            'Has the page been registered via PageRegistry and registerPagePanels()?',
        );
        return;
      }

      const panelId = resolvePanelId(targetPageId, forceNewPanel);
      const isAlreadyOpen = openPanelIds.includes(panelId);

      // Store the intent before opening/focusing so the panel can read it on mount.
      setIntent(panelId, intent);

      if (isAlreadyOpen && !forceNewPanel) {
        // Panel is already open: focus it. The panel will re-read the intent.
        focusPanel(panelId);
      } else {
        // Open a new panel instance with the intent in its initial params.
        openPanel(definition, panelId);
      }
    },
    [openPanel, focusPanel, openPanelIds, setIntent],
  );

  const isPageRegistered = useCallback((targetPageId: string): boolean => {
    // Check both the panel registry and the page registry.
    return getPanel(targetPageId) !== undefined || getPageById(targetPageId) !== undefined;
  }, []);

  return { navigateToPage, isPageRegistered };
}

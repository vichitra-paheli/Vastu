/**
 * navigation/types.ts — cross-page navigation intent types.
 *
 * Defines the contract for cross-page navigation in the workspace.
 * A NavigationIntent describes where to navigate and what context to pass
 * to the target page (record ID, filters, etc.).
 *
 * Usage:
 *   const navigate = useNavigateToPage();
 *   navigate({
 *     targetPageId: 'f1-driver-profile',
 *     recordId: driverId,
 *   });
 *
 * Implements US-209 (VASTU-2A-209).
 */

/**
 * A navigation intent — describes a cross-page navigation action.
 *
 * Produced by LinkCell clicks and consumed by the useNavigateToPage hook.
 * The intent is stored in navigationStore keyed by the new panel's ID
 * so the target page can read and clear it on mount.
 */
export interface NavigationIntent {
  /**
   * The page ID to navigate to.
   * Must match a registered PageDefinition or panel type ID.
   */
  targetPageId: string;

  /**
   * Optional record ID to pre-select in the target page.
   * The target page reads this from the navigation store on mount.
   */
  recordId?: string;

  /**
   * Optional initial filter parameters to apply to the target page.
   * Keyed by column/field name, value is the filter value.
   */
  params?: Record<string, string>;

  /**
   * Optional filter state to pre-apply on the target page.
   * Useful for drilling from a chart or summary cell into a filtered list.
   */
  filters?: Record<string, unknown>;

  /**
   * Optional record ID to focus/highlight in the target page after load.
   * When combined with recordId, recordId selects the entity and
   * focusRecordId scrolls/highlights a specific row.
   */
  focusRecordId?: string;

  /**
   * The page ID of the source page that triggered this navigation.
   * Used to render the "← Back to {sourcePage}" breadcrumb in the target panel.
   */
  sourcePageId?: string;

  /**
   * The display name of the source page.
   * Used in the breadcrumb label: "← Back to {sourcePageName}".
   */
  sourcePageName?: string;
}

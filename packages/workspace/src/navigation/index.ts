/**
 * navigation/index.ts — barrel export for cross-page navigation.
 *
 * Implements US-209 (VASTU-2A-209).
 */

export type { NavigationIntent } from './types';
export { useNavigateToPage } from './useNavigateToPage';
export type { UseNavigateToPageReturn } from './useNavigateToPage';

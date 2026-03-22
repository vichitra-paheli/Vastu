/**
 * ConfirmDialog public API.
 * Shared confirmation modal for destructive actions.
 * Implements US-138 (AC-1, AC-2, AC-3, AC-4, AC-5).
 */

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps, ConfirmDialogVariant } from './ConfirmDialog';

export { ConfirmDialogProvider } from './ConfirmDialogProvider';
export type { ConfirmDialogProviderProps } from './ConfirmDialogProvider';

export { useConfirmDialog } from './useConfirmDialog';
export type { ConfirmOptions } from './useConfirmDialog';

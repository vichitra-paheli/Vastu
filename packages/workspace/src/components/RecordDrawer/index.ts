/**
 * RecordDrawer public API.
 * Slide-in record detail panel with tabs, navigation, and drawer-to-panel promotion.
 * Implements US-128.
 */

export { RecordDrawer } from './RecordDrawer';
export type { RecordDetail, RecordDrawerProps } from './RecordDrawer';

export { RecordDrawerHeader } from './RecordDrawerHeader';
export { RecordDrawerFooter } from './RecordDrawerFooter';

export { DetailsTab } from './tabs/DetailsTab';
export { ItemsTab } from './tabs/ItemsTab';
export { HistoryTab } from './tabs/HistoryTab';
export type { HistoryEvent } from './tabs/HistoryTab';
export { NotesTab } from './tabs/NotesTab';
export type { NoteEntry } from './tabs/NotesTab';
export { PermissionsTab } from './tabs/PermissionsTab';
export type { PermissionEntry } from './tabs/PermissionsTab';

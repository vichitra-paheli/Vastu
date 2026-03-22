/**
 * useCommandPaletteActions — aggregates action sources for the command palette.
 *
 * Sources:
 *   - Pages: registered panels from the panel registry
 *   - Recent records: from localStorage key `vastu-recent-records`
 *   - Commands: static workspace commands (toggle sidebar, new panel, etc.)
 *
 * When query starts with ">" it switches to commands-only mode.
 * Returns filtered and grouped actions based on the current search query.
 *
 * Implements US-125b.
 */

import { useMemo } from 'react';
import { getAllPanels } from '../panels/registry';
import { useSidebarStore } from '../stores/sidebarStore';

/** The localStorage key for recent records. */
export const RECENT_RECORDS_STORAGE_KEY = 'vastu-recent-records';

/** Maximum number of recent records to display in the command palette. */
const MAX_RECENT_RECORDS = 5;

/** A single recent record entry stored in localStorage. */
export interface RecentRecord {
  id: string;
  title: string;
  type: string;
  pageId: string;
  timestamp: number;
}

/** Result group identifier. */
export type ActionGroup = 'pages' | 'recent' | 'commands';

/** A single command palette action item. */
export interface CommandPaletteAction {
  /** Unique ID for the action. */
  id: string;
  /** Display label. */
  label: string;
  /** Which group this action belongs to. */
  group: ActionGroup;
  /** Optional description shown as secondary text. */
  description?: string;
  /** Tabler icon name (without the "Icon" prefix). */
  iconName?: string;
  /** Extra metadata (template type for pages, record type for records). */
  meta?: string;
  /** For pages: the panel type ID to open. */
  panelTypeId?: string;
  /** For records: the record ID. */
  recordId?: string;
  /** For records: the page that hosts the record. */
  pageId?: string;
  /** The callback to run when the item is activated. */
  onActivate?: () => void;
}

/** Grouped action result returned by the hook. */
export interface GroupedActions {
  pages: CommandPaletteAction[];
  recent: CommandPaletteAction[];
  commands: CommandPaletteAction[];
  /** Whether the current query triggers commands-only mode (starts with ">"). */
  commandsOnly: boolean;
  /** Total count of visible actions. */
  total: number;
}

/** Read and parse recent records from localStorage. */
function readRecentRecords(): RecentRecord[] {
  try {
    const raw = typeof window !== 'undefined'
      ? window.localStorage.getItem(RECENT_RECORDS_STORAGE_KEY)
      : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as RecentRecord[])
      .filter(
        (r) =>
          typeof r === 'object' &&
          r !== null &&
          typeof r.id === 'string' &&
          typeof r.title === 'string' &&
          typeof r.type === 'string' &&
          typeof r.pageId === 'string' &&
          typeof r.timestamp === 'number',
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT_RECORDS);
  } catch {
    return [];
  }
}

/** Persist a recent record to localStorage. */
export function addRecentRecord(record: Omit<RecentRecord, 'timestamp'>): void {
  try {
    const existing = readRecentRecords();
    const filtered = existing.filter((r) => r.id !== record.id);
    const updated: RecentRecord[] = [
      { ...record, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_RECORDS);
    window.localStorage.setItem(RECENT_RECORDS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors (private browsing, quota exceeded, etc.)
  }
}

/** Static workspace commands. */
function buildStaticCommands(
  toggleSidebar: () => void,
): CommandPaletteAction[] {
  return [
    {
      id: 'cmd:toggle-sidebar',
      label: 'Toggle sidebar',
      group: 'commands',
      description: 'Show or hide the left sidebar',
      iconName: 'LayoutSidebar',
      onActivate: toggleSidebar,
    },
    {
      id: 'cmd:new-panel',
      label: 'New panel',
      group: 'commands',
      description: 'Open a new panel in the workspace',
      iconName: 'Plus',
    },
    {
      id: 'cmd:close-all',
      label: 'Close all panels',
      group: 'commands',
      description: 'Close all open panels',
      iconName: 'X',
    },
    {
      id: 'cmd:settings',
      label: 'Open settings',
      group: 'commands',
      description: 'Navigate to the settings page',
      iconName: 'Settings',
    },
    {
      id: 'cmd:help',
      label: 'Keyboard shortcuts',
      group: 'commands',
      description: 'View all keyboard shortcuts',
      iconName: 'Keyboard',
    },
  ];
}

/** Case-insensitive substring match: does label contain the query? */
function matches(label: string, query: string): boolean {
  return label.toLowerCase().includes(query.toLowerCase());
}

/**
 * useCommandPaletteActions
 *
 * @param query - Raw search string from the Spotlight input (may start with ">").
 * @returns Grouped and filtered actions.
 */
export function useCommandPaletteActions(query: string): GroupedActions {
  const toggleSidebar = useSidebarStore((state) => state.toggle);

  return useMemo(() => {
    const commandsOnly = query.startsWith('>');
    // Strip the ">" prefix for matching
    const effectiveQuery = commandsOnly ? query.slice(1).trimStart() : query;

    // ---- Pages ----
    const allPanels = getAllPanels();
    const pageActions: CommandPaletteAction[] = allPanels.map((def) => ({
      id: `page:${def.id}`,
      label: def.title,
      group: 'pages' as ActionGroup,
      iconName: def.iconName,
      panelTypeId: def.id,
    }));

    // ---- Recent records ----
    const recentRecords = readRecentRecords();
    const recentActions: CommandPaletteAction[] = recentRecords.map((rec) => ({
      id: `recent:${rec.id}`,
      label: rec.title,
      group: 'recent' as ActionGroup,
      meta: rec.type,
      recordId: rec.id,
      pageId: rec.pageId,
    }));

    // ---- Commands ----
    const commandActions = buildStaticCommands(toggleSidebar);

    if (commandsOnly) {
      const filteredCommands =
        effectiveQuery.length === 0
          ? commandActions
          : commandActions.filter((a) => matches(a.label, effectiveQuery));

      return {
        pages: [],
        recent: [],
        commands: filteredCommands,
        commandsOnly: true,
        total: filteredCommands.length,
      };
    }

    if (effectiveQuery.length === 0) {
      // Empty query: show all groups
      return {
        pages: pageActions,
        recent: recentActions,
        commands: commandActions,
        commandsOnly: false,
        total: pageActions.length + recentActions.length + commandActions.length,
      };
    }

    // Filter each group by the query
    const filteredPages = pageActions.filter((a) => matches(a.label, effectiveQuery));
    const filteredRecent = recentActions.filter((a) => matches(a.label, effectiveQuery));
    const filteredCommands = commandActions.filter((a) => matches(a.label, effectiveQuery));

    return {
      pages: filteredPages,
      recent: filteredRecent,
      commands: filteredCommands,
      commandsOnly: false,
      total: filteredPages.length + filteredRecent.length + filteredCommands.length,
    };
  }, [query, toggleSidebar]);
}

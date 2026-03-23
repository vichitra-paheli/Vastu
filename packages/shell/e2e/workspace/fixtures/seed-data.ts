/**
 * Seed data helpers for workspace E2E tests.
 *
 * These helpers provide in-memory test data that mirrors what the seeded
 * database contains (packages/shared/prisma/seed.ts). The data is used
 * to assert against expected UI content without requiring a live database
 * connection in tests that are not marked as Docker-required.
 *
 * For tests that interact with live data (Docker-required), use the
 * DATABASE_URL environment variable and the auth-setup.ts session seeding.
 *
 * Seed user IDs and credentials match auth-setup.ts and fixtures.ts.
 */

import { TEST_USERS } from '../../fixtures';

// ---------------------------------------------------------------------------
// Seed users
// ---------------------------------------------------------------------------

/**
 * Workspace seed users — extends TEST_USERS from shell fixtures with
 * workspace-specific fields (id, role) that are not needed in shell auth tests.
 *
 * Credentials (email/password) are sourced from the canonical TEST_USERS so
 * that there is a single source of truth and no duplication.
 */
export const SEED_USERS = {
  admin: {
    id: 'cccccccc-0000-4000-a000-000000000001',
    email: TEST_USERS.admin.email,
    password: TEST_USERS.admin.password,
    name: TEST_USERS.admin.name,
    role: TEST_USERS.admin.role,
  },
  editor: {
    id: 'cccccccc-0000-4000-a000-000000000002',
    email: TEST_USERS.editor.email,
    password: TEST_USERS.editor.password,
    name: TEST_USERS.editor.name,
    role: TEST_USERS.editor.role,
  },
  viewer: {
    id: 'cccccccc-0000-4000-a000-000000000003',
    email: TEST_USERS.viewer.email,
    password: TEST_USERS.viewer.password,
    name: TEST_USERS.viewer.name,
    role: TEST_USERS.viewer.role,
  },
} as const;

// ---------------------------------------------------------------------------
// Mock page registry (matches SidebarNav MOCK_PAGES)
// ---------------------------------------------------------------------------

/**
 * Pages that appear in the SidebarNav PAGES section.
 * These match the MOCK_PAGES constant in SidebarNav/mockPages.ts.
 */
export const MOCK_SIDEBAR_PAGES = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard' },
  { id: 'contacts', label: 'Contacts', iconName: 'Users' },
  { id: 'orders', label: 'Orders', iconName: 'ShoppingCart' },
  { id: 'products', label: 'Products', iconName: 'Package' },
  { id: 'analytics', label: 'Analytics', iconName: 'ChartBar' },
  { id: 'reports', label: 'Reports', iconName: 'FileText' },
  { id: 'invoices', label: 'Invoices', iconName: 'Receipt' },
] as const;

/** Page IDs available in the sidebar (for opening panels). */
export const SIDEBAR_PAGE_IDS = MOCK_SIDEBAR_PAGES.map((p) => p.id);

/** First sidebar page — used as default target in tests. */
export const FIRST_SIDEBAR_PAGE = MOCK_SIDEBAR_PAGES[0];

// ---------------------------------------------------------------------------
// Command palette actions
// ---------------------------------------------------------------------------

/**
 * Commands available in the command palette COMMANDS group.
 * These match the built-in commands registered via useCommandPaletteActions
 * (packages/workspace/src/hooks/useCommandPaletteActions.ts).
 * Update this list whenever buildStaticCommands changes.
 */
export const BUILT_IN_COMMANDS = [
  'Toggle sidebar',
  'New panel',
  'Close all panels',
  'Open settings',
  'Keyboard shortcuts',
] as const;

// ---------------------------------------------------------------------------
// Sample table data (for VastuTable E2E scenarios)
// ---------------------------------------------------------------------------

/**
 * Sample tabular records that match the shape used in DataExplorer / TableListing.
 * Used to set up in-memory table state for sort/filter tests.
 *
 * Note: In tests that render the actual workspace, the table data comes from
 * the seeded database. These constants are used for documentation and assertions.
 */
export interface SampleRecord {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'pending';
  amount: number;
  createdAt: string;
}

export const SAMPLE_TABLE_RECORDS: SampleRecord[] = [
  { id: 'rec-001', name: 'Alpha Corp', status: 'active', amount: 1200, createdAt: '2024-01-15' },
  { id: 'rec-002', name: 'Beta Ltd', status: 'inactive', amount: 450, createdAt: '2024-02-03' },
  { id: 'rec-003', name: 'Gamma Inc', status: 'pending', amount: 3200, createdAt: '2024-03-22' },
  { id: 'rec-004', name: 'Delta GmbH', status: 'active', amount: 780, createdAt: '2024-04-10' },
  { id: 'rec-005', name: 'Epsilon SA', status: 'active', amount: 5400, createdAt: '2024-05-01' },
];

/** Expected sort order for SAMPLE_TABLE_RECORDS by name ASC. */
export const SORTED_BY_NAME_ASC = [...SAMPLE_TABLE_RECORDS].sort((a, b) =>
  a.name.localeCompare(b.name),
);

/** Expected sort order for SAMPLE_TABLE_RECORDS by amount DESC. */
export const SORTED_BY_AMOUNT_DESC = [...SAMPLE_TABLE_RECORDS].sort(
  (a, b) => b.amount - a.amount,
);

/** Records filtered to status === 'active'. */
export const ACTIVE_RECORDS = SAMPLE_TABLE_RECORDS.filter((r) => r.status === 'active');

// ---------------------------------------------------------------------------
// View fixtures
// ---------------------------------------------------------------------------

/**
 * Sample saved views used in view save/load E2E tests.
 * These represent views that would be persisted to the database.
 */
export interface SampleView {
  id: string;
  name: string;
  pageId: string;
  createdBy: string;
  isShared: boolean;
  /**
   * Hex color string stored in the database as serialized view state.
   * These are raw persisted values, NOT UI-rendered colors — CSS custom
   * properties (--v-*) do not apply here. The hex value is stored as-is
   * and rendered into a small color dot indicator in the ViewSelector.
   */
  colorDot: string;
}

export const SAMPLE_VIEWS: SampleView[] = [
  {
    id: 'view-001',
    name: 'My Default View',
    pageId: 'dashboard',
    createdBy: SEED_USERS.admin.id,
    isShared: false,
    colorDot: '#4dabf7',
  },
  {
    id: 'view-002',
    name: 'Active Records Only',
    pageId: 'contacts',
    createdBy: SEED_USERS.admin.id,
    isShared: true,
    colorDot: '#69db7c',
  },
  {
    id: 'view-003',
    name: 'High Value Orders',
    pageId: 'orders',
    createdBy: SEED_USERS.editor.id,
    isShared: true,
    colorDot: '#ffa94d',
  },
];

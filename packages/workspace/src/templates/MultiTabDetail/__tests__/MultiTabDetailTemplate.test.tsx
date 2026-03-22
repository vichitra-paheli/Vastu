/**
 * MultiTabDetailTemplate component tests.
 *
 * Covers:
 * 1. Renders entity header with name, subtitle, and status
 * 2. Tab switching updates the active tab
 * 3. Overview tab renders field-value grid
 * 4. Sub-tables render inside overview
 * 5. Loading state shows skeleton
 * 6. Empty fields state
 * 7. Entity error state renders message and retry button
 * 8. Permissions tab hidden for non-admin users
 *
 * Implements US-131c.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { AbilityProvider, createNoOpAbility } from '../../../providers/AbilityContext';
import { defineAbilitiesFor } from '@vastu/shared/permissions';
import type { AppAbility } from '@vastu/shared/permissions';
import { MultiTabDetailTemplate } from '../MultiTabDetailTemplate';
import { EntityHeader } from '../EntityHeader';
import { OverviewTab } from '../tabs/OverviewTab';
import type { EntityData } from '../MultiTabDetailTemplate';
import type { EntityAction } from '../EntityHeader';
import type { OverviewField, SubTableConfig, ActivityEntry } from '../tabs/OverviewTab';
import type { VastuColumn } from '../../../components/VastuTable/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock useTemplateConfig to avoid network calls in tests
vi.mock('../../useTemplateConfig', () => ({
  useTemplateConfig: () => ({
    config: { templateType: 'multi-tab-detail', fields: [], sections: [], metadata: {} },
    loading: false,
    error: null,
    updateConfig: vi.fn(),
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Admin ability: can('manage', 'all'). */
function adminAbility(): AppAbility {
  return defineAbilitiesFor({
    roles: [{ name: 'admin', isSystem: true, permissions: [] }],
  });
}

/** Viewer ability: no permissions (uses no-op). */
function viewerAbility(): AppAbility {
  return createNoOpAbility();
}

const SAMPLE_ENTITY: EntityData = {
  id: 'entity-1',
  name: 'Acme Corp',
  subtitle: 'Customer',
  status: 'Active',
  initials: 'AC',
};

const SAMPLE_ACTIONS: EntityAction[] = [
  { key: 'edit', label: 'Edit', onClick: vi.fn() },
  { key: 'delete', label: 'Delete', onClick: vi.fn() },
];

const SAMPLE_FIELDS: OverviewField[] = [
  { key: 'industry', label: 'Industry', value: 'Technology' },
  { key: 'revenue', label: 'Revenue', value: 5_000_000 },
  { key: 'founded', label: 'Founded', value: 2015 },
];

const SUBTABLE_COLUMNS: VastuColumn<Record<string, unknown>>[] = [
  { id: 'title', label: 'Title', accessorKey: 'title', dataType: 'text' },
  { id: 'status', label: 'Status', accessorKey: 'status', dataType: 'text' },
];

const SAMPLE_SUB_TABLES: SubTableConfig[] = [
  {
    id: 'contacts',
    title: 'Contacts',
    columns: SUBTABLE_COLUMNS,
    rows: [
      { id: 'c1', title: 'Alice Johnson', status: 'Active' },
      { id: 'c2', title: 'Bob Smith', status: 'Inactive' },
    ],
  },
];

const SAMPLE_ACTIVITY: ActivityEntry[] = [
  {
    id: 'a1',
    actor: 'Alice',
    action: 'Updated status to Active',
    timestamp: new Date(Date.now() - 60_000).toISOString(), // 1 minute ago
  },
  {
    id: 'a2',
    actor: 'Bob',
    action: 'Added note',
    timestamp: new Date(Date.now() - 3_600_000).toISOString(), // 1 hour ago
  },
];

interface RenderOptions {
  entity?: EntityData;
  actions?: EntityAction[];
  entityLoading?: boolean;
  entityError?: string | null;
  onRetry?: () => void;
  ability?: AppAbility;
}

function renderTemplate(opts: RenderOptions = {}) {
  const {
    entity = SAMPLE_ENTITY,
    actions = SAMPLE_ACTIONS,
    entityLoading = false,
    entityError = null,
    onRetry,
    ability = viewerAbility(),
  } = opts;

  return render(
    <AbilityProvider ability={ability}>
      <MultiTabDetailTemplate
        pageId="test-page"
        entity={entity}
        actions={actions}
        overviewProps={{
          fields: SAMPLE_FIELDS,
          subTables: SAMPLE_SUB_TABLES,
          activity: SAMPLE_ACTIVITY,
        }}
        entityLoading={entityLoading}
        entityError={entityError}
        onRetry={onRetry}
      />
    </AbilityProvider>,
    { wrapper: TestProviders },
  );
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('MultiTabDetailTemplate', () => {
  beforeEach(() => {
    // Reset URL search params before each test
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders entity header
  it('renders the entity header with name, subtitle, and status badge', () => {
    renderTemplate();

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  // 2. Tab switching
  it('switches tabs when a different tab is clicked', async () => {
    renderTemplate();

    // Initially on Overview
    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // Click Activity tab
    const activityTab = screen.getByRole('tab', { name: /activity/i });
    fireEvent.click(activityTab);

    await waitFor(() => {
      expect(activityTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  // 3. Overview tab renders field-value grid
  it('renders the field-value grid in the overview tab', () => {
    renderTemplate();

    expect(screen.getByText('Industry')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('5000000')).toBeInTheDocument();
  });

  // 4. Sub-tables render in overview
  it('renders sub-table titles and data in the overview tab', () => {
    renderTemplate();

    // Sub-table title should appear
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    // The sub-tables section container should be present
    expect(screen.getByRole('region', { name: 'Related records' })).toBeInTheDocument();
  });

  // 5. Loading state
  it('renders the template skeleton when entityLoading is true', () => {
    renderTemplate({ entityLoading: true });

    // TemplateSkeleton with multi-tab-detail variant renders a role="status"
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  // 6. Empty fields state
  it('renders empty message when no fields are provided', () => {
    render(
      <AbilityProvider ability={viewerAbility()}>
        <MultiTabDetailTemplate
          pageId="test-page"
          entity={SAMPLE_ENTITY}
          overviewProps={{ fields: [] }}
        />
      </AbilityProvider>,
      { wrapper: TestProviders },
    );

    expect(screen.getByText(/no fields to display/i)).toBeInTheDocument();
  });

  // 7. Entity error state
  it('renders the error state with retry button when entityError is set', () => {
    const onRetry = vi.fn();
    renderTemplate({ entityError: 'Failed to load entity data', onRetry });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    // Error title (from i18n)
    expect(screen.getByText(/failed to load entity$/i)).toBeInTheDocument();
    // Error message (the entityError prop value)
    expect(screen.getByText('Failed to load entity data')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // 8. Permissions tab visibility (RBAC)
  it('hides the Permissions tab for non-admin users', () => {
    renderTemplate({ ability: viewerAbility() });

    const tabs = screen.getAllByRole('tab');
    const tabLabels = tabs.map((t) => t.textContent ?? '');
    expect(tabLabels).not.toContain('Permissions');
  });

  it('shows the Permissions tab for admin users', () => {
    renderTemplate({ ability: adminAbility() });

    expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument();
  });
});

// ── EntityHeader standalone tests ─────────────────────────────────────────────

describe('EntityHeader', () => {
  it('renders loading skeleton when loading=true', () => {
    render(
      <EntityHeader name="Test Entity" loading={true} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders name, subtitle, and status badge', () => {
    render(
      <EntityHeader
        name="ACME Corp"
        subtitle="Enterprise customer"
        status="Active"
        initials="AC"
      />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText('ACME Corp')).toBeInTheDocument();
    expect(screen.getByText('Enterprise customer')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders action buttons with correct labels', () => {
    const onEdit = vi.fn();
    const actions: EntityAction[] = [
      { key: 'edit', label: 'Edit Record', onClick: onEdit, primary: true },
    ];

    render(
      <EntityHeader name="Test" actions={actions} />,
      { wrapper: TestProviders },
    );

    const editBtn = screen.getByRole('button', { name: /edit record/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders initials in the avatar slot', () => {
    render(
      <EntityHeader name="Vastu Corp" initials="VC" />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText('VC')).toBeInTheDocument();
  });
});

// ── OverviewTab standalone tests ──────────────────────────────────────────────

describe('OverviewTab', () => {
  it('renders fields section skeleton while loading', () => {
    render(
      <OverviewTab loading={true} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders all field labels and values', () => {
    render(
      <OverviewTab fields={SAMPLE_FIELDS} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText('Industry')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Founded')).toBeInTheDocument();
    expect(screen.getByText('2015')).toBeInTheDocument();
  });

  it('renders sub-table with title and data rows', () => {
    render(
      <OverviewTab subTables={SAMPLE_SUB_TABLES} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText('Contacts')).toBeInTheDocument();
    // VastuTable renders data cells — check via container query
    const allText = screen.getByRole('region', { name: 'Related records' });
    expect(allText).toBeInTheDocument();
  });

  it('renders activity feed entries', () => {
    render(
      <OverviewTab activity={SAMPLE_ACTIVITY} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Updated status to Active')).toBeInTheDocument();
  });

  it('renders empty activity message when activity array is empty', () => {
    render(
      <OverviewTab activity={[]} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText(/no activity recorded/i)).toBeInTheDocument();
  });

  it('formats boolean values correctly', () => {
    const fields: OverviewField[] = [
      { key: 'active', label: 'Is Active', value: true },
      { key: 'deleted', label: 'Is Deleted', value: false },
    ];

    render(
      <OverviewTab fields={fields} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders dash for null/undefined field values', () => {
    const fields: OverviewField[] = [
      { key: 'empty', label: 'Empty Field', value: null },
    ];

    render(
      <OverviewTab fields={fields} />,
      { wrapper: TestProviders },
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

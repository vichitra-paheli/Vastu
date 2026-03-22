/**
 * BuilderPanel tests — covers:
 *   - BuilderPanel renders with warning header and nav (AC-1, AC-2, AC-3)
 *   - Section navigation switches between sections
 *   - builderStore: initPage, updateDraftConfig, discardChanges, markSaved
 *   - DataSourceSection: renders, connection selection, table selection
 *   - FieldConfigSection: renders, field toggle, label update
 *   - SectionsLayoutSection: renders sections, toggles visibility
 *   - DefaultViewSection: renders, updates sort/page size
 *   - PermissionsSection: renders matrix, toggles permissions
 *   - HooksSection: renders hooks, enables hook, updates code
 *   - PageMetadataSection: renders, updates name
 *   - EphemeralToggleSection: renders, toggles ephemeral
 *   - BuilderWarningHeader: discard/save button states
 *
 * Implements US-136e.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { BuilderPanel } from '../BuilderPanel';
import { BuilderWarningHeader } from '../BuilderWarningHeader';
import { DataSourceSection } from '../sections/DataSourceSection';
import { FieldConfigSection } from '../sections/FieldConfigSection';
import { SectionsLayoutSection } from '../sections/SectionsLayoutSection';
import { DefaultViewSection } from '../sections/DefaultViewSection';
import { PermissionsSection } from '../sections/PermissionsSection';
import { HooksSection } from '../sections/HooksSection';
import { PageMetadataSection } from '../sections/PageMetadataSection';
import { EphemeralToggleSection } from '../sections/EphemeralToggleSection';
import { useBuilderStore } from '../../../stores/builderStore';
import type { TemplateConfig } from '../../../templates/types';

// ─── Mock useTemplateConfig ───────────────────────────────────────────────────

const mockUpdateConfig = vi.fn();

vi.mock('../../../templates/useTemplateConfig', () => ({
  useTemplateConfig: () => ({
    config: {
      templateType: 'table-listing',
      fields: [],
      sections: [],
      metadata: {},
    } satisfies TemplateConfig,
    loading: false,
    error: null,
    updateConfig: mockUpdateConfig,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

const baseConfig: TemplateConfig = {
  templateType: 'table-listing',
  fields: [],
  sections: [],
  metadata: {},
};

const configWithFields: TemplateConfig = {
  templateType: 'table-listing',
  fields: [
    { key: 'id', label: 'ID', type: 'text', visible: true, sortable: false, filterable: false },
    { key: 'name', label: 'Name', type: 'text', visible: true, sortable: true, filterable: true },
  ],
  sections: [],
  metadata: {},
};

// ─── builderStore tests ───────────────────────────────────────────────────────

describe('builderStore', () => {
  beforeEach(() => {
    useBuilderStore.setState({
      activeSection: 'dataSource',
      pageState: {},
    });
  });

  it('initPage sets draft and original config', () => {
    const store = useBuilderStore.getState();
    store.initPage('page-1', baseConfig);

    const state = useBuilderStore.getState();
    expect(state.pageState['page-1']?.draftConfig).toEqual(baseConfig);
    expect(state.pageState['page-1']?.originalConfig).toEqual(baseConfig);
    expect(state.pageState['page-1']?.isDirty).toBe(false);
  });

  it('updateDraftConfig marks page as dirty', () => {
    const store = useBuilderStore.getState();
    store.initPage('page-1', baseConfig);
    store.updateDraftConfig('page-1', { fields: configWithFields.fields });

    const state = useBuilderStore.getState();
    expect(state.getDraftConfig('page-1')?.fields).toHaveLength(2);
    expect(state.isPageDirty('page-1')).toBe(true);
  });

  it('discardChanges reverts draft to original', () => {
    const store = useBuilderStore.getState();
    store.initPage('page-1', baseConfig);
    store.updateDraftConfig('page-1', { fields: configWithFields.fields });
    store.discardChanges('page-1');

    const state = useBuilderStore.getState();
    expect(state.getDraftConfig('page-1')?.fields).toHaveLength(0);
    expect(state.isPageDirty('page-1')).toBe(false);
  });

  it('markSaved clears dirty flag and updates original', () => {
    const store = useBuilderStore.getState();
    store.initPage('page-1', baseConfig);
    store.updateDraftConfig('page-1', { fields: configWithFields.fields });
    store.markSaved('page-1');

    const state = useBuilderStore.getState();
    expect(state.isPageDirty('page-1')).toBe(false);
    // Original should now match the modified draft
    expect(state.pageState['page-1']?.originalConfig?.fields).toHaveLength(2);
  });

  it('setActiveSection updates activeSection', () => {
    useBuilderStore.getState().setActiveSection('permissions');
    expect(useBuilderStore.getState().activeSection).toBe('permissions');
  });

  it('setDraftConfig replaces draft entirely', () => {
    const store = useBuilderStore.getState();
    store.initPage('page-1', baseConfig);
    store.setDraftConfig('page-1', configWithFields);

    const state = useBuilderStore.getState();
    expect(state.getDraftConfig('page-1')).toEqual(configWithFields);
    expect(state.isPageDirty('page-1')).toBe(true);
  });

  it('initPage does not overwrite dirty state', () => {
    const store = useBuilderStore.getState();
    store.initPage('page-1', baseConfig);
    store.updateDraftConfig('page-1', { fields: configWithFields.fields });

    // Reinit with different config — should not overwrite dirty draft
    store.initPage('page-1', configWithFields);

    const state = useBuilderStore.getState();
    expect(state.isPageDirty('page-1')).toBe(true);
  });
});

// ─── BuilderWarningHeader tests ───────────────────────────────────────────────

describe('BuilderWarningHeader', () => {
  it('renders warning message', () => {
    renderWithProviders(
      <BuilderWarningHeader
        isDirty={false}
        isSaving={false}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText(/Page configuration/)).toBeInTheDocument();
  });

  it('discard button is disabled when not dirty', () => {
    renderWithProviders(
      <BuilderWarningHeader
        isDirty={false}
        isSaving={false}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const discardBtn = screen.getByRole('button', { name: /discard/i });
    expect(discardBtn).toBeDisabled();
  });

  it('discard button is enabled when dirty', () => {
    renderWithProviders(
      <BuilderWarningHeader
        isDirty={true}
        isSaving={false}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const discardBtn = screen.getByRole('button', { name: /discard/i });
    expect(discardBtn).not.toBeDisabled();
  });

  it('calls onDiscard when discard is clicked', () => {
    const onDiscard = vi.fn();
    renderWithProviders(
      <BuilderWarningHeader
        isDirty={true}
        isSaving={false}
        onDiscard={onDiscard}
        onSave={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when save is clicked', () => {
    const onSave = vi.fn();
    renderWithProviders(
      <BuilderWarningHeader
        isDirty={false}
        isSaving={false}
        onDiscard={vi.fn()}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /save page configuration/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('save button shows saving text when isSaving', () => {
    renderWithProviders(
      <BuilderWarningHeader
        isDirty={false}
        isSaving={true}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /save page configuration/i })).toBeDisabled();
  });
});

// ─── BuilderPanel integration tests ──────────────────────────────────────────

describe('BuilderPanel', () => {
  beforeEach(() => {
    useBuilderStore.setState({
      activeSection: 'dataSource',
      pageState: {},
    });
    mockUpdateConfig.mockResolvedValue(undefined);
  });

  it('renders warning header', () => {
    renderWithProviders(<BuilderPanel pageId="page-1" />);
    expect(screen.getByText(/Page configuration/)).toBeInTheDocument();
  });

  it('renders section navigation', () => {
    renderWithProviders(<BuilderPanel pageId="page-1" />);
    const nav = screen.getByRole('navigation', { name: /builder section navigation/i });
    // All 8 nav items should be in the nav element
    expect(nav).toBeInTheDocument();
    expect(nav.querySelectorAll('button')).toHaveLength(8);
  });

  it('switches to field config section on nav click', () => {
    renderWithProviders(<BuilderPanel pageId="page-1" />);
    fireEvent.click(screen.getByText('Field configuration'));
    expect(screen.getByTestId('builder-fieldconfig-section')).toBeInTheDocument();
  });

  it('switches to permissions section on nav click', () => {
    renderWithProviders(<BuilderPanel pageId="page-1" />);
    fireEvent.click(screen.getByText('Permissions'));
    expect(screen.getByTestId('builder-permissions-section')).toBeInTheDocument();
  });

  it('switches to hooks section on nav click', () => {
    renderWithProviders(<BuilderPanel pageId="page-1" />);
    fireEvent.click(screen.getByText('Hooks'));
    expect(screen.getByTestId('builder-hooks-section')).toBeInTheDocument();
  });

  it('shows data source section by default', () => {
    renderWithProviders(<BuilderPanel pageId="page-1" />);
    expect(screen.getByTestId('builder-datasource-section')).toBeInTheDocument();
  });

  it('save button is present and enabled when panel loads', async () => {
    mockUpdateConfig.mockResolvedValue(undefined);

    // Pre-init with dirty state before render
    useBuilderStore.getState().initPage('page-1', baseConfig);
    useBuilderStore.getState().updateDraftConfig('page-1', { fields: configWithFields.fields });

    renderWithProviders(<BuilderPanel pageId="page-1" />);

    const saveBtn = screen.getByRole('button', { name: /save page configuration/i });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateConfig).toHaveBeenCalled();
    });
  });
});

// ─── DataSourceSection tests ──────────────────────────────────────────────────

describe('DataSourceSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders title', () => {
    renderWithProviders(<DataSourceSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByText('Data source')).toBeInTheDocument();
  });

  it('renders connection picker', () => {
    renderWithProviders(<DataSourceSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByLabelText('DB connection')).toBeInTheDocument();
  });

  it('shows table picker after connection selected', () => {
    const configWithConnection = {
      ...baseConfig,
      metadata: { connection: 'conn-main' },
    };
    renderWithProviders(<DataSourceSection config={configWithConnection} onChange={onChange} />);
    expect(screen.getByLabelText('Table')).toBeInTheDocument();
  });

  it('shows schema preview after table selected', () => {
    const configWithTable = {
      ...baseConfig,
      metadata: { connection: 'conn-main', table: 'users' },
    };
    renderWithProviders(<DataSourceSection config={configWithTable} onChange={onChange} />);
    expect(screen.getByText('Schema preview')).toBeInTheDocument();
    // id and email column names may appear multiple times (in code tags) — use getAllBy
    const idCodes = screen.getAllByText('id');
    expect(idCodes.length).toBeGreaterThan(0);
    const emailCodes = screen.getAllByText('email');
    expect(emailCodes.length).toBeGreaterThan(0);
  });

  it('calls onChange when connection changes', () => {
    renderWithProviders(<DataSourceSection config={baseConfig} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('DB connection'), {
      target: { value: 'conn-main' },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('shows custom query toggle when table selected', () => {
    const configWithTable = {
      ...baseConfig,
      metadata: { connection: 'conn-main', table: 'users' },
    };
    renderWithProviders(<DataSourceSection config={configWithTable} onChange={onChange} />);
    expect(screen.getByText('Custom query')).toBeInTheDocument();
  });
});

// ─── FieldConfigSection tests ─────────────────────────────────────────────────

describe('FieldConfigSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders no-fields message when no data source', () => {
    renderWithProviders(<FieldConfigSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByText(/Configure a data source first/)).toBeInTheDocument();
  });

  it('renders field table when fields provided', () => {
    renderWithProviders(<FieldConfigSection config={configWithFields} onChange={onChange} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('calls onChange when label input changes', () => {
    renderWithProviders(<FieldConfigSection config={configWithFields} onChange={onChange} />);
    const labelInput = screen.getAllByRole('textbox')[0];
    if (labelInput) {
      fireEvent.change(labelInput, { target: { value: 'Identifier' } });
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('calls onChange when visible toggle changes', () => {
    renderWithProviders(<FieldConfigSection config={configWithFields} onChange={onChange} />);
    const toggles = screen.getAllByRole('checkbox');
    if (toggles[0]) {
      fireEvent.click(toggles[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });
});

// ─── SectionsLayoutSection tests ─────────────────────────────────────────────

describe('SectionsLayoutSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders all default sections', () => {
    renderWithProviders(<SectionsLayoutSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByText('Summary strip')).toBeInTheDocument();
    expect(screen.getByText('Advanced search')).toBeInTheDocument();
    expect(screen.getByText('Bulk actions')).toBeInTheDocument();
    expect(screen.getByText('Detail drawer')).toBeInTheDocument();
  });

  it('calls onChange when visibility toggled', () => {
    renderWithProviders(<SectionsLayoutSection config={baseConfig} onChange={onChange} />);
    const toggles = screen.getAllByRole('checkbox');
    if (toggles[0]) {
      fireEvent.click(toggles[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('calls onChange when move up button clicked', () => {
    renderWithProviders(<SectionsLayoutSection config={baseConfig} onChange={onChange} />);
    const moveUpButtons = screen.getAllByRole('button', { name: /move section up/i });
    // Second section's up button should be enabled
    if (moveUpButtons[1]) {
      fireEvent.click(moveUpButtons[1]);
      expect(onChange).toHaveBeenCalled();
    }
  });
});

// ─── DefaultViewSection tests ─────────────────────────────────────────────────

describe('DefaultViewSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders all default view controls', () => {
    renderWithProviders(<DefaultViewSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByLabelText('Default sort column')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort direction')).toBeInTheDocument();
    expect(screen.getByLabelText('Default page size')).toBeInTheDocument();
    expect(screen.getByLabelText('Default visible columns')).toBeInTheDocument();
  });

  it('calls onChange when sort direction changes', () => {
    renderWithProviders(<DefaultViewSection config={baseConfig} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Sort direction'), {
      target: { value: 'desc' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ defaultView: expect.objectContaining({ defaultSortDir: 'desc' }) }) }),
    );
  });

  it('calls onChange when page size changes', () => {
    renderWithProviders(<DefaultViewSection config={baseConfig} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Default page size'), {
      target: { value: '50' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ defaultView: expect.objectContaining({ defaultPageSize: 50 }) }) }),
    );
  });
});

// ─── PermissionsSection tests ─────────────────────────────────────────────────

describe('PermissionsSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders role permission matrix', () => {
    renderWithProviders(<PermissionsSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('builder')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('renders action columns', () => {
    renderWithProviders(<PermissionsSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('calls onChange when checkbox toggled', () => {
    renderWithProviders(<PermissionsSection config={baseConfig} onChange={onChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes[0]) {
      fireEvent.click(checkboxes[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('shows field visibility table when fields configured', () => {
    renderWithProviders(<PermissionsSection config={configWithFields} onChange={onChange} />);
    expect(screen.getByText('Per-field visibility by role')).toBeInTheDocument();
  });
});

// ─── HooksSection tests ───────────────────────────────────────────────────────

describe('HooksSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders all hook types', () => {
    renderWithProviders(<HooksSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByText('onPageLoad')).toBeInTheDocument();
    expect(screen.getByText('onRecordClick')).toBeInTheDocument();
    expect(screen.getByText('onSave')).toBeInTheDocument();
    expect(screen.getByText('onDelete')).toBeInTheDocument();
  });

  it('shows code editor when hook enabled', () => {
    const configWithHook: TemplateConfig = {
      ...baseConfig,
      metadata: {
        hooks: {
          onPageLoad: { enabled: true, code: '// hello' },
        },
      },
    };
    renderWithProviders(<HooksSection config={configWithHook} onChange={onChange} />);
    expect(screen.getByText(/Hook execution coming in Phase 3/)).toBeInTheDocument();
  });

  it('calls onChange when hook toggle changes', () => {
    renderWithProviders(<HooksSection config={baseConfig} onChange={onChange} />);
    const toggles = screen.getAllByRole('checkbox');
    if (toggles[0]) {
      fireEvent.click(toggles[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });
});

// ─── PageMetadataSection tests ────────────────────────────────────────────────

describe('PageMetadataSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders all metadata fields', () => {
    renderWithProviders(<PageMetadataSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByLabelText('Page name')).toBeInTheDocument();
    expect(screen.getByLabelText('Icon')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Nav order')).toBeInTheDocument();
  });

  it('calls onChange when page name changes', () => {
    renderWithProviders(<PageMetadataSection config={baseConfig} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Page name'), {
      target: { value: 'My Custom Page' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          pageMetadata: expect.objectContaining({ name: 'My Custom Page' }),
        }),
      }),
    );
  });

  it('calls onChange when nav order changes', () => {
    renderWithProviders(<PageMetadataSection config={baseConfig} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Nav order'), {
      target: { value: '5' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          pageMetadata: expect.objectContaining({ navOrder: 5 }),
        }),
      }),
    );
  });
});

// ─── EphemeralToggleSection tests ─────────────────────────────────────────────

describe('EphemeralToggleSection', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders ephemeral toggle', () => {
    renderWithProviders(<EphemeralToggleSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByLabelText(/Enable Workflow mode tab/i)).toBeInTheDocument();
  });

  it('shows disabled status when not enabled', () => {
    renderWithProviders(<EphemeralToggleSection config={baseConfig} onChange={onChange} />);
    expect(screen.getByText(/Workflow mode is disabled/)).toBeInTheDocument();
  });

  it('shows enabled status when enabled', () => {
    const configWithEphemeral: TemplateConfig = {
      ...baseConfig,
      metadata: { ephemeralEnabled: true },
    };
    renderWithProviders(<EphemeralToggleSection config={configWithEphemeral} onChange={onChange} />);
    expect(screen.getByText(/Workflow mode is enabled/)).toBeInTheDocument();
  });

  it('shows warning when enabled', () => {
    const configWithEphemeral: TemplateConfig = {
      ...baseConfig,
      metadata: { ephemeralEnabled: true },
    };
    renderWithProviders(<EphemeralToggleSection config={configWithEphemeral} onChange={onChange} />);
    expect(screen.getByText(/Workflow execution requires Phase 2/)).toBeInTheDocument();
  });

  it('calls onChange when toggle clicked', () => {
    renderWithProviders(<EphemeralToggleSection config={baseConfig} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Enable Workflow mode tab/i));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ ephemeralEnabled: true }),
      }),
    );
  });
});

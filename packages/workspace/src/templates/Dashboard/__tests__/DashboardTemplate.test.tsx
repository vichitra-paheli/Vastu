/**
 * Component tests for DashboardTemplate and its sub-components.
 *
 * Covers:
 * 1. DashboardTemplate renders without crashing
 * 2. DashboardGreeting shows correct greeting and date
 * 3. DashboardGreeting shows alert and review badges
 * 4. DashboardTemplate shows empty state when no cards
 * 5. DashboardTemplate renders card grid when cards exist
 * 6. DashboardCard renders with title
 * 7. DashboardCard drag handles visible in edit mode
 * 8. DashboardCard remove button visible in edit mode
 * 9. DashboardCard resize controls in edit mode
 * 10. EditGridModeBanner renders with done/add buttons
 * 11. AddCardDialog opens and closes
 * 12. AddCardDialog submit adds a card
 * 13. PinToDashboardDialog renders
 * 14. dashboardStore setCards/addCard/removeCard/reorderCards
 * 15. Card type components render without crashing
 *
 * Implements US-137.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { DashboardTemplate } from '../DashboardTemplate';
import { DashboardGreeting } from '../DashboardGreeting';
import { DashboardCard } from '../DashboardCard';
import { EditGridModeBanner } from '../EditGridMode';
import { AddCardDialog } from '../AddCardDialog';
import { PinToDashboardDialog } from '../PinToDashboardDialog';
import { DashboardKPICard } from '../cards/KPICard';
import { DashboardChartCard } from '../cards/ChartCard';
import { DashboardTableCard } from '../cards/TableCard';
import { DashboardPipelineCard } from '../cards/PipelineCard';
import { DashboardQuickActionsCard } from '../cards/QuickActionsCard';
import { DashboardAlertCard } from '../cards/AlertCard';
import { useDashboardStore } from '../../../stores/dashboardStore';
import type { KPICardDef, ChartCardDef, TableCardDef, PipelineCardDef, QuickActionsCardDef, AlertCardDef } from '../../../stores/dashboardStore';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../../stores/panelStore', () => ({
  usePanelStore: vi.fn(() => vi.fn()),
  openPanelByTypeId: vi.fn(),
}));

vi.mock('../../useTemplateConfig', () => ({
  useTemplateConfig: vi.fn(() => ({
    config: null,
    loading: false,
    error: null,
    updateConfig: vi.fn(),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  // Reset store between tests
  useDashboardStore.setState({ cards: [], editMode: false });
});

function renderDashboard(props: Partial<React.ComponentProps<typeof DashboardTemplate>> = {}) {
  return render(
    <DashboardTemplate
      pageId="test-dashboard"
      config={{ templateType: 'dashboard' }}
      {...props}
    />,
    { wrapper: TestProviders },
  );
}

// ── Test data ──────────────────────────────────────────────────────────────────

const KPI_CARD: KPICardDef = {
  id: 'kpi-1',
  type: 'kpi',
  title: 'Revenue',
  size: '1x1',
  order: 0,
  value: '$12,340',
  delta: '+5.2%',
  sparklineData: [{ value: 10 }, { value: 20 }],
};

const CHART_CARD: ChartCardDef = {
  id: 'chart-1',
  type: 'chart',
  title: 'Revenue Trend',
  size: '2x1',
  order: 1,
  chartType: 'line',
  data: [{ month: 'Jan', value: 100 }],
  series: [{ dataKey: 'value', name: 'Value' }],
};

const TABLE_CARD: TableCardDef = {
  id: 'table-1',
  type: 'table',
  title: 'Top Customers',
  size: '1x1',
  order: 2,
  columns: [{ key: 'name', label: 'Name' }, { key: 'revenue', label: 'Revenue' }],
  rows: [{ name: 'Alice', revenue: '$5k' }],
};

const PIPELINE_CARD: PipelineCardDef = {
  id: 'pipeline-1',
  type: 'pipeline',
  title: 'Sales Pipeline',
  size: '2x1',
  order: 3,
  stages: [
    { label: 'Prospect', count: 20 },
    { label: 'Qualified', count: 12 },
    { label: 'Closed', count: 5 },
  ],
};

const QUICK_ACTIONS_CARD: QuickActionsCardDef = {
  id: 'qa-1',
  type: 'quick-actions',
  title: 'Quick Actions',
  size: '1x1',
  order: 4,
  actions: [
    { id: 'a1', label: 'New Order' },
    { id: 'a2', label: 'Add Customer' },
  ],
};

const ALERT_CARD: AlertCardDef = {
  id: 'alert-1',
  type: 'alert',
  title: 'System Alerts',
  size: '1x1',
  order: 5,
  alerts: [
    { id: 'al1', message: 'DB connection idle', severity: 'warning' },
    { id: 'al2', message: 'API rate limit at 80%', severity: 'error' },
  ],
};

// ── 1. DashboardTemplate renders ───────────────────────────────────────────────

describe('DashboardTemplate', () => {
  it('renders without crashing', () => {
    expect(() => renderDashboard()).not.toThrow();
  });

  it('renders the dashboard greeting', () => {
    renderDashboard();
    expect(screen.getByTestId('dashboard-greeting')).toBeTruthy();
  });

  it('shows empty state when no cards configured', () => {
    renderDashboard();
    expect(screen.getByTestId('empty-add-card')).toBeTruthy();
  });

  it('renders card grid when store has cards', () => {
    useDashboardStore.setState({ cards: [KPI_CARD], editMode: false });
    // Force initialised to true to skip init effect
    renderDashboard();
    // The grid element should render
    expect(screen.getByTestId('dashboard-card-grid')).toBeTruthy();
  });

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <DashboardTemplate
        pageId="test"
        config={{ templateType: 'dashboard' }}
        loading
      />,
      { wrapper: TestProviders },
    );
    const status = container.querySelector('[role="status"][aria-busy="true"]');
    expect(status).not.toBeNull();
  });

  it('shows error message when error is provided', () => {
    render(
      <DashboardTemplate
        pageId="test"
        config={{ templateType: 'dashboard' }}
        error="Failed to load"
      />,
      { wrapper: TestProviders },
    );
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('enters edit mode when edit button is clicked', () => {
    useDashboardStore.setState({ cards: [KPI_CARD], editMode: false });
    renderDashboard();
    const editBtn = screen.getByTestId('enter-edit-mode');
    fireEvent.click(editBtn);
    expect(screen.getByTestId('edit-mode-banner')).toBeTruthy();
  });

  it('exits edit mode when done button is clicked', () => {
    useDashboardStore.setState({ cards: [KPI_CARD], editMode: true });
    renderDashboard();
    const doneBtn = screen.getByTestId('edit-mode-done');
    fireEvent.click(doneBtn);
    expect(screen.queryByTestId('edit-mode-banner')).toBeNull();
  });

  it('opens AddCardDialog when add card tile is clicked in edit mode', async () => {
    useDashboardStore.setState({ cards: [KPI_CARD], editMode: true });
    renderDashboard();
    const addTile = screen.getByTestId('add-card-tile');
    fireEvent.click(addTile);
    // Mantine Modal renders content in a portal; may need to wait for it
    await screen.findByTestId('add-card-title-input');
  });
});

// ── 2. DashboardGreeting ──────────────────────────────────────────────────────

describe('DashboardGreeting', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<DashboardGreeting name="Alice" />, { wrapper: TestProviders }),
    ).not.toThrow();
  });

  it('renders the user name', () => {
    render(<DashboardGreeting name="Alice" />, { wrapper: TestProviders });
    expect(screen.getByText(/Alice/)).toBeTruthy();
  });

  it('renders the current date', () => {
    render(<DashboardGreeting name="Alice" />, { wrapper: TestProviders });
    // Should contain the year
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeTruthy();
  });

  it('shows alert badge when alertCount > 0', () => {
    render(
      <DashboardGreeting name="Alice" alertCount={3} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByTestId('greeting-alert-badge')).toBeTruthy();
  });

  it('hides alert badge when alertCount is 0', () => {
    render(<DashboardGreeting name="Alice" alertCount={0} />, { wrapper: TestProviders });
    expect(screen.queryByTestId('greeting-alert-badge')).toBeNull();
  });

  it('shows review badge when pendingReviewCount > 0', () => {
    render(
      <DashboardGreeting name="Alice" pendingReviewCount={5} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByTestId('greeting-review-badge')).toBeTruthy();
  });

  it('hides review badge when pendingReviewCount is 0', () => {
    render(
      <DashboardGreeting name="Alice" pendingReviewCount={0} />,
      { wrapper: TestProviders },
    );
    expect(screen.queryByTestId('greeting-review-badge')).toBeNull();
  });
});

// ── 3. DashboardCard ──────────────────────────────────────────────────────────

describe('DashboardCard', () => {
  it('renders card with title', () => {
    render(
      <DashboardCard id="card-1" title="My Card" size="1x1">
        <span>content</span>
      </DashboardCard>,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('My Card')).toBeTruthy();
    expect(screen.getByText('content')).toBeTruthy();
  });

  it('shows drag handle in edit mode', () => {
    render(
      <DashboardCard id="card-1" title="My Card" size="1x1" editMode>
        <span>content</span>
      </DashboardCard>,
      { wrapper: TestProviders },
    );
    expect(screen.getByRole('button', { name: /drag/i })).toBeTruthy();
  });

  it('hides drag handle when not in edit mode', () => {
    render(
      <DashboardCard id="card-1" title="My Card" size="1x1" editMode={false}>
        <span>content</span>
      </DashboardCard>,
      { wrapper: TestProviders },
    );
    expect(screen.queryByRole('button', { name: /drag/i })).toBeNull();
  });

  it('shows remove button in edit mode', () => {
    render(
      <DashboardCard id="card-1" title="My Card" size="1x1" editMode onRemove={vi.fn()}>
        <span>content</span>
      </DashboardCard>,
      { wrapper: TestProviders },
    );
    expect(screen.getByTestId('remove-card-card-1')).toBeTruthy();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(
      <DashboardCard id="card-1" title="My Card" size="1x1" editMode onRemove={onRemove}>
        <span>content</span>
      </DashboardCard>,
      { wrapper: TestProviders },
    );
    fireEvent.click(screen.getByTestId('remove-card-card-1'));
    expect(onRemove).toHaveBeenCalledWith('card-1');
  });

  it('shows resize controls in edit mode', () => {
    const onResize = vi.fn();
    render(
      <DashboardCard id="card-1" title="My Card" size="1x1" editMode onResize={onResize}>
        <span>content</span>
      </DashboardCard>,
      { wrapper: TestProviders },
    );
    expect(screen.getByLabelText(/resize card/i)).toBeTruthy();
  });

  it('calls onResize when resize button clicked', () => {
    const onResize = vi.fn();
    render(
      <DashboardCard id="card-1" title="My Card" size="1x1" editMode onResize={onResize}>
        <span>content</span>
      </DashboardCard>,
      { wrapper: TestProviders },
    );
    const size2x1 = screen.getByRole('button', { name: /resize to 2x1/i });
    fireEvent.click(size2x1);
    expect(onResize).toHaveBeenCalledWith('card-1', '2x1');
  });
});

// ── 4. EditGridModeBanner ─────────────────────────────────────────────────────

describe('EditGridModeBanner', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <EditGridModeBanner onDone={vi.fn()} onAddCard={vi.fn()} />,
        { wrapper: TestProviders },
      ),
    ).not.toThrow();
  });

  it('calls onDone when done button clicked', () => {
    const onDone = vi.fn();
    render(
      <EditGridModeBanner onDone={onDone} onAddCard={vi.fn()} />,
      { wrapper: TestProviders },
    );
    fireEvent.click(screen.getByTestId('edit-mode-done'));
    expect(onDone).toHaveBeenCalled();
  });

  it('calls onAddCard when add card button clicked', () => {
    const onAddCard = vi.fn();
    render(
      <EditGridModeBanner onDone={vi.fn()} onAddCard={onAddCard} />,
      { wrapper: TestProviders },
    );
    fireEvent.click(screen.getByTestId('edit-mode-add-card'));
    expect(onAddCard).toHaveBeenCalled();
  });
});

// ── 5. AddCardDialog ──────────────────────────────────────────────────────────

describe('AddCardDialog', () => {
  it('renders without crashing when closed', () => {
    expect(() =>
      render(
        <AddCardDialog opened={false} onClose={vi.fn()} onAdd={vi.fn()} />,
        { wrapper: TestProviders },
      ),
    ).not.toThrow();
  });

  it('renders dialog when opened', () => {
    render(
      <AddCardDialog opened onClose={vi.fn()} onAdd={vi.fn()} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByTestId('add-card-title-input')).toBeTruthy();
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(
      <AddCardDialog opened onClose={onClose} onAdd={vi.fn()} />,
      { wrapper: TestProviders },
    );
    const cancelBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.toLowerCase().includes('cancel'),
    );
    expect(cancelBtn).toBeTruthy();
    fireEvent.click(cancelBtn!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onAdd with card when form submitted', () => {
    const onAdd = vi.fn();
    render(
      <AddCardDialog opened onClose={vi.fn()} onAdd={onAdd} />,
      { wrapper: TestProviders },
    );
    fireEvent.change(screen.getByTestId('add-card-title-input'), {
      target: { value: 'My KPI Card' },
    });
    fireEvent.click(screen.getByTestId('add-card-submit'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My KPI Card', type: 'kpi', size: '1x1' }),
    );
    // Note: id and order are assigned by DashboardTemplate, not AddCardDialog
  });

  it('does not call onAdd when title is empty', () => {
    const onAdd = vi.fn();
    render(
      <AddCardDialog opened onClose={vi.fn()} onAdd={onAdd} />,
      { wrapper: TestProviders },
    );
    fireEvent.click(screen.getByTestId('add-card-submit'));
    expect(onAdd).not.toHaveBeenCalled();
  });
});

// ── 6. PinToDashboardDialog ───────────────────────────────────────────────────

describe('PinToDashboardDialog', () => {
  it('renders without crashing when closed', () => {
    expect(() =>
      render(
        <PinToDashboardDialog opened={false} onClose={vi.fn()} onPin={vi.fn()} />,
        { wrapper: TestProviders },
      ),
    ).not.toThrow();
  });

  it('renders dialog when opened', () => {
    render(
      <PinToDashboardDialog opened onClose={vi.fn()} onPin={vi.fn()} viewName="My View" />,
      { wrapper: TestProviders },
    );
    expect(screen.getByTestId('pin-title-input')).toBeTruthy();
  });

  it('calls onPin with config when submitted', () => {
    const onPin = vi.fn();
    render(
      <PinToDashboardDialog
        opened
        onClose={vi.fn()}
        onPin={onPin}
        viewName="Test View"
        dashboards={[{ id: 'main', name: 'Main Dashboard' }]}
      />,
      { wrapper: TestProviders },
    );
    // Title is prefilled with viewName
    fireEvent.click(screen.getByTestId('pin-submit'));
    expect(onPin).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test View',
        cardType: 'kpi',
        size: '1x1',
        targetDashboardId: 'main',
      }),
    );
  });
});

// ── 7. dashboardStore ─────────────────────────────────────────────────────────

describe('dashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.setState({ cards: [], editMode: false });
  });

  it('addCard appends a card', () => {
    act(() => {
      useDashboardStore.getState().addCard(KPI_CARD);
    });
    expect(useDashboardStore.getState().cards).toHaveLength(1);
    expect(useDashboardStore.getState().cards[0].id).toBe('kpi-1');
  });

  it('removeCard removes a card by id', () => {
    act(() => {
      useDashboardStore.getState().setCards([KPI_CARD, CHART_CARD]);
      useDashboardStore.getState().removeCard('kpi-1');
    });
    expect(useDashboardStore.getState().cards).toHaveLength(1);
    expect(useDashboardStore.getState().cards[0].id).toBe('chart-1');
  });

  it('reorderCards re-orders cards by provided id list', () => {
    act(() => {
      useDashboardStore.getState().setCards([KPI_CARD, CHART_CARD]);
      useDashboardStore.getState().reorderCards(['chart-1', 'kpi-1']);
    });
    const cards = useDashboardStore.getState().cards;
    expect(cards[0].id).toBe('chart-1');
    expect(cards[1].id).toBe('kpi-1');
  });

  it('resizeCard updates card size', () => {
    act(() => {
      useDashboardStore.getState().setCards([KPI_CARD]);
      useDashboardStore.getState().resizeCard('kpi-1', '2x1');
    });
    expect(useDashboardStore.getState().cards[0].size).toBe('2x1');
  });

  it('toggleEditMode switches editMode', () => {
    act(() => {
      useDashboardStore.getState().toggleEditMode();
    });
    expect(useDashboardStore.getState().editMode).toBe(true);
    act(() => {
      useDashboardStore.getState().toggleEditMode();
    });
    expect(useDashboardStore.getState().editMode).toBe(false);
  });

  it('updateCard updates specific card fields', () => {
    act(() => {
      useDashboardStore.getState().setCards([KPI_CARD]);
      useDashboardStore.getState().updateCard('kpi-1', { title: 'Updated Title' });
    });
    expect(useDashboardStore.getState().cards[0].title).toBe('Updated Title');
  });
});

// ── 8. Card type components ───────────────────────────────────────────────────

describe('DashboardKPICard', () => {
  it('renders value and delta', () => {
    render(<DashboardKPICard card={KPI_CARD} />, { wrapper: TestProviders });
    expect(screen.getByText('$12,340')).toBeTruthy();
    expect(screen.getByText(/\+5\.2%/)).toBeTruthy();
  });

  it('renders without crashing when value is undefined', () => {
    const card: KPICardDef = { ...KPI_CARD, value: undefined, delta: undefined };
    expect(() =>
      render(<DashboardKPICard card={card} />, { wrapper: TestProviders }),
    ).not.toThrow();
  });
});

describe('DashboardChartCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<DashboardChartCard card={CHART_CARD} />, { wrapper: TestProviders }),
    ).not.toThrow();
  });

  it('renders a chart', () => {
    render(<DashboardChartCard card={CHART_CARD} />, { wrapper: TestProviders });
    expect(screen.getByTestId('recharts-LineChart')).toBeTruthy();
  });
});

describe('DashboardTableCard', () => {
  it('renders table rows', () => {
    render(<DashboardTableCard card={TABLE_CARD} />, { wrapper: TestProviders });
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('$5k')).toBeTruthy();
  });

  it('shows view all link when viewAllPageId is provided', () => {
    const card: TableCardDef = { ...TABLE_CARD, viewAllPageId: 'customers' };
    const onViewAll = vi.fn();
    render(
      <DashboardTableCard card={card} onViewAll={onViewAll} />,
      { wrapper: TestProviders },
    );
    const viewAll = screen.getByRole('button', { name: /view all/i });
    fireEvent.click(viewAll);
    expect(onViewAll).toHaveBeenCalledWith('customers');
  });
});

describe('DashboardPipelineCard', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(<DashboardPipelineCard card={PIPELINE_CARD} />, { wrapper: TestProviders }),
    ).not.toThrow();
  });

  it('renders stage labels in legend', () => {
    render(<DashboardPipelineCard card={PIPELINE_CARD} />, { wrapper: TestProviders });
    expect(screen.getByText(/Prospect: 20/)).toBeTruthy();
  });
});

describe('DashboardQuickActionsCard', () => {
  it('renders action buttons', () => {
    render(
      <DashboardQuickActionsCard card={QUICK_ACTIONS_CARD} />,
      { wrapper: TestProviders },
    );
    expect(screen.getByText('New Order')).toBeTruthy();
    expect(screen.getByText('Add Customer')).toBeTruthy();
  });

  it('calls onAction when action button clicked', () => {
    const onAction = vi.fn();
    render(
      <DashboardQuickActionsCard card={QUICK_ACTIONS_CARD} onAction={onAction} />,
      { wrapper: TestProviders },
    );
    fireEvent.click(screen.getByText('New Order'));
    expect(onAction).toHaveBeenCalledWith('a1', undefined);
  });
});

describe('DashboardAlertCard', () => {
  it('renders alert messages', () => {
    render(<DashboardAlertCard card={ALERT_CARD} />, { wrapper: TestProviders });
    expect(screen.getByText('DB connection idle')).toBeTruthy();
    expect(screen.getByText('API rate limit at 80%')).toBeTruthy();
  });

  it('shows empty state when no alerts', () => {
    const card: AlertCardDef = { ...ALERT_CARD, alerts: [] };
    render(<DashboardAlertCard card={card} />, { wrapper: TestProviders });
    expect(screen.getByText(/no active alerts/i)).toBeTruthy();
  });

  it('shows view all link when viewAllPageId is provided', () => {
    const card: AlertCardDef = { ...ALERT_CARD, viewAllPageId: 'alerts-page' };
    const onViewAll = vi.fn();
    render(
      <DashboardAlertCard card={card} onViewAll={onViewAll} />,
      { wrapper: TestProviders },
    );
    const btn = screen.getByRole('button', { name: /view all alerts/i });
    fireEvent.click(btn);
    expect(onViewAll).toHaveBeenCalledWith('alerts-page');
  });
});

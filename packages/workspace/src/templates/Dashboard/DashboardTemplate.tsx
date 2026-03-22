'use client';

/**
 * DashboardTemplate — home screen dashboard with pinned cards.
 *
 * Features:
 * - DashboardGreeting: "Good afternoon, {name}" + date + alert count + pending review count
 * - Card grid: responsive columns (auto-fill, minmax 280px)
 * - Card types: KPI, Chart, Table, Pipeline, QuickActions, Alert
 * - "+ Add card" button opens AddCardDialog
 * - "Edit grid" mode: drag-to-reorder (HTML5 drag API), resize handles, remove button
 * - View toolbar active: save/load dashboard layouts
 * - Dashboard state serialized to viewStore
 *
 * Registered as 'dashboard' panel type.
 *
 * Implements US-137 AC-1 through AC-11.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Button, ActionIcon, Tooltip } from '@mantine/core';
import { IconPlus, IconEdit, IconLayoutDashboard } from '@tabler/icons-react';
import { TemplateSkeleton } from '../TemplateSkeleton';
import { ViewToolbar } from '../../components/ViewToolbar';
import { EmptyState } from '../../components/EmptyState';
import { DashboardGreeting } from './DashboardGreeting';
import { DashboardCard } from './DashboardCard';
import { EditGridModeBanner } from './EditGridMode';
import { AddCardDialog } from './AddCardDialog';
import { DashboardKPICard } from './cards/KPICard';
import { DashboardChartCard } from './cards/ChartCard';
import { DashboardTableCard } from './cards/TableCard';
import { DashboardPipelineCard } from './cards/PipelineCard';
import { DashboardQuickActionsCard } from './cards/QuickActionsCard';
import { DashboardAlertCard } from './cards/AlertCard';
import { useTemplateConfig } from '../useTemplateConfig';
import { registerTemplate } from '../registry';
import { useDashboardStore, deserializeDashboardState } from '../../stores/dashboardStore';
import { t } from '../../lib/i18n';
import type { TemplateProps } from '../types';
import type {
  DashboardCard as DashboardCardDef,
  CardSize,
  KPICardDef,
  ChartCardDef,
  TableCardDef,
  PipelineCardDef,
  QuickActionsCardDef,
  AlertCardDef,
} from '../../stores/dashboardStore';
import classes from './DashboardTemplate.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

export const DASHBOARD_PANEL_TYPE = 'dashboard';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Dashboard-specific metadata stored in TemplateConfig.metadata. */
interface DashboardPageMetadata {
  userName?: string;
  alertCount?: number;
  pendingReviewCount?: number;
  cards?: DashboardCardDef[];
}

function parseDashboardMetadata(metadata: Record<string, unknown> | undefined): DashboardPageMetadata {
  if (!metadata) return {};
  return {
    userName: typeof metadata['userName'] === 'string' ? metadata['userName'] : undefined,
    alertCount: typeof metadata['alertCount'] === 'number' ? metadata['alertCount'] : undefined,
    pendingReviewCount:
      typeof metadata['pendingReviewCount'] === 'number' ? metadata['pendingReviewCount'] : undefined,
    cards: Array.isArray(metadata['cards'])
      ? (metadata['cards'] as DashboardCardDef[])
      : undefined,
  };
}

// ── Card renderer ─────────────────────────────────────────────────────────────

function renderCardContent(card: DashboardCardDef): React.ReactNode {
  switch (card.type) {
    case 'kpi':
      return <DashboardKPICard card={card as KPICardDef} />;
    case 'chart':
      return <DashboardChartCard card={card as ChartCardDef} />;
    case 'table':
      return <DashboardTableCard card={card as TableCardDef} />;
    case 'pipeline':
      return <DashboardPipelineCard card={card as PipelineCardDef} />;
    case 'quick-actions':
      return <DashboardQuickActionsCard card={card as QuickActionsCardDef} />;
    case 'alert':
      return <DashboardAlertCard card={card as AlertCardDef} />;
    default: {
      // Exhaustiveness check
      const _exhaustive: never = card;
      void _exhaustive;
      return null;
    }
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface DashboardTemplateProps extends Omit<TemplateProps, 'config'> {
  config?: TemplateProps['config'];
}

export function DashboardTemplate({
  pageId,
  config: propConfig,
  loading: propLoading,
  error: propError,
}: DashboardTemplateProps) {
  // Fetch config if not provided directly
  const { config: fetchedConfig, loading: fetchLoading, error: fetchError } = useTemplateConfig(pageId);

  const config = propConfig ?? fetchedConfig;
  const loading = propLoading ?? fetchLoading;
  const error = propError ?? fetchError;

  // Parse metadata
  const meta = parseDashboardMetadata(config?.metadata);

  // Dashboard store
  const {
    cards,
    editMode,
    setCards,
    addCard,
    removeCard,
    reorderCards,
    resizeCard,
    toggleEditMode,
    setEditMode,
  } = useDashboardStore();

  // Initialise cards from persisted state on first render.
  const [initialised, setInitialised] = React.useState(false);
  React.useEffect(() => {
    if (!initialised && config) {
      const persistedCards = meta.cards ?? [];
      if (persistedCards.length > 0) {
        setCards(deserializeDashboardState({ cards: persistedCards }));
      }
      setInitialised(true);
    }
  }, [config, initialised, meta.cards, setCards]);

  // Dialog state
  const [addCardOpen, setAddCardOpen] = useState(false);

  // Monotonic counter for card IDs — mutated in event handlers, not during render.
  const cardIdCounterRef = useRef(0);

  // Handlers
  const handleDrop = useCallback(
    (draggedId: string, targetId: string) => {
      const orderedIds = cards.map((c) => c.id);
      const draggedIdx = orderedIds.indexOf(draggedId);
      const targetIdx = orderedIds.indexOf(targetId);
      if (draggedIdx === -1 || targetIdx === -1) return;
      const newOrder = [...orderedIds];
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedId);
      reorderCards(newOrder);
    },
    [cards, reorderCards],
  );

  const handleAddCard = useCallback(
    (card: Omit<DashboardCardDef, 'id' | 'order'>) => {
      // Generate a stable ID by incrementing the ref counter (event handler, not render).
      cardIdCounterRef.current += 1;
      const id = `card-${cardIdCounterRef.current}`;
      addCard({ ...card, id, order: cards.length } as DashboardCardDef);
    },
    [addCard, cards.length],
  );

  const handleResize = useCallback(
    (id: string, size: CardSize) => {
      resizeCard(id, size);
    },
    [resizeCard],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeCard(id);
    },
    [removeCard],
  );

  // Loading skeleton
  if (loading) {
    return <TemplateSkeleton variant="dashboard" />;
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={<IconLayoutDashboard />}
        message={error}
      />
    );
  }

  const userName = meta.userName ?? t('dashboard.greeting.defaultName');
  const alertCount = meta.alertCount ?? 0;
  const pendingReviewCount = meta.pendingReviewCount ?? 0;

  return (
    <div
      className={`${classes.root} ${editMode ? classes.editModeActive : ''}`}
      data-testid="dashboard-template"
    >
      {/* Edit mode banner */}
      {editMode && (
        <EditGridModeBanner
          onDone={() => setEditMode(false)}
          onAddCard={() => setAddCardOpen(true)}
        />
      )}

      {/* View toolbar */}
      <div className={classes.toolbar}>
        <div className={classes.toolbarLeft}>
          <ViewToolbar pageId={pageId} />
        </div>
        <div className={classes.toolbarRight}>
          {!editMode && (
            <Tooltip label={t('dashboard.editMode.enter')}>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={toggleEditMode}
                aria-label={t('dashboard.editMode.enterAriaLabel')}
                data-testid="enter-edit-mode"
              >
                <IconEdit size={14} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Greeting */}
      <DashboardGreeting
        name={userName}
        alertCount={alertCount}
        pendingReviewCount={pendingReviewCount}
      />

      {/* Content */}
      <div className={classes.content}>
        {cards.length === 0 && !editMode ? (
          <div className={classes.emptyGrid}>
            <p className={classes.emptyGridText}>{t('dashboard.empty.message')}</p>
            <Button
              leftSection={<IconPlus size={16} aria-hidden="true" />}
              variant="outline"
              onClick={() => {
                setEditMode(true);
                setAddCardOpen(true);
              }}
              data-testid="empty-add-card"
            >
              {t('dashboard.addCard.label')}
            </Button>
          </div>
        ) : (
          <>
            {/* Card grid */}
            <div className={classes.cardGrid} data-testid="dashboard-card-grid">
              {cards
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((card) => (
                  <DashboardCard
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    size={card.size}
                    editMode={editMode}
                    onRemove={handleRemove}
                    onResize={handleResize}
                    onDrop={handleDrop}
                  >
                    {renderCardContent(card)}
                  </DashboardCard>
                ))}

              {/* Add card tile (always shown in edit mode) */}
              {editMode && (
                <button
                  className={classes.addCardButton}
                  onClick={() => setAddCardOpen(true)}
                  aria-label={t('dashboard.addCard.ariaLabel')}
                  data-testid="add-card-tile"
                  type="button"
                >
                  <IconPlus size={20} aria-hidden="true" />
                  {t('dashboard.addCard.label')}
                </button>
              )}
            </div>

            {/* Add card button below the grid when not in edit mode */}
            {!editMode && (
              <div style={{ textAlign: 'center', paddingTop: 'var(--v-space-md)' }}>
                <Button
                  variant="subtle"
                  leftSection={<IconPlus size={14} aria-hidden="true" />}
                  onClick={() => {
                    setEditMode(true);
                    setAddCardOpen(true);
                  }}
                  data-testid="add-card-bottom"
                  size="sm"
                >
                  {t('dashboard.addCard.label')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add card dialog */}
      <AddCardDialog
        opened={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        onAdd={handleAddCard}
      />
    </div>
  );
}

// ── Register template ─────────────────────────────────────────────────────────

registerTemplate(DASHBOARD_PANEL_TYPE, DashboardTemplate, {
  label: t('dashboard.home.template.label'),
  icon: 'IconLayoutDashboard',
  description: t('dashboard.home.template.description'),
  defaultConfig: {
    templateType: 'dashboard',
    metadata: {},
  },
});

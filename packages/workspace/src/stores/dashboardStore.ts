'use client';

/**
 * dashboardStore — manages the state of the Dashboard view (US-137).
 *
 * Stores:
 * - cards: ordered list of dashboard card configurations
 * - editMode: whether edit grid mode is active
 * - Actions: addCard, removeCard, reorderCards, resizeCard, setCards
 *
 * NOTE: This is a global singleton store. All dashboard panels share the same
 * card list. The DashboardTemplate serializes card state into the view store on
 * save so that layouts are persisted per named view.
 *
 * Implements US-137.
 */

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DashboardCardType =
  | 'kpi'
  | 'chart'
  | 'table'
  | 'pipeline'
  | 'quick-actions'
  | 'alert';

/** Width/height in grid columns/rows. */
export type CardSize = '1x1' | '2x1' | '1x2';

/** Base config shared by all card types. */
export interface DashboardCardBase {
  id: string;
  type: DashboardCardType;
  title: string;
  /** Grid size. Default 1x1. */
  size: CardSize;
  /** Display order (ascending). */
  order: number;
}

/** KPI card configuration. */
export interface KPICardDef extends DashboardCardBase {
  type: 'kpi';
  metric?: string;
  value?: string;
  delta?: string;
  sparklineData?: Array<{ value: number }>;
}

/** A single data point in a chart — must match VastuChart ChartDataPoint. */
export type DashboardChartDataPoint = Record<string, string | number | null | undefined>;

/** Chart card configuration. */
export interface ChartCardDef extends DashboardCardBase {
  type: 'chart';
  chartType?: 'line' | 'bar' | 'area' | 'donut';
  data?: DashboardChartDataPoint[];
  series?: Array<{ dataKey: string; name: string }>;
}

/** Table card configuration. */
export interface TableCardDef extends DashboardCardBase {
  type: 'table';
  columns?: Array<{ key: string; label: string }>;
  rows?: Array<Record<string, string>>;
  viewAllPageId?: string;
}

/** Pipeline card configuration (horizontal stacked bar). */
export interface PipelineCardDef extends DashboardCardBase {
  type: 'pipeline';
  stages?: Array<{ label: string; count: number; color?: string }>;
}

/** Quick actions card configuration. */
export interface QuickActionsCardDef extends DashboardCardBase {
  type: 'quick-actions';
  actions?: Array<{ id: string; label: string; icon?: string; pageId?: string }>;
}

/** Alert card configuration. */
export interface AlertCardDef extends DashboardCardBase {
  type: 'alert';
  alerts?: Array<{ id: string; message: string; severity: 'warning' | 'error' | 'info' }>;
  viewAllPageId?: string;
}

export type DashboardCard =
  | KPICardDef
  | ChartCardDef
  | TableCardDef
  | PipelineCardDef
  | QuickActionsCardDef
  | AlertCardDef;

// ── Store state ───────────────────────────────────────────────────────────────

interface DashboardStoreState {
  /** Ordered list of dashboard cards. */
  cards: DashboardCard[];
  /** Whether edit grid mode is active. */
  editMode: boolean;

  // ── Actions ──

  /** Set the full card list (used when loading from persisted state). */
  setCards: (cards: DashboardCard[]) => void;
  /** Add a new card to the end of the grid. */
  addCard: (card: DashboardCard) => void;
  /** Remove a card by ID. */
  removeCard: (id: string) => void;
  /** Reorder cards by providing the new ordered array of IDs. */
  reorderCards: (orderedIds: string[]) => void;
  /** Resize a card. */
  resizeCard: (id: string, size: CardSize) => void;
  /** Toggle edit grid mode. */
  toggleEditMode: () => void;
  /** Set edit mode explicitly. */
  setEditMode: (editMode: boolean) => void;
  /** Update a card's configuration. */
  updateCard: (id: string, updates: Partial<DashboardCard>) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDashboardStore = create<DashboardStoreState>()((set, get) => ({
  cards: [],
  editMode: false,

  setCards: (cards) => set({ cards }),

  addCard: (card) =>
    set((state) => ({
      cards: [...state.cards, { ...card, order: state.cards.length }],
    })),

  removeCard: (id) =>
    set((state) => ({
      cards: state.cards
        .filter((c) => c.id !== id)
        .map((c, i) => ({ ...c, order: i })),
    })),

  reorderCards: (orderedIds) => {
    const { cards } = get();
    const cardMap = new Map(cards.map((c) => [c.id, c]));
    const reordered = orderedIds
      .map((id, i) => {
        const card = cardMap.get(id);
        return card ? { ...card, order: i } : null;
      })
      .filter((c): c is DashboardCard => c !== null);
    set({ cards: reordered });
  },

  resizeCard: (id, size) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, size } : c)),
    })),

  toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),

  setEditMode: (editMode) => set({ editMode }),

  updateCard: (id, updates) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? ({ ...c, ...updates } as DashboardCard) : c,
      ),
    })),
}));

// ── Serialization helpers ─────────────────────────────────────────────────────

/** Serialize dashboard state to a plain object for persistence in viewStore. */
export function serializeDashboardState(cards: DashboardCard[]): Record<string, unknown> {
  return { cards };
}

/** Deserialize dashboard state from a plain object loaded from viewStore. */
export function deserializeDashboardState(raw: Record<string, unknown>): DashboardCard[] {
  if (!Array.isArray(raw['cards'])) return [];
  return raw['cards'] as DashboardCard[];
}

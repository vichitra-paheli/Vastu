'use client';

/**
 * TimelineActivityTemplate — activity stream template for the workspace.
 *
 * Registered as the 'timeline-activity' panel type.
 *
 * Features:
 * - Vertical timeline with events grouped by date
 * - Each event: colored dot, icon, actor avatar, title, type badge,
 *   description, timestamp, and an expandable detail panel
 * - Infinite scroll / "Load more" pagination (50 events per page)
 * - Filter bar: text search, type pills, date range
 * - Loading → skeleton, empty → EmptyState, error → error message
 * - Clicking a related record opens the RecordDrawer via drawerStore
 *
 * All colors via --v-* CSS custom properties.
 * All strings via t('key').
 * Implements US-134.
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Button } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TemplateSkeleton } from '../TemplateSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useDrawerStore } from '../../stores/drawerStore';
import type { TemplateProps } from '../types';
import { registerTemplate } from '../registry';
import { DateGroupHeader, formatDateGroupLabel, toIsoDateString } from './DateGroupHeader';
import { TimelineEvent, type TimelineEventData } from './TimelineEvent';
import {
  TimelineFilters,
  createDefaultFilterState,
  type TimelineFilterState,
} from './TimelineFilters';
import classes from './TimelineActivityTemplate.module.css';

/** Number of events loaded per page. */
const PAGE_SIZE = 50;

// ── Local state types ─────────────────────────────────────────────────────────

interface TimelineState {
  /** All events loaded so far (cumulative). */
  events: TimelineEventData[];
  /** Current pagination page (1-based). */
  page: number;
  /** Whether more events are available to load. */
  hasMore: boolean;
  /** Whether a load-more is in flight. */
  loadingMore: boolean;
  /** Active filter state. */
  filters: TimelineFilterState;
}

type TimelineAction =
  | { type: 'SET_FILTERS'; payload: TimelineFilterState }
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; payload: { events: TimelineEventData[]; hasMore: boolean } }
  | { type: 'LOAD_MORE_ERROR' };

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case 'SET_FILTERS':
      // Resetting events + page when filters change so the next loadMore
      // fetches fresh data from page 1.
      return {
        ...state,
        filters: action.payload,
        events: [],
        page: 1,
        hasMore: true,
        loadingMore: false,
      };
    case 'LOAD_MORE_START':
      return { ...state, loadingMore: true };
    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        loadingMore: false,
        events: [...state.events, ...action.payload.events],
        page: state.page + 1,
        hasMore: action.payload.hasMore,
      };
    case 'LOAD_MORE_ERROR':
      return { ...state, loadingMore: false };
    default:
      return state;
  }
}

function createInitialState(): TimelineState {
  return {
    events: [],
    page: 1,
    hasMore: true,
    loadingMore: false,
    filters: createDefaultFilterState(),
  };
}

// ── Filtering helpers ─────────────────────────────────────────────────────────

function applyFilters(events: TimelineEventData[], filters: TimelineFilterState): TimelineEventData[] {
  let result = events;

  if (filters.search) {
    const lower = filters.search.toLowerCase();
    result = result.filter(
      (e) =>
        e.title.toLowerCase().includes(lower) ||
        (e.description ?? '').toLowerCase().includes(lower) ||
        (e.actor?.name ?? '').toLowerCase().includes(lower),
    );
  }

  if (filters.activeTypes.length > 0) {
    result = result.filter((e) => filters.activeTypes.includes(e.type));
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom + 'T00:00:00').getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() >= from);
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo + 'T23:59:59').getTime();
    result = result.filter((e) => new Date(e.timestamp).getTime() <= to);
  }

  return result;
}

// ── Date-group helpers ────────────────────────────────────────────────────────

interface DateGroup {
  date: string;
  label: string;
  events: TimelineEventData[];
}

function groupEventsByDate(events: TimelineEventData[]): DateGroup[] {
  const map = new Map<string, TimelineEventData[]>();

  for (const event of events) {
    const dateKey = toIsoDateString(event.timestamp);
    const existing = map.get(dateKey);
    if (existing) {
      existing.push(event);
    } else {
      map.set(dateKey, [event]);
    }
  }

  return Array.from(map.entries()).map(([date, groupEvents]) => ({
    date,
    label: formatDateGroupLabel(date),
    events: groupEvents,
  }));
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Fetch a page of events from the audit_events API.
 *
 * Throws on network or HTTP errors so the caller can dispatch LOAD_MORE_ERROR.
 */
async function fetchEvents(
  pageId: string,
  page: number,
  _filters: TimelineFilterState,
): Promise<{ events: TimelineEventData[]; hasMore: boolean }> {
  const response = await fetch(
    `/api/workspace/audit-events?pageId=${encodeURIComponent(pageId)}&page=${page}&pageSize=${PAGE_SIZE}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch timeline events: ${response.status}`);
  }

  const data = (await response.json()) as {
    events: TimelineEventData[];
    hasMore: boolean;
  };
  return { events: data.events ?? [], hasMore: data.hasMore ?? false };
}

// ── Main component ────────────────────────────────────────────────────────────

export function TimelineActivityTemplate({ pageId, loading, error }: TemplateProps) {
  const [state, dispatch] = useReducer(timelineReducer, undefined, createInitialState);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /**
   * Keep a ref to the current state so the stable loadMore callback can read
   * up-to-date values without being recreated on every render.
   * This prevents the IntersectionObserver from reconnecting on every state change.
   */
  const stateRef = useRef(state);
  stateRef.current = state;

  // drawerStore — used to open the record drawer when a related record is clicked.
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // ── Load more events ────────────────────────────────────────────────────────

  /**
   * Stable callback — intentionally excludes state values from the dependency
   * array; it reads them via stateRef instead so the IntersectionObserver does
   * not reconnect on every state update.
   */
  const loadMore = useCallback(async () => {
    const { loadingMore, hasMore, page, filters } = stateRef.current;
    if (loadingMore || !hasMore) return;

    dispatch({ type: 'LOAD_MORE_START' });
    try {
      const result = await fetchEvents(pageId, page, filters);
      dispatch({ type: 'LOAD_MORE_SUCCESS', payload: result });
    } catch {
      dispatch({ type: 'LOAD_MORE_ERROR' });
    }
  }, [pageId]);

  // ── Intersection Observer for infinite scroll ────────────────────────────────

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadMore]);

  // ── Trigger initial load / reload when filters change ────────────────────────

  useEffect(() => {
    // After SET_FILTERS resets events to [], kick off a fresh load.
    void loadMore();
    // Only run when filters change (which resets events to [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters]);

  // ── Filter change handler ────────────────────────────────────────────────────

  function handleFiltersChange(filters: TimelineFilterState) {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }

  // ── Record open handler — wires into drawerStore ─────────────────────────────

  function handleOpenRecord(recordId: string) {
    openDrawer(recordId);
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filteredEvents = useMemo(
    () => applyFilters(state.events, state.filters),
    [state.events, state.filters],
  );

  const dateGroups = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  // ── Render: loading skeleton ────────────────────────────────────────────────

  if (loading) {
    return <TemplateSkeleton variant="timeline-activity" />;
  }

  // ── Render: error ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={classes.errorWrapper} role="alert" aria-live="assertive">
        {error}
      </div>
    );
  }

  // ── Render: main ────────────────────────────────────────────────────────────

  const isEmpty = filteredEvents.length === 0 && !state.loadingMore;

  return (
    <div
      className={classes.root}
      aria-label={t('timeline.template.ariaLabel')}
      data-testid="timeline-activity-template"
    >
      {/* Filter bar */}
      <div className={classes.filters}>
        <TimelineFilters filters={state.filters} onFiltersChange={handleFiltersChange} />
      </div>

      {/* Event list */}
      {isEmpty ? (
        <div className={classes.emptyWrapper}>
          <EmptyState
            icon={<IconHistory />}
            message={t('timeline.template.empty')}
          />
        </div>
      ) : (
        <div
          className={classes.eventList}
          role="feed"
          aria-label={t('timeline.template.feedAriaLabel')}
          aria-busy={state.loadingMore}
        >
          {dateGroups.map((group) => (
            <div key={group.date} className={classes.dateGroup}>
              <DateGroupHeader date={group.date} label={group.label} />
              {group.events.map((event) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  onOpenRecord={handleOpenRecord}
                />
              ))}
            </div>
          ))}

          {/* Sentinel element for IntersectionObserver */}
          <div ref={sentinelRef} className={classes.sentinel} aria-hidden="true" />

          {/* Manual load-more fallback */}
          {state.hasMore && !state.loadingMore && (
            <div className={classes.loadMore}>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => void loadMore()}
                aria-label={t('timeline.template.loadMore')}
                data-testid="timeline-load-more"
              >
                {t('timeline.template.loadMore')}
              </Button>
            </div>
          )}

          {/* Loading indicator for additional pages */}
          {state.loadingMore && (
            <div className={classes.loadMore}>
              <TemplateSkeleton variant="timeline-activity" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Template registration ────────────────────────────────────────────────────

registerTemplate('timeline-activity', TimelineActivityTemplate, {
  label: 'Timeline Activity',
  icon: 'IconHistory',
  description: 'Vertical activity stream with filtering, grouping by date, and infinite scroll.',
  defaultConfig: {
    templateType: 'timeline-activity',
  },
});

'use client';

/**
 * HistoryTab — audit trail timeline for the current record.
 *
 * Displays a paginated list of change events: who, what, when.
 * Shows a "Load more" button for pagination.
 * Uses --v-text-secondary for timestamps per Style Guide.
 *
 * Implements US-128d (History tab).
 */

import React, { useState } from 'react';
import { Button, Skeleton } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { EmptyState } from '../../EmptyState/EmptyState';
import { t } from '../../../lib/i18n';
import classes from './HistoryTab.module.css';

export interface HistoryEvent {
  id: string;
  actor: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

interface HistoryTabProps {
  recordId: string;
  /** Initial events to display (first page). */
  events?: HistoryEvent[];
  /** Whether events are currently loading. */
  loading?: boolean;
  /** Whether more events are available to load. */
  hasMore?: boolean;
  /** Called when the user clicks "Load more". */
  onLoadMore?: () => void;
  /** Whether a load-more request is in progress. */
  loadingMore?: boolean;
}

/** Format an ISO timestamp to a human-readable relative or absolute string. */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return t('drawer.history.justNow');
    if (diffMin < 60) return t('drawer.history.minutesAgo', { count: String(diffMin) });
    if (diffHr < 24) return t('drawer.history.hoursAgo', { count: String(diffHr) });
    if (diffDay < 7) return t('drawer.history.daysAgo', { count: String(diffDay) });

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Build a human-readable description of the change. */
function formatAction(event: HistoryEvent): string {
  if (event.field && event.oldValue !== undefined && event.newValue !== undefined) {
    return t('drawer.history.changedField', {
      field: event.field,
      from: event.oldValue || '—',
      to: event.newValue || '—',
    });
  }
  return event.action;
}

export function HistoryTab({
  recordId: _recordId,
  events = [],
  loading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
}: HistoryTabProps) {
  // Track which event is expanded (shows full diff)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className={classes.skeletonList} aria-label={t('drawer.history.loading')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={classes.skeletonItem}>
            <Skeleton circle height={28} width={28} />
            <div style={{ flex: 1 }}>
              <Skeleton height={12} width="40%" mb={4} />
              <Skeleton height={10} width="70%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<IconHistory />}
        message={t('drawer.history.empty')}
      />
    );
  }

  return (
    <div className={classes.root} aria-label={t('drawer.history.ariaLabel')}>
      <ol className={classes.timeline} aria-label={t('drawer.history.timelineAriaLabel')}>
        {events.map((event) => {
          const isExpanded = expandedId === event.id;
          const hasDetail =
            event.field !== undefined &&
            (event.oldValue !== undefined || event.newValue !== undefined);

          return (
            <li key={event.id} className={classes.event}>
              {/* Timeline dot */}
              <span className={classes.dot} aria-hidden="true" />

              {/* Event body */}
              <div className={classes.eventBody}>
                <div className={classes.eventHeader}>
                  <span className={classes.actor}>{event.actor}</span>
                  <time
                    className={classes.timestamp}
                    dateTime={event.timestamp}
                    title={new Date(event.timestamp).toLocaleString()}
                  >
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>

                <p className={classes.action}>{formatAction(event)}</p>

                {hasDetail && (
                  <button
                    className={classes.expandButton}
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? t('drawer.history.hideDetail') : t('drawer.history.showDetail')}
                  </button>
                )}

                {isExpanded && hasDetail && (
                  <dl className={classes.diff}>
                    <div className={classes.diffRow}>
                      <dt className={classes.diffLabel}>{t('drawer.history.from')}</dt>
                      <dd className={classes.diffOld}>{event.oldValue || '—'}</dd>
                    </div>
                    <div className={classes.diffRow}>
                      <dt className={classes.diffLabel}>{t('drawer.history.to')}</dt>
                      <dd className={classes.diffNew}>{event.newValue || '—'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <div className={classes.loadMore}>
          <Button
            size="xs"
            variant="subtle"
            onClick={onLoadMore}
            loading={loadingMore}
            aria-label={t('drawer.history.loadMore')}
          >
            {t('drawer.history.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}

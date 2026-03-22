'use client';

/**
 * TimelineEvent — individual activity event in the timeline template.
 *
 * Displays: colored dot/icon, actor avatar, title, type badge, description,
 * timestamp, and an optional expandable detail panel showing the raw payload.
 *
 * Event type colors per plan:
 *   order   → green  (#1D9E75 mapped to --v-color-green)
 *   payment → blue   (#2378CB mapped to --v-color-blue)
 *   system  → gray   (#666666 mapped to --v-text-tertiary)
 *   agent   → purple (#7B61A6 mapped to --v-color-purple)
 *
 * All colors via --v-* CSS custom properties.
 * All user-facing strings via t('key').
 * Implements US-134 AC-2.
 */

import React, { useState } from 'react';
import { Avatar, Badge } from '@mantine/core';
import {
  IconShoppingCart,
  IconCreditCard,
  IconSettings,
  IconRobot,
  IconActivity,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../../components/TruncatedText';
import classes from './TimelineActivityTemplate.module.css';

/** Supported event type identifiers. */
export type TimelineEventType = 'order' | 'payment' | 'system' | 'agent' | string;

/** Data shape for a single activity event. */
export interface TimelineEventData {
  /** Unique event identifier. */
  id: string;
  /** Event type — controls the dot color and icon. */
  type: TimelineEventType;
  /** Short title shown in bold. */
  title: string;
  /** Longer description shown below the title. */
  description?: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Actor who triggered the event. */
  actor?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  /** Optional raw payload shown in the expandable detail panel. */
  detail?: Record<string, unknown>;
  /** Optional ID of a related record (enables navigation on click). */
  relatedRecordId?: string;
}

export interface TimelineEventProps {
  event: TimelineEventData;
  /** Called when user clicks to open the related record. */
  onOpenRecord?: (recordId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_DOT_CLASS: Record<string, string> = {
  order: classes.dotOrder,
  payment: classes.dotPayment,
  system: classes.dotSystem,
  agent: classes.dotAgent,
};

const TYPE_BADGE_COLOR: Record<string, string> = {
  order: 'green',
  payment: 'blue',
  system: 'gray',
  agent: 'violet',
};

function EventTypeIcon({ type }: { type: TimelineEventType }) {
  const size = 14;
  switch (type) {
    case 'order':
      return <IconShoppingCart size={size} aria-hidden="true" />;
    case 'payment':
      return <IconCreditCard size={size} aria-hidden="true" />;
    case 'system':
      return <IconSettings size={size} aria-hidden="true" />;
    case 'agent':
      return <IconRobot size={size} aria-hidden="true" />;
    default:
      return <IconActivity size={size} aria-hidden="true" />;
  }
}

/**
 * Format a timestamp for display.
 * Shows time for today's events, date + time for older ones.
 */
function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TimelineEvent({ event, onOpenRecord }: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false);

  const dotClass = TYPE_DOT_CLASS[event.type] ?? classes.dotDefault;
  const badgeColor = TYPE_BADGE_COLOR[event.type] ?? 'gray';
  const hasDetail = event.detail != null && Object.keys(event.detail).length > 0;
  const hasRelated = Boolean(event.relatedRecordId);

  function handleClick() {
    if (hasRelated && onOpenRecord && event.relatedRecordId) {
      onOpenRecord(event.relatedRecordId);
    }
  }

  function handleToggleExpand(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  return (
    <div
      className={classes.event}
      role={hasRelated ? 'button' : undefined}
      tabIndex={hasRelated ? 0 : undefined}
      onClick={hasRelated ? handleClick : undefined}
      onKeyDown={
        hasRelated
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') handleClick();
            }
          : undefined
      }
      aria-label={event.title}
      data-testid="timeline-event"
    >
      {/* Colored dot with icon */}
      <span className={`${classes.eventDot} ${dotClass}`} aria-hidden="true">
        <EventTypeIcon type={event.type} />
      </span>

      {/* Event content */}
      <div className={classes.eventContent}>
        {/* Header: title, badge, timestamp */}
        <div className={classes.eventHeader}>
          <span className={classes.eventTitle}>
            <TruncatedText>{event.title}</TruncatedText>
          </span>
          <Badge
            size="xs"
            color={badgeColor}
            variant="light"
            className={classes.eventBadge}
          >
            {event.type}
          </Badge>
          <time className={classes.eventTimestamp} dateTime={event.timestamp}>
            {formatTimestamp(event.timestamp)}
          </time>
        </div>

        {/* Actor */}
        {event.actor && (
          <div className={classes.eventActor}>
            <Avatar
              src={event.actor.avatarUrl ?? null}
              size={16}
              radius="xl"
              aria-label={event.actor.name}
            >
              {event.actor.name.charAt(0).toUpperCase()}
            </Avatar>
            <span className={classes.eventActorName}>{event.actor.name}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className={classes.eventDescription}>
            <TruncatedText>{event.description}</TruncatedText>
          </p>
        )}

        {/* Expand toggle — only when detail payload exists */}
        {hasDetail && (
          <button
            type="button"
            className={classes.expandToggle}
            onClick={handleToggleExpand}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleToggleExpand(e);
            }}
            aria-expanded={expanded}
            aria-label={expanded ? t('timeline.event.hideDetail') : t('timeline.event.showDetail')}
          >
            {expanded ? (
              <IconChevronUp size={12} aria-hidden="true" />
            ) : (
              <IconChevronDown size={12} aria-hidden="true" />
            )}
            {expanded ? t('timeline.event.hideDetail') : t('timeline.event.showDetail')}
          </button>
        )}

        {/* Expanded payload */}
        {expanded && hasDetail && (
          <div className={classes.eventDetail} role="region" aria-label={t('timeline.event.detailRegion')}>
            <pre className={classes.eventDetailPre}>
              {JSON.stringify(event.detail, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

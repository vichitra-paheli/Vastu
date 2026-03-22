'use client';

/**
 * DateGroupHeader — date separator for the timeline activity template.
 *
 * Displays labels like "Today", "Yesterday", or "March 20, 2026" between
 * groups of timeline events that share the same calendar date.
 *
 * All colors and spacing via --v-* CSS custom properties.
 * Implements US-134 AC-1.
 */

import React from 'react';
import classes from './TimelineActivityTemplate.module.css';

export interface DateGroupHeaderProps {
  /** The ISO date string for this group (YYYY-MM-DD). */
  date: string;
  /** Formatted display label (e.g. "Today", "Yesterday", "March 20, 2026"). */
  label: string;
}

export function DateGroupHeader({ label }: DateGroupHeaderProps) {
  return (
    <div className={classes.dateGroupHeader} aria-label={label}>
      <span className={classes.dateGroupLabel}>{label}</span>
      <span className={classes.dateGroupLine} aria-hidden="true" />
    </div>
  );
}

/**
 * Compute a human-readable label for a given ISO date string.
 *
 * Returns "Today", "Yesterday", or a formatted date string.
 *
 * @param isoDate - ISO date string in YYYY-MM-DD format.
 * @param now - Reference date (defaults to current date). Useful for testing.
 */
export function formatDateGroupLabel(isoDate: string, now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(isoDate + 'T00:00:00');

  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return target.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Extract the ISO date string (YYYY-MM-DD) from a Date or ISO timestamp.
 *
 * Uses local date parts (year/month/day) to avoid a UTC date shift — e.g. an
 * event at 23:30 in UTC-5 would appear on the wrong calendar day if we used
 * toISOString() which always outputs in UTC.
 */
export function toIsoDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

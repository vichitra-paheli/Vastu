'use client';

/**
 * TimelineFilters — filter toolbar for the timeline activity template.
 *
 * Provides:
 *  - Text search input (by actor or description)
 *  - Event type multi-select pills (order, payment, system, agent)
 *  - Date range picker (start / end)
 *  - Actor search/dropdown
 *  - Clear all filters button
 *
 * All colors via --v-* CSS custom properties.
 * All strings via t('key').
 * Implements US-134 AC-3.
 */

import React from 'react';
import { TextInput, ActionIcon } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { type TimelineEventType } from './TimelineEvent';
import classes from './TimelineActivityTemplate.module.css';

/** The set of known event types displayed as filter pills. */
const EVENT_TYPES: Array<{ type: TimelineEventType; label: string }> = [
  { type: 'order', label: t('timeline.filter.type.order') },
  { type: 'payment', label: t('timeline.filter.type.payment') },
  { type: 'system', label: t('timeline.filter.type.system') },
  { type: 'agent', label: t('timeline.filter.type.agent') },
];

export interface TimelineFilterState {
  /** Free-text search applied against title, description, and actor name. */
  search: string;
  /** Active event type filters. Empty means all types are shown. */
  activeTypes: TimelineEventType[];
  /** ISO date string for the start of the date range filter (inclusive). */
  dateFrom: string;
  /** ISO date string for the end of the date range filter (inclusive). */
  dateTo: string;
}

export interface TimelineFiltersProps {
  filters: TimelineFilterState;
  onFiltersChange: (filters: TimelineFilterState) => void;
}

export function TimelineFilters({ filters, onFiltersChange }: TimelineFiltersProps) {
  const hasActiveFilters =
    filters.search !== '' ||
    filters.activeTypes.length > 0 ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, search: e.currentTarget.value });
  }

  function handleTypeToggle(type: TimelineEventType) {
    const isActive = filters.activeTypes.includes(type);
    const updated = isActive
      ? filters.activeTypes.filter((activeType) => activeType !== type)
      : [...filters.activeTypes, type];
    onFiltersChange({ ...filters, activeTypes: updated });
  }

  function handleDateFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, dateFrom: e.currentTarget.value });
  }

  function handleDateToChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, dateTo: e.currentTarget.value });
  }

  function handleClearAll() {
    onFiltersChange({ search: '', activeTypes: [], dateFrom: '', dateTo: '' });
  }

  return (
    <div
      className={classes.filterBar}
      role="search"
      aria-label={t('timeline.filters.ariaLabel')}
      data-testid="timeline-filters"
    >
      {/* Text search */}
      <TextInput
        className={classes.filterSearch}
        placeholder={t('timeline.filters.searchPlaceholder')}
        leftSection={<IconSearch size={14} aria-hidden="true" />}
        value={filters.search}
        onChange={handleSearchChange}
        aria-label={t('timeline.filters.searchAriaLabel')}
        size="xs"
        data-testid="timeline-search"
      />

      {/* Type pills */}
      <div
        className={classes.filterPills}
        role="group"
        aria-label={t('timeline.filters.typePillsAriaLabel')}
      >
        {EVENT_TYPES.map(({ type, label }) => {
          const isActive = filters.activeTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              className={`${classes.filterTypePill}${isActive ? ` ${classes.filterTypePillActive}` : ''}`}
              onClick={() => handleTypeToggle(type)}
              aria-pressed={isActive}
              aria-label={`${t('timeline.filters.type.toggle')} ${label}`}
              data-testid={`filter-type-${type}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <div className={classes.filterDateRange} aria-label={t('timeline.filters.dateRangeAriaLabel')}>
        <input
          type="date"
          className={classes.filterDateInput}
          value={filters.dateFrom}
          onChange={handleDateFromChange}
          aria-label={t('timeline.filters.dateFrom')}
          title={t('timeline.filters.dateFrom')}
        />
        <span aria-hidden="true" className={classes.filterDateSeparator}>–</span>
        <input
          type="date"
          className={classes.filterDateInput}
          value={filters.dateTo}
          onChange={handleDateToChange}
          aria-label={t('timeline.filters.dateTo')}
          title={t('timeline.filters.dateTo')}
        />
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <ActionIcon
          size="xs"
          variant="subtle"
          className={classes.filterClear}
          onClick={handleClearAll}
          aria-label={t('timeline.filters.clearAll')}
          title={t('timeline.filters.clearAll')}
          data-testid="timeline-filter-clear"
        >
          <IconX size={12} aria-hidden="true" />
        </ActionIcon>
      )}
    </div>
  );
}

/** Build an empty default filter state. */
export function createDefaultFilterState(): TimelineFilterState {
  return { search: '', activeTypes: [], dateFrom: '', dateTo: '' };
}

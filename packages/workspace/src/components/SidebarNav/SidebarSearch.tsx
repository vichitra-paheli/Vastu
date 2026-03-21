'use client';

/**
 * SidebarSearch — search input for filtering pages in the expanded sidebar.
 *
 * Only visible when the sidebar is expanded. Filters the PAGES section
 * by updating `searchQuery` in sidebarStore.
 */

import React, { useId } from 'react';
import classes from './SidebarNav.module.css';

interface SidebarSearchProps {
  /** Current search query value. */
  value: string;
  /** Called when the user types in the search input. */
  onChange: (value: string) => void;
  /** Placeholder text (should come from t('key')). */
  placeholder?: string;
}

export function SidebarSearch({ value, onChange, placeholder = 'Search pages...' }: SidebarSearchProps) {
  const inputId = useId();

  return (
    <div className={classes.searchWrapper}>
      <input
        id={inputId}
        type="search"
        className={classes.searchInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

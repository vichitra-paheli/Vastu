'use client';

/**
 * SidebarSection — collapsible section header for the sidebar nav.
 *
 * Sections: PAGES, SYSTEM, ADMIN
 * Section headers use --v-text-xs font size (uppercase label).
 * In collapsed mode, renders a thin divider instead of a header.
 */

import React, { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import classes from './SidebarNav.module.css';

interface SidebarSectionProps {
  /** Section label (PAGES, SYSTEM, ADMIN). Comes from t('key'). */
  label: string;
  /** Whether the sidebar is in collapsed mode. */
  collapsed: boolean;
  /** Section content (SidebarItem elements). */
  children: React.ReactNode;
  /** Whether section is open by default. */
  defaultOpen?: boolean;
}

export function SidebarSection({ label, collapsed, children, defaultOpen = true }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  // In collapsed mode, show items without section header (just a divider).
  if (collapsed) {
    return (
      <div className={classes.section} role="group" aria-label={label}>
        <div className={classes.collapsedDivider} aria-hidden="true" />
        <div className={classes.sectionItems}>{children}</div>
      </div>
    );
  }

  return (
    <div className={classes.section} role="group" aria-label={label}>
      <button
        type="button"
        className={classes.sectionHeader}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={`section-${label}`}
      >
        <span className={classes.sectionHeaderLabel}>{label}</span>
        <span className={classes.sectionChevron} data-open={open ? 'true' : 'false'} aria-hidden="true">
          <IconChevronDown size={12} />
        </span>
      </button>

      {open && (
        <div id={`section-${label}`} className={classes.sectionItems}>
          {children}
        </div>
      )}
    </div>
  );
}

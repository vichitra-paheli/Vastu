'use client';

/**
 * VastuTabs — shared tab wrapper using Mantine Tabs.
 *
 * Implements the design-system underline variant from Style Guide §5.2.
 * Supports optional icon and badge per tab.
 *
 * Props:
 *   tabs       — ordered tab definitions (key, label, icon?, badge?)
 *   activeTab  — currently selected tab key
 *   onTabChange — called with the new tab key when selection changes
 *
 * Implements US-128c.
 */

import React from 'react';
import { Tabs, Badge } from '@mantine/core';
import classes from './VastuTabs.module.css';

export interface TabDefinition {
  /** Unique tab identifier (used as the Mantine Tabs value). */
  key: string;
  /** Human-readable tab label. */
  label: string;
  /** Optional Tabler icon element displayed before the label. */
  icon?: React.ReactElement;
  /** Optional badge count shown after the label. */
  badge?: number;
}

export interface VastuTabsProps {
  /** Ordered list of tab definitions. */
  tabs: TabDefinition[];
  /** Currently active tab key. */
  activeTab: string;
  /** Callback invoked when the user selects a different tab. */
  onTabChange: (key: string) => void;
  /** Optional additional class for the root Tabs element. */
  className?: string;
  /** aria-label for the tabs list. */
  ariaLabel?: string;
}

export function VastuTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  ariaLabel,
}: VastuTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onChange={(v) => v && onTabChange(v)}
      classNames={{
        root: `${classes.root}${className ? ` ${className}` : ''}`,
        list: classes.list,
        tab: classes.tab,
        tabLabel: classes.tabLabel,
      }}
    >
      <Tabs.List aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.key}
            value={tab.key}
            leftSection={
              tab.icon
                ? React.cloneElement(tab.icon, {
                    size: 14,
                    'aria-hidden': true,
                  })
                : undefined
            }
            rightSection={
              tab.badge !== undefined && tab.badge > 0 ? (
                <Badge
                  size="xs"
                  variant="filled"
                  className={classes.badge}
                  aria-label={`${tab.badge} items`}
                >
                  {tab.badge}
                </Badge>
              ) : undefined
            }
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}

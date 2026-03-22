/**
 * VastuTabs component tests.
 *
 * Covers:
 * - Renders all tabs
 * - Active tab is highlighted (data-active attribute)
 * - Tab change callback is called with the correct key
 * - Badge renders when count is provided
 * - Icon renders when provided
 * - Aria-label on the tab list
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../test-utils/providers';
import { VastuTabs } from '../VastuTabs';
import type { TabDefinition } from '../VastuTabs';

const SAMPLE_TABS: TabDefinition[] = [
  { key: 'details', label: 'Details' },
  { key: 'items', label: 'Items', badge: 5 },
  { key: 'history', label: 'History' },
];

function renderTabs(
  override: Partial<React.ComponentProps<typeof VastuTabs>> = {},
) {
  const onTabChange = vi.fn();
  const props: React.ComponentProps<typeof VastuTabs> = {
    tabs: SAMPLE_TABS,
    activeTab: 'details',
    onTabChange,
    ariaLabel: 'Record tabs',
    ...override,
  };
  const result = render(<VastuTabs {...props} />, { wrapper: TestProviders });
  return { ...result, onTabChange };
}

describe('VastuTabs', () => {
  it('renders all tab labels', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /items/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
  });

  it('marks the active tab with aria-selected', () => {
    renderTabs({ activeTab: 'items' });
    const itemsTab = screen.getByRole('tab', { name: /items/i });
    expect(itemsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('marks non-active tabs as not selected', () => {
    renderTabs({ activeTab: 'details' });
    const historyTab = screen.getByRole('tab', { name: /history/i });
    expect(historyTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange with the correct key when a tab is clicked', () => {
    const { onTabChange } = renderTabs({ activeTab: 'details' });
    fireEvent.click(screen.getByRole('tab', { name: /history/i }));
    expect(onTabChange).toHaveBeenCalledWith('history');
  });

  it('renders a badge when badge count is provided', () => {
    renderTabs({ activeTab: 'details' });
    // Badge with "5" should be in the document
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render a badge when badge is 0 or undefined', () => {
    const tabs: TabDefinition[] = [
      { key: 'a', label: 'Alpha', badge: 0 },
      { key: 'b', label: 'Beta' },
    ];
    renderTabs({ tabs, activeTab: 'a' });
    // No badge elements should have the content "0"
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('applies the provided aria-label to the tab list', () => {
    renderTabs({ ariaLabel: 'My custom label' });
    expect(screen.getByRole('tablist', { name: /my custom label/i })).toBeInTheDocument();
  });

  it('renders with a single tab without error', () => {
    const singleTab: TabDefinition[] = [{ key: 'only', label: 'Only Tab' }];
    const { onTabChange } = renderTabs({ tabs: singleTab, activeTab: 'only' });
    expect(screen.getByRole('tab', { name: /only tab/i })).toBeInTheDocument();
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('renders tabs in the provided order', () => {
    renderTabs();
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveTextContent('Details');
    expect(tabs[1]).toHaveTextContent('Items');
    expect(tabs[2]).toHaveTextContent('History');
  });
});

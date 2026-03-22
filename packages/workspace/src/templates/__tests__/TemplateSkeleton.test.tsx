/**
 * Component tests for TemplateSkeleton.
 *
 * Verifies that:
 * - Each TemplateType variant renders without crashing
 * - The rendered output has the correct ARIA busy/status attributes
 * - Table-listing and data-explorer share the same skeleton layout
 * - Dashboard and summary-dashboard share the same skeleton layout
 *
 * NOTE: Mantine v7 Skeleton uses CSS modules with hashed class names.
 * We query rendered elements by the data-visible attribute that Mantine
 * sets on each Skeleton node, rather than by class name.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { TemplateSkeleton } from '../TemplateSkeleton';
import type { TemplateType } from '../types';

function renderWithMantine(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const ALL_VARIANTS: TemplateType[] = [
  'table-listing',
  'summary-dashboard',
  'multi-tab-detail',
  'data-explorer',
  'form-page',
  'timeline-activity',
  'dashboard',
];

/** Query all Mantine Skeleton elements in the container. */
function querySkeletons(container: HTMLElement): NodeList {
  // Mantine v7 Skeleton renders a <div> with data-visible attribute.
  return container.querySelectorAll('[data-visible]');
}

describe('TemplateSkeleton', () => {
  describe('renders without crashing for all variants', () => {
    for (const variant of ALL_VARIANTS) {
      it(`variant: ${variant}`, () => {
        expect(() => renderWithMantine(<TemplateSkeleton variant={variant} />)).not.toThrow();
      });
    }
  });

  describe('ARIA attributes', () => {
    for (const variant of ALL_VARIANTS) {
      it(`variant "${variant}" has role="status" and aria-busy="true"`, () => {
        const { container } = renderWithMantine(<TemplateSkeleton variant={variant} />);
        const status = container.querySelector('[role="status"]');
        expect(status).not.toBeNull();
        expect(status?.getAttribute('aria-busy')).toBe('true');
      });
    }
  });

  it('table-listing renders multiple skeleton elements', () => {
    const { container } = renderWithMantine(<TemplateSkeleton variant="table-listing" />);
    const skeletons = querySkeletons(container);
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it('data-explorer renders the same layout as table-listing', () => {
    const { container: tableContainer } = renderWithMantine(
      <TemplateSkeleton variant="table-listing" />,
    );
    const { container: explorerContainer } = renderWithMantine(
      <TemplateSkeleton variant="data-explorer" />,
    );
    // Same number of skeleton elements since they share a layout
    const tableSkelets = querySkeletons(tableContainer);
    const explorerSkelets = querySkeletons(explorerContainer);
    expect(tableSkelets.length).toBe(explorerSkelets.length);
  });

  it('dashboard and summary-dashboard render the same layout', () => {
    const { container: dashContainer } = renderWithMantine(
      <TemplateSkeleton variant="dashboard" />,
    );
    const { container: summaryContainer } = renderWithMantine(
      <TemplateSkeleton variant="summary-dashboard" />,
    );
    const dashSkelets = querySkeletons(dashContainer);
    const summarySkelets = querySkeletons(summaryContainer);
    expect(dashSkelets.length).toBe(summarySkelets.length);
  });

  it('form-page renders multiple skeleton elements for fields', () => {
    const { container } = renderWithMantine(<TemplateSkeleton variant="form-page" />);
    const skeletons = querySkeletons(container);
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('multi-tab-detail renders skeleton elements for header, tabs, and content', () => {
    const { container } = renderWithMantine(<TemplateSkeleton variant="multi-tab-detail" />);
    const skeletons = querySkeletons(container);
    expect(skeletons.length).toBeGreaterThanOrEqual(7);
  });

  it('timeline-activity renders skeleton elements for timeline items', () => {
    const { container } = renderWithMantine(<TemplateSkeleton variant="timeline-activity" />);
    const skeletons = querySkeletons(container);
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });

  it('has an accessible loading label on the status region', () => {
    renderWithMantine(<TemplateSkeleton variant="table-listing" />);
    // The aria-label should be the translated loading string
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label');
    expect(status.getAttribute('aria-label')).toBeTruthy();
  });
});

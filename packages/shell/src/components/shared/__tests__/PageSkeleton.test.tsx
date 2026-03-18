/**
 * PageSkeleton tests — Patterns Library §6 Loading state choreography.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageSkeleton } from '../PageSkeleton';
import { TestProviders } from '../../../test-utils/providers';

function renderComponent(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

/**
 * Counts Mantine Skeleton instances rendered in the container.
 * Mantine Skeleton renders with data-animate and data-visible attributes.
 */
function countSkeletons(container: HTMLElement): number {
  return container.querySelectorAll('[data-animate]').length;
}

describe('PageSkeleton', () => {
  it('renders the default number of skeleton rows (5)', () => {
    const { container } = renderComponent(<PageSkeleton />);
    // Default: showHeader=true, showActions=true → 2 header skeletons + 5 row skeletons = 7
    expect(countSkeletons(container)).toBe(7);
  });

  it('renders a custom number of skeleton rows', () => {
    const { container } = renderComponent(<PageSkeleton rows={3} />);
    // showHeader=true, showActions=true → 2 + 3 = 5
    expect(countSkeletons(container)).toBe(5);
  });

  it('shows header skeleton when showHeader is true', () => {
    const { container } = renderComponent(<PageSkeleton showHeader={true} rows={0} />);
    // 1 title skeleton + 1 action button skeleton = 2
    expect(countSkeletons(container)).toBe(2);
  });

  it('hides header skeleton when showHeader is false', () => {
    const { container } = renderComponent(<PageSkeleton showHeader={false} rows={0} />);
    expect(countSkeletons(container)).toBe(0);
  });

  it('hides action button skeleton when showActions is false', () => {
    const { container } = renderComponent(
      <PageSkeleton showHeader={true} showActions={false} rows={0} />,
    );
    // Only the title skeleton, no action button skeleton
    expect(countSkeletons(container)).toBe(1);
  });

  it('renders zero skeletons when rows=0 and showHeader=false', () => {
    const { container } = renderComponent(<PageSkeleton showHeader={false} rows={0} />);
    expect(countSkeletons(container)).toBe(0);
  });
});

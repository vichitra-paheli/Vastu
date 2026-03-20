/**
 * TruncatedText tests — Patterns Library §7
 */

import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { TruncatedText } from '../TruncatedText';
import { TestProviders } from '@/test-utils/providers';

function renderComponent(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

describe('TruncatedText', () => {
  afterEach(() => {
    // Ensure any overridden prototype descriptors are reset between tests
    const existing = Object.getOwnPropertyDescriptor(HTMLElement.prototype, '_testScrollWidth');
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cleanup dynamic test property
      delete (HTMLElement.prototype as any)._testScrollWidth;
    }
  });

  it('renders text content', () => {
    renderComponent(<TruncatedText>Hello world</TruncatedText>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('does not show tooltip when text is not truncated', async () => {
    const user = userEvent.setup();

    // jsdom: scrollWidth === clientWidth === 0 → no truncation
    renderComponent(<TruncatedText>Short text</TruncatedText>);

    const textEl = screen.getByText('Short text');
    await user.hover(textEl);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders Tooltip wrapping when text is truncated (scrollWidth > clientWidth)', async () => {
    // Override scrollWidth before rendering so the initial useEffect check detects truncation
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollWidth',
    );

    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return (this as HTMLElement).clientWidth + 200;
      },
    });

    const user = userEvent.setup();

    await act(async () => {
      renderComponent(
        <TruncatedText maxWidth={100}>
          Acme Corporation International Holdings Ltd.
        </TruncatedText>,
      );
    });

    const textEl = screen.getByText('Acme Corporation International Holdings Ltd.');

    // Hover to trigger the Mantine Tooltip to display
    await user.hover(textEl);

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Acme Corporation International Holdings Ltd.');

    // Restore
    if (originalDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalDescriptor);
    }
  });

  it('applies maxWidth as inline style when provided as a number', () => {
    renderComponent(<TruncatedText maxWidth={200}>text</TruncatedText>);
    expect(screen.getByText('text')).toHaveStyle({ maxWidth: '200px' });
  });

  it('applies maxWidth as inline style when provided as a string', () => {
    renderComponent(<TruncatedText maxWidth="50%">text</TruncatedText>);
    expect(screen.getByText('text')).toHaveStyle({ maxWidth: '50%' });
  });

  it('renders without a maxWidth prop', () => {
    renderComponent(<TruncatedText>no max width</TruncatedText>);
    expect(screen.getByText('no max width')).toBeInTheDocument();
  });

  it('applies WebkitLineClamp style in multi-line mode', () => {
    renderComponent(
      <TruncatedText lines={3}>Multi line truncated text that might be long</TruncatedText>,
    );
    expect(
      screen.getByText('Multi line truncated text that might be long'),
    ).toHaveStyle({ WebkitLineClamp: '3' });
  });

  it('renders an empty string child without crashing', () => {
    expect(() => renderComponent(<TruncatedText>{''}</TruncatedText>)).not.toThrow();
  });
});

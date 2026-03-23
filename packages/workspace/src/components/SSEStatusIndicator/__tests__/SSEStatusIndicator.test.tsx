/**
 * Component tests for SSEStatusIndicator (US-207 AC-10).
 *
 * Tests cover:
 * - Renders with correct data-state attribute for each connection state
 * - aria-label corresponds to the correct i18n string
 * - title attribute matches aria-label (for tooltip)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SSEStatusIndicator } from '../SSEStatusIndicator';

describe('SSEStatusIndicator', () => {
  it('renders with data-state="connected" when connected', () => {
    render(<SSEStatusIndicator state="connected" />);
    const el = screen.getByTestId('sse-status-indicator');
    expect(el).toHaveAttribute('data-state', 'connected');
  });

  it('renders with data-state="connecting" when connecting', () => {
    render(<SSEStatusIndicator state="connecting" />);
    const el = screen.getByTestId('sse-status-indicator');
    expect(el).toHaveAttribute('data-state', 'connecting');
  });

  it('renders with data-state="disconnected" when disconnected', () => {
    render(<SSEStatusIndicator state="disconnected" />);
    const el = screen.getByTestId('sse-status-indicator');
    expect(el).toHaveAttribute('data-state', 'disconnected');
  });

  it('has an aria-label for the connected state', () => {
    render(<SSEStatusIndicator state="connected" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Live updates: connected');
  });

  it('has an aria-label for the connecting state', () => {
    render(<SSEStatusIndicator state="connecting" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Live updates: reconnecting');
  });

  it('has an aria-label for the disconnected state', () => {
    render(<SSEStatusIndicator state="disconnected" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Live updates: disconnected');
  });

  it('has a title matching the aria-label (tooltip)', () => {
    render(<SSEStatusIndicator state="connected" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('title')).toBe(el.getAttribute('aria-label'));
  });

  it('contains a decorative dot element (aria-hidden)', () => {
    render(<SSEStatusIndicator state="connected" />);
    const dot = screen.getByTestId('sse-status-indicator').querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeNull();
  });
});

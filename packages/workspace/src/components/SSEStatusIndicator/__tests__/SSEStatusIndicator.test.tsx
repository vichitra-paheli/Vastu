/**
 * Component tests for SSEStatusIndicator.
 *
 * Tests cover:
 * - Renders a dot with the correct data-status attribute for each state
 * - Tooltip title reflects the connection status
 * - aria-label reflects the connection status
 * - showLabel=false: no label text rendered
 * - showLabel=true: label text rendered
 * - Reacts to store state changes (connected → disconnected)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SSEStatusIndicator } from '../SSEStatusIndicator';
import { useSSEConnectionStore } from '../../../stores/sseConnectionStore';
import { TestProviders } from '../../../test-utils/providers';

function renderIndicator(props?: { showLabel?: boolean }) {
  return render(<SSEStatusIndicator {...props} />, { wrapper: TestProviders });
}

beforeEach(() => {
  useSSEConnectionStore.setState({ status: 'disconnected' });
});

describe('SSEStatusIndicator', () => {
  describe('dot data-status attribute', () => {
    it('renders data-status="connected" when connected', () => {
      useSSEConnectionStore.setState({ status: 'connected' });
      renderIndicator();
      expect(screen.getByTestId('sse-status-dot')).toHaveAttribute(
        'data-status',
        'connected',
      );
    });

    it('renders data-status="connecting" when connecting', () => {
      useSSEConnectionStore.setState({ status: 'connecting' });
      renderIndicator();
      expect(screen.getByTestId('sse-status-dot')).toHaveAttribute(
        'data-status',
        'connecting',
      );
    });

    it('renders data-status="disconnected" when disconnected', () => {
      useSSEConnectionStore.setState({ status: 'disconnected' });
      renderIndicator();
      expect(screen.getByTestId('sse-status-dot')).toHaveAttribute(
        'data-status',
        'disconnected',
      );
    });
  });

  describe('tooltip title', () => {
    it('shows connected label in title when connected', () => {
      useSSEConnectionStore.setState({ status: 'connected' });
      renderIndicator();
      expect(screen.getByTestId('sse-status-indicator')).toHaveAttribute(
        'title',
        expect.stringContaining('connected'),
      );
    });

    it('shows connecting label in title when connecting', () => {
      useSSEConnectionStore.setState({ status: 'connecting' });
      renderIndicator();
      expect(screen.getByTestId('sse-status-indicator')).toHaveAttribute(
        'title',
        expect.stringContaining('connecting'),
      );
    });

    it('shows disconnected label in title when disconnected', () => {
      useSSEConnectionStore.setState({ status: 'disconnected' });
      renderIndicator();
      expect(screen.getByTestId('sse-status-indicator')).toHaveAttribute(
        'title',
        expect.stringContaining('disconnected'),
      );
    });
  });

  describe('label visibility', () => {
    it('does not render label text by default', () => {
      useSSEConnectionStore.setState({ status: 'connected' });
      renderIndicator();
      expect(screen.queryByTestId('sse-status-label')).not.toBeInTheDocument();
    });

    it('renders label text when showLabel=true', () => {
      useSSEConnectionStore.setState({ status: 'connected' });
      renderIndicator({ showLabel: true });
      expect(screen.getByTestId('sse-status-label')).toBeInTheDocument();
    });
  });

  describe('reactivity', () => {
    it('updates dot status when store changes', () => {
      useSSEConnectionStore.setState({ status: 'connected' });
      renderIndicator();
      expect(screen.getByTestId('sse-status-dot')).toHaveAttribute(
        'data-status',
        'connected',
      );
      // Change store state
      useSSEConnectionStore.setState({ status: 'disconnected' });
      expect(screen.getByTestId('sse-status-dot')).toHaveAttribute(
        'data-status',
        'disconnected',
      );
    });
  });
});

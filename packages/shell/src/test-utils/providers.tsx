'use client';

/**
 * TestProviders — Wrapper for component tests.
 * Provides MantineProvider (with Vastu theme) and Notifications.
 * Also exports a custom render function and re-exports common testing utilities.
 */

import React from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { render, type RenderOptions } from '@testing-library/react';
import { vastuTheme } from '../theme';

export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={vastuTheme} env="test">
      <Notifications position="bottom-right" limit={3} />
      {children}
    </MantineProvider>
  );
}

/**
 * Custom render function that automatically wraps the component under test
 * with TestProviders (MantineProvider + Notifications).
 *
 * Usage:
 *   import { render, screen } from '@/test-utils';
 *   render(<MyComponent />);
 */
function customRender(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: TestProviders, ...options });
}

export { customRender as render };
export { screen, fireEvent, waitFor, within, act } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

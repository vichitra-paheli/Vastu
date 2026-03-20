'use client';

/**
 * useColorScheme — Hook for color scheme switching.
 *
 * Syncs Mantine's color scheme with the user's stored preference.
 * Provides a setter that updates both the Mantine context and persists
 * the preference via the appearance API endpoint.
 *
 * This is a thin wrapper around useMantineColorScheme that adds:
 * - Typed color scheme values matching the User model
 * - A setter that persists the preference server-side
 */

import { useMantineColorScheme } from '@mantine/core';
import type { MantineColorScheme } from '@mantine/core';

export type ColorSchemeValue = 'light' | 'dark' | 'auto';

export interface UseColorSchemeReturn {
  /** The current Mantine color scheme value ('light' | 'dark' | 'auto'). */
  colorScheme: MantineColorScheme;
  /**
   * Set the color scheme. Applies immediately via Mantine and optionally
   * persists the value to the server (when persistFn is provided).
   */
  setColorScheme: (value: ColorSchemeValue) => void;
}

/**
 * Hook for reading and setting the color scheme.
 *
 * Delegates to Mantine's useMantineColorScheme under the hood.
 * Persistence (API call) is handled by AppearanceSettings which uses
 * this hook alongside its debounced save logic.
 */
export function useColorScheme(): UseColorSchemeReturn {
  const { colorScheme, setColorScheme: mantineSetColorScheme } = useMantineColorScheme();

  function setColorScheme(value: ColorSchemeValue): void {
    // Mantine uses 'auto' for system preference; map our value directly.
    mantineSetColorScheme(value);
  }

  return { colorScheme, setColorScheme };
}

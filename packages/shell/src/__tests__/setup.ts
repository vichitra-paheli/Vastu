import '@testing-library/jest-dom';
import { vi } from 'vitest';

/**
 * ResizeObserver polyfill for jsdom.
 */
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

/**
 * window.matchMedia polyfill for jsdom.
 * Required by Mantine's color scheme detection and media query hooks.
 */
/**
 * URL.createObjectURL polyfill for jsdom.
 * Required by AvatarUpload.tsx when creating a preview URL for a selected file.
 */
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock-url'),
  });
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

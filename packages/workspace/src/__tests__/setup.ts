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

/**
 * localStorage polyfill for jsdom.
 * Required by Zustand's persist middleware.
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

/**
 * EventSource polyfill for jsdom.
 * jsdom does not implement the EventSource API (SSE).
 * Tests that exercise SSE behaviour (useWorkspaceEvents) use their own
 * per-test mock via vi.stubGlobal. This stub prevents ReferenceError in
 * components that mount useWorkspaceEvents without testing SSE directly.
 */
if (typeof globalThis.EventSource === 'undefined') {
  class EventSourceStub extends EventTarget {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;

    readyState: number = EventSourceStub.CONNECTING;
    url: string;
    withCredentials: boolean = false;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onopen: ((ev: Event) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;

    constructor(url: string) {
      super();
      this.url = url;
    }

    close() {
      this.readyState = EventSourceStub.CLOSED;
    }
  }

  // Cast required because the full EventSource interface has readonly statics
  // that TypeScript considers non-assignable to the global declaration.
  // @ts-expect-error — intentional polyfill assignment
  globalThis.EventSource = EventSourceStub;
}

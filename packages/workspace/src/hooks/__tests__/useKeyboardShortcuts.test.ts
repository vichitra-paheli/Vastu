/**
 * Tests for useKeyboardShortcuts hook.
 *
 * Covers:
 * - Shortcut fires callback when key pressed
 * - Shortcut suppressed when focus is in an input
 * - Meta shortcuts (Cmd+K) work even when focus is in an input
 * - "?" shortcut is suppressed in inputs, works outside
 * - Context-specific shortcut only fires when context element has focus
 *
 * Implements US-126d.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import type { ShortcutDefinition } from '../useKeyboardShortcuts';
import React from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Dispatch a synthetic KeyboardEvent on window.
 */
function fireKey(
  key: string,
  options: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; shiftKey?: boolean } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    shiftKey: options.shiftKey ?? false,
  });
  window.dispatchEvent(event);
  return event;
}

/**
 * Override document.activeElement to point to the given element.
 */
function setActiveElement(el: Element | null) {
  Object.defineProperty(document, 'activeElement', {
    value: el ?? document.body,
    configurable: true,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    setActiveElement(document.body);
  });

  afterEach(() => {
    setActiveElement(document.body);
    vi.restoreAllMocks();
  });

  it('calls the handler when a matching key is pressed', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'a', group: 'General', description: 'Test A', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    act(() => {
      fireKey('a');
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler when a different key is pressed', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'a', group: 'General', description: 'Test A', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    act(() => {
      fireKey('b');
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'z', group: 'General', description: 'Test Z', handler },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(defs));
    unmount();

    act(() => {
      fireKey('z');
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('suppresses shortcut when focus is in an <input>', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'j', group: 'Table', description: 'Next row', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    const input = document.createElement('input');
    document.body.appendChild(input);
    setActiveElement(input);

    act(() => {
      fireKey('j');
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('suppresses shortcut when focus is in a <textarea>', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'k', group: 'Table', description: 'Prev row', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    setActiveElement(textarea);

    act(() => {
      fireKey('k');
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('suppresses shortcut when focus is in a <select>', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'x', group: 'Table', description: 'Toggle selection', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    const select = document.createElement('select');
    document.body.appendChild(select);
    setActiveElement(select);

    act(() => {
      fireKey('x');
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it('suppresses shortcut when focus is in a [contenteditable] element', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'x', group: 'Table', description: 'Toggle selection', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    // Create a contenteditable div and mock isContentEditable to be true.
    const div = document.createElement('div');
    document.body.appendChild(div);

    // Override isContentEditable on the instance so isInputFocused() detects it.
    Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true });
    setActiveElement(div);

    act(() => {
      fireKey('x');
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it('Meta shortcut (Cmd+K) fires even when focus is in an input', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'k', modifiers: ['Meta'], group: 'General', description: 'Command palette', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    const input = document.createElement('input');
    document.body.appendChild(input);
    setActiveElement(input);

    act(() => {
      fireKey('k', { metaKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it('Meta shortcut fires via Ctrl key (cross-platform) even when focus is in an input', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 's', modifiers: ['Meta'], group: 'General', description: 'Save', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    const input = document.createElement('input');
    document.body.appendChild(input);
    setActiveElement(input);

    act(() => {
      fireKey('s', { ctrlKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
  });

  it('"?" shortcut fires when no input is focused', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: '?', group: 'General', description: 'Show shortcuts', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    act(() => {
      fireKey('?');
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('"?" shortcut is suppressed when an input is focused', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: '?', group: 'General', description: 'Show shortcuts', handler },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    const input = document.createElement('input');
    document.body.appendChild(input);
    setActiveElement(input);

    act(() => {
      fireKey('?');
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('context-specific shortcut only fires when the context element is focused', () => {
    const handler = vi.fn();
    const contextEl = document.createElement('div');
    contextEl.tabIndex = -1;
    document.body.appendChild(contextEl);

    const contextRef = { current: contextEl } as React.RefObject<HTMLElement>;

    const defs: ShortcutDefinition[] = [
      {
        key: 'j',
        group: 'Table',
        description: 'Next row',
        contextRef,
        handler,
      },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    // Press "j" with focus on body — handler should NOT fire.
    setActiveElement(document.body);
    act(() => {
      fireKey('j');
    });
    expect(handler).not.toHaveBeenCalled();

    // Focus the context element — handler should fire.
    setActiveElement(contextEl);

    act(() => {
      fireKey('j');
    });
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(contextEl);
  });

  it('context-specific shortcut fires when a child of the context element is focused', () => {
    const handler = vi.fn();
    const contextEl = document.createElement('div');
    const child = document.createElement('button');
    contextEl.appendChild(child);
    document.body.appendChild(contextEl);

    const contextRef = { current: contextEl } as React.RefObject<HTMLElement>;

    const defs: ShortcutDefinition[] = [
      {
        key: 'j',
        group: 'Table',
        description: 'Next row',
        contextRef,
        handler,
      },
    ];

    renderHook(() => useKeyboardShortcuts(defs));

    // Focus a child element — handler should fire.
    setActiveElement(child);

    act(() => {
      fireKey('j');
    });
    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(contextEl);
  });

  it('returns a shortcuts registry without handler functions', () => {
    const handler = vi.fn();
    const defs: ShortcutDefinition[] = [
      { key: 'a', group: 'General', description: 'Action A', handler },
      { key: 'b', modifiers: ['Meta'], group: 'Sidebar', description: 'Action B', handler },
    ];

    const { result } = renderHook(() => useKeyboardShortcuts(defs));

    expect(result.current.shortcuts).toHaveLength(2);
    expect(result.current.shortcuts[0]).toMatchObject({
      key: 'a',
      group: 'General',
      description: 'Action A',
    });
    expect(result.current.shortcuts[0]).not.toHaveProperty('handler');
    expect(result.current.shortcuts[1]).toMatchObject({
      key: 'b',
      modifiers: ['Meta'],
      group: 'Sidebar',
    });
  });
});

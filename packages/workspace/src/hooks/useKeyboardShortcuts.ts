'use client';

/**
 * useKeyboardShortcuts — central keyboard shortcut registration hook.
 *
 * Provides:
 * - A registry of named shortcuts with group, context, key, modifiers, and description.
 * - Listener mounted on `window` that dispatches to registered handlers.
 * - Context-aware suppression: shortcuts scoped to a context element only fire
 *   when that element (or one of its descendants) has focus.
 * - Input suppression: shortcuts are suppressed when focus is inside
 *   <input>, <textarea>, <select>, or [contenteditable] UNLESS the shortcut
 *   uses a Meta modifier (Cmd/Ctrl), in which case it always fires.
 * - "?" shortcut is always suppressed when typing in an input field.
 *
 * Implements US-126 AC-1 (useKeyboardShortcuts hook).
 */

import { useEffect, useLayoutEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Modifier keys that can accompany a shortcut key. */
export type ShortcutModifier = 'Meta' | 'Ctrl' | 'Alt' | 'Shift';

/** Context group that organises shortcuts in the reference overlay. */
export type ShortcutGroup = 'General' | 'Table' | 'Drawer' | 'Sidebar';

/**
 * A single keyboard shortcut definition.
 *
 * @example
 * { key: 'k', modifiers: ['Meta'], group: 'General', description: 'Open command palette', handler: openPalette }
 */
export interface ShortcutDefinition {
  /** The primary key (case-insensitive, e.g. 'k', 'Escape', '?', '[', ']'). */
  key: string;
  /** Optional modifier keys that must be held. */
  modifiers?: ShortcutModifier[];
  /**
   * When provided, the shortcut only fires when `contextRef.current` (or one
   * of its descendants) is the active focused element.
   */
  contextRef?: React.RefObject<HTMLElement | null>;
  /** Display group for the ShortcutsModal. */
  group: ShortcutGroup;
  /** Human-readable description shown in the ShortcutsModal. */
  description: string;
  /** Called when the shortcut fires. Return value is ignored. */
  handler: () => void;
}

/** The full registry entry shape (definition + stable id). */
export interface RegisteredShortcut extends Omit<ShortcutDefinition, 'handler'> {
  id: string;
}

/** Return value of useKeyboardShortcuts. */
export interface UseKeyboardShortcutsReturn {
  /** Read-only list of all registered shortcuts — used by ShortcutsModal. */
  shortcuts: RegisteredShortcut[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Tags whose focused elements suppress non-meta shortcuts. */
const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Returns true when the current active element is an input-like control
 * (including contenteditable elements).
 */
function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (INPUT_TAGS.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/** Returns true if the shortcut uses any Meta or Ctrl modifier. */
function hasMetaModifier(modifiers: ShortcutModifier[] | undefined): boolean {
  if (!modifiers) return false;
  return modifiers.includes('Meta') || modifiers.includes('Ctrl');
}

/**
 * Build a stable string id for a shortcut definition so that the registry
 * array is stable across re-renders even when handler references change.
 */
function buildShortcutId(def: ShortcutDefinition, index: number): string {
  const mods = (def.modifiers ?? []).sort().join('+');
  return `${def.group}:${mods}:${def.key}:${index}`;
}

/** Returns true when the keyboard event matches the shortcut definition. */
function eventMatchesShortcut(e: KeyboardEvent, def: ShortcutDefinition): boolean {
  // Key comparison is case-insensitive for single-character keys.
  const keyMatch = e.key.toLowerCase() === def.key.toLowerCase();
  if (!keyMatch) return false;

  const modifiers = def.modifiers ?? [];
  const wantsMeta = modifiers.includes('Meta');
  const wantsCtrl = modifiers.includes('Ctrl');
  const wantsAlt = modifiers.includes('Alt');
  const wantsShift = modifiers.includes('Shift');

  // For cross-platform Meta/Ctrl shortcuts we treat either key as matching
  // when the definition specifies 'Meta'.
  const metaOrCtrl = e.metaKey || e.ctrlKey;

  if (wantsMeta && !metaOrCtrl) return false;
  if (!wantsMeta && metaOrCtrl) return false;
  if (wantsCtrl && !e.ctrlKey) return false;
  if (wantsAlt !== e.altKey) return false;
  if (wantsShift !== e.shiftKey) return false;

  return true;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useKeyboardShortcuts — register a list of shortcuts and mount the listener.
 *
 * Call once at the workspace layout level with all global shortcuts.
 * Individual feature components (e.g. VastuTable) call this hook with their
 * own scoped shortcut list.
 *
 * The window keydown listener is torn down and re-created whenever the
 * `definitions` array reference changes, so callers should define the array
 * outside the render function or wrap it in useMemo.
 *
 * @param definitions - Array of shortcut definitions to register.
 * @returns `{ shortcuts }` — the full registry for ShortcutsModal.
 */
export function useKeyboardShortcuts(
  definitions: ShortcutDefinition[],
): UseKeyboardShortcutsReturn {
  // Keep a stable ref to the latest definitions so the event listener
  // closure always sees current handlers without being recreated.
  const defsRef = useRef<ShortcutDefinition[]>(definitions);

  // Update the ref synchronously after each render using useLayoutEffect so
  // it is always current before any keydown event fires. Using useLayoutEffect
  // (rather than assigning during render) satisfies the ESLint react-compiler
  // rule that refs must not be accessed during render.
  useLayoutEffect(() => {
    defsRef.current = definitions;
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const defs = defsRef.current;
    const inputFocused = isInputFocused();

    for (const def of defs) {
      if (!eventMatchesShortcut(e, def)) continue;

      // "?" must never fire when an input is focused.
      if (def.key === '?' && inputFocused) continue;

      // Non-meta shortcuts are suppressed inside inputs.
      if (inputFocused && !hasMetaModifier(def.modifiers)) continue;

      // Context check: shortcut only fires when the context element is focused.
      if (def.contextRef) {
        const contextEl = def.contextRef.current;
        if (!contextEl) continue;
        const active = document.activeElement;
        if (!active || !contextEl.contains(active)) continue;
      }

      e.preventDefault();
      def.handler();
      // Stop after the first match — more specific shortcuts should be listed first.
      break;
    }
  }, []); // stable — reads from defsRef

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Build the public registry (strip handler, add stable id).
  const shortcuts: RegisteredShortcut[] = definitions.map((def, i) => ({
    id: buildShortcutId(def, i),
    key: def.key,
    modifiers: def.modifiers,
    contextRef: def.contextRef,
    group: def.group,
    description: def.description,
  }));

  return { shortcuts };
}

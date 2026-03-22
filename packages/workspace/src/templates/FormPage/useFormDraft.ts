'use client';

/**
 * useFormDraft — auto-save form draft to localStorage every 30 seconds.
 *
 * Features:
 * - Debounced auto-save (saves 30s after the last change)
 * - Dirty state detection (unsaved changes warning)
 * - Draft restoration on remount
 * - beforeunload warning when dirty
 *
 * The draft key is derived from a stable form ID so drafts survive remounts
 * but are isolated per form instance.
 *
 * Implements US-133c.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/** Return value of useFormDraft. */
export interface UseFormDraftResult<T extends Record<string, unknown>> {
  /** The current form values (may be restored from draft). */
  values: T;
  /** Update a single field's value. */
  setFieldValue: (key: keyof T, value: unknown) => void;
  /** Replace all values (used after restore or reset). */
  setValues: (values: T) => void;
  /** True when current values differ from the last-saved snapshot. */
  isDirty: boolean;
  /** True when a draft was found and restored on mount. */
  draftRestored: boolean;
  /** Clear the persisted draft (called after successful submit). */
  clearDraft: () => void;
  /** Mark the current values as the clean baseline (called after save). */
  markClean: () => void;
}

/** Auto-save interval in milliseconds (30 seconds). */
const AUTO_SAVE_INTERVAL_MS = 30_000;

/** Prefix for all draft keys in localStorage. */
const DRAFT_KEY_PREFIX = 'vastu:form-draft:';

/** Shape stored in localStorage. */
interface StoredDraft<T> {
  values: T;
  savedAt: string;
}

function buildKey(formId: string): string {
  return `${DRAFT_KEY_PREFIX}${formId}`;
}

function readDraft<T>(formId: string): T | null {
  try {
    const raw = localStorage.getItem(buildKey(formId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    return parsed.values ?? null;
  } catch {
    return null;
  }
}

function writeDraft<T>(formId: string, values: T): void {
  try {
    const stored: StoredDraft<T> = { values, savedAt: new Date().toISOString() };
    localStorage.setItem(buildKey(formId), JSON.stringify(stored));
  } catch {
    // Silently ignore quota errors — draft saving is best-effort.
  }
}

function removeDraft(formId: string): void {
  try {
    localStorage.removeItem(buildKey(formId));
  } catch {
    // Ignore
  }
}

/**
 * Shallow equality check for detecting dirty state.
 * Compares serialized JSON — sufficient for flat form value objects.
 */
function isEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Hook for managing form draft persistence and dirty state.
 *
 * @param formId  - Stable identifier for this form (e.g. 'create-order', 'edit-contact-{id}').
 * @param initial - Initial form values used when no draft exists.
 */
export function useFormDraft<T extends Record<string, unknown>>(
  formId: string,
  initial: T,
): UseFormDraftResult<T> {
  // Attempt to restore a previously saved draft.
  const savedDraft = readDraft<T>(formId);
  const [values, setValuesState] = useState<T>(savedDraft ?? initial);
  const [draftRestored] = useState<boolean>(savedDraft !== null);

  // The "clean" snapshot — stored in state so changes to it trigger re-renders.
  // This is necessary for isDirty to update correctly after markClean() is called.
  const [cleanSnapshot, setCleanSnapshot] = useState<T>(initial);

  // Ref kept in sync with cleanSnapshot for use in unmount/beforeunload effects.
  // State is not reliably readable inside cleanup functions — the ref is always current.
  const cleanRef = useRef<T>(initial);

  // Ref always holding the latest values — used in cleanup effects to avoid stale closures.
  // Without this, the unmount effect captures the values from the first render only,
  // which means any changes made after mount would not be flushed on unmount.
  const valuesRef = useRef<T>(values);

  // Keep valuesRef current on every render.
  valuesRef.current = values;

  const isDirty = !isEqual(values, cleanSnapshot);

  // Auto-save timer ref.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule a save 30s after the last change.
  const scheduleAutoSave = useCallback(
    (latestValues: T) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        writeDraft(formId, latestValues);
      }, AUTO_SAVE_INTERVAL_MS);
    },
    [formId],
  );

  // Update a single field.
  const setFieldValue = useCallback(
    (key: keyof T, value: unknown) => {
      setValuesState((prev) => {
        const next = { ...prev, [key]: value } as T;
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  // Replace all values at once.
  const setValues = useCallback(
    (newValues: T) => {
      setValuesState(newValues);
      scheduleAutoSave(newValues);
    },
    [scheduleAutoSave],
  );

  const clearDraft = useCallback(() => {
    removeDraft(formId);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [formId]);

  const markClean = useCallback(() => {
    // Update both the ref (for unmount cleanup) and the state (to trigger re-render).
    cleanRef.current = values;
    setCleanSnapshot(values);
    clearDraft();
  }, [values, clearDraft]);

  // Warn before unload when dirty.
  // Reading from refs (not state) means this effect is registered once and stays correct
  // for the lifetime of the component — no need to re-register on every values change.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isEqual(valuesRef.current, cleanRef.current)) {
        e.preventDefault();
        // returnValue is required for older browsers.
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable; no re-registration needed
  }, []);

  // Flush any pending auto-save on unmount.
  // We use valuesRef (not state) so the cleanup always sees the latest values,
  // not a stale closure captured when the effect last ran.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        // Immediately persist if there are unsaved changes.
        const currentValues = valuesRef.current;
        if (!isEqual(currentValues, cleanRef.current)) {
          writeDraft(formId, currentValues);
        }
      }
    };
    // formId is stable for the lifetime of the hook instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  return {
    values,
    setFieldValue,
    setValues,
    isDirty,
    draftRestored,
    clearDraft,
    markClean,
  };
}

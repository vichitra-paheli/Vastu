'use client';

/**
 * builderStore — manages the Builder mode panel state for a given page.
 *
 * Holds a draft TemplateConfig that the user edits in the builder panel.
 * Changes are committed to the API only when the user clicks "Save config".
 * "Discard" reverts the draft to the last saved config.
 *
 * The active section determines which section of the builder panel is shown
 * in the right column.
 *
 * Implements US-136 (AC-1 through AC-14).
 */

import { create } from 'zustand';
import type { TemplateConfig } from '../templates/types';

/** All available builder sections (left-column navigation). */
export type BuilderSection =
  | 'dataSource'
  | 'fieldConfig'
  | 'sectionsLayout'
  | 'defaultView'
  | 'permissions'
  | 'hooks'
  | 'pageMetadata'
  | 'ephemeral';

/** Saved state keyed by pageId — allows switching pages without losing draft. */
interface PageBuilderState {
  /** The draft config being edited. Starts from the last saved config. */
  draftConfig: TemplateConfig | null;
  /** The original config at the time builder mode was entered. Used for discard. */
  originalConfig: TemplateConfig | null;
  /** Whether the draft has unsaved changes vs the original. */
  isDirty: boolean;
}

interface BuilderStoreState {
  /** Which section is currently shown in the right column. */
  activeSection: BuilderSection;

  /** Per-page builder state. Keyed by pageId. */
  pageState: Record<string, PageBuilderState>;

  // ---- Selectors ----

  /** Get the draft config for a given page. */
  getDraftConfig: (pageId: string) => TemplateConfig | null;
  /** True when the page has unsaved builder changes. */
  isPageDirty: (pageId: string) => boolean;

  // ---- Actions ----

  /** Set the active builder section (left-column navigation). */
  setActiveSection: (section: BuilderSection) => void;

  /**
   * Initialize (or reinitialize) the builder state for a page.
   * Called when the user switches to Builder mode.
   * Takes a snapshot of the current saved config as the baseline for discard.
   */
  initPage: (pageId: string, savedConfig: TemplateConfig) => void;

  /**
   * Update a portion of the draft config for a page.
   * Merges the partial config into the existing draft.
   */
  updateDraftConfig: (pageId: string, partial: Partial<TemplateConfig>) => void;

  /**
   * Replace the draft config entirely.
   */
  setDraftConfig: (pageId: string, config: TemplateConfig) => void;

  /**
   * Discard all draft changes — revert to the snapshot taken at initPage.
   */
  discardChanges: (pageId: string) => void;

  /**
   * Called after a successful save. Clears the dirty flag and updates the
   * original config to the newly saved config.
   */
  markSaved: (pageId: string) => void;
}

const DEFAULT_PAGE_STATE: PageBuilderState = {
  draftConfig: null,
  originalConfig: null,
  isDirty: false,
};

export const useBuilderStore = create<BuilderStoreState>()((set, get) => ({
  activeSection: 'dataSource',
  pageState: {},

  getDraftConfig: (pageId) => {
    return get().pageState[pageId]?.draftConfig ?? null;
  },

  isPageDirty: (pageId) => {
    return get().pageState[pageId]?.isDirty ?? false;
  },

  setActiveSection: (section) => {
    set({ activeSection: section });
  },

  initPage: (pageId, savedConfig) => {
    set((state) => {
      const existing = state.pageState[pageId];
      // If already initialized and dirty, preserve the draft
      if (existing?.isDirty) {
        return state;
      }
      return {
        pageState: {
          ...state.pageState,
          [pageId]: {
            draftConfig: { ...savedConfig },
            originalConfig: { ...savedConfig },
            isDirty: false,
          },
        },
      };
    });
  },

  updateDraftConfig: (pageId, partial) => {
    set((state) => {
      const existing = state.pageState[pageId] ?? DEFAULT_PAGE_STATE;
      const newDraft = existing.draftConfig
        ? { ...existing.draftConfig, ...partial }
        : (partial as TemplateConfig);
      return {
        pageState: {
          ...state.pageState,
          [pageId]: {
            ...existing,
            draftConfig: newDraft,
            isDirty: true,
          },
        },
      };
    });
  },

  setDraftConfig: (pageId, config) => {
    set((state) => {
      const existing = state.pageState[pageId] ?? DEFAULT_PAGE_STATE;
      return {
        pageState: {
          ...state.pageState,
          [pageId]: {
            ...existing,
            draftConfig: config,
            isDirty: true,
          },
        },
      };
    });
  },

  discardChanges: (pageId) => {
    set((state) => {
      const existing = state.pageState[pageId];
      if (!existing) return state;
      return {
        pageState: {
          ...state.pageState,
          [pageId]: {
            ...existing,
            draftConfig: existing.originalConfig ? { ...existing.originalConfig } : null,
            isDirty: false,
          },
        },
      };
    });
  },

  markSaved: (pageId) => {
    set((state) => {
      const existing = state.pageState[pageId];
      if (!existing) return state;
      return {
        pageState: {
          ...state.pageState,
          [pageId]: {
            ...existing,
            originalConfig: existing.draftConfig ? { ...existing.draftConfig } : null,
            isDirty: false,
          },
        },
      };
    });
  },
}));

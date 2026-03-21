'use client';

/**
 * ViewToolbar — per-panel toolbar for view management.
 *
 * Rendered between the Dockview tab bar and the panel content in every panel.
 *
 * Layout:
 *   [ ViewSelector ↓ ] [ View name (inline editable) ] [ ● Modified  Reset ] | [ Save ]
 *
 * State:
 * - isModified (from viewStore): shows goldenrod dot + "Modified" + "Reset" link
 * - Save button: primary blue when modified, dimmed when clean
 * - View name: editable inline; commits on blur/Enter
 *
 * Keyboard:
 * - ⌘S saves the view (registered at toolbar level — global shortcut wired in US-117)
 *
 * Implements US-111 (AC-1, AC-2, AC-3, AC-4, AC-5, AC-9).
 *
 * Note: Share (AC-6), Export (AC-7), and overflow (AC-8) are scaffolded as
 * disabled button slots — implementation comes with the relevant data features.
 */

import React from 'react';
import { Button, ActionIcon, Tooltip } from '@mantine/core';
import { IconShare, IconDots } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { useViewStore } from '../../stores/viewStore';
import { ViewSelector } from './ViewSelector';
import type { View } from '@vastu/shared/types';
import classes from './ViewToolbar.module.css';

export interface ViewToolbarProps {
  /**
   * Page ID — required by saveView to associate the view with a page.
   */
  pageId: string;
  /**
   * Available views to display in the selector.
   * The consumer provides these (typically via TanStack Query).
   */
  views?: View[];
  /**
   * Current user's ID — used to split MY VIEWS / SHARED WITH ME.
   */
  currentUserId?: string;
  /**
   * Called when the user picks a different view from the selector.
   * The toolbar will call `loadView(id)` automatically; this callback
   * allows the parent to react (e.g., re-run queries).
   */
  onViewChange?: (id: string) => void;
  /**
   * Called when the user clicks "+ Create new view".
   * Parent is responsible for collecting a name and calling `saveView`.
   */
  onCreateView?: () => void;
  /**
   * Called when user renames a view in the selector dropdown.
   */
  onRenameView?: (id: string, name: string) => void;
  /**
   * Called when user deletes a view in the selector dropdown.
   */
  onDeleteView?: (id: string) => void;
}

/**
 * Default view name when no view is loaded.
 * This is what appears in the toolbar before the user saves a named view.
 */
const DEFAULT_VIEW_NAME = 'Default view';

export function ViewToolbar({
  pageId,
  views = [],
  currentUserId,
  onViewChange,
  onCreateView,
  onRenameView,
  onDeleteView,
}: ViewToolbarProps) {
  const { currentViewId, isModified, saveView, loadView, resetView } = useViewStore();

  // Derive the current view name from the views list (or fall back to default).
  const currentView = views.find((v) => v.id === currentViewId) ?? null;
  const [localName, setLocalName] = React.useState<string>(
    currentView?.name ?? DEFAULT_VIEW_NAME,
  );
  // Track whether the name input is focused (to gate commit logic).
  const [isEditingName, setIsEditingName] = React.useState(false);

  // Keep localName in sync when the active view changes from outside.
  React.useEffect(() => {
    if (!isEditingName) {
      setLocalName(currentView?.name ?? DEFAULT_VIEW_NAME);
    }
  }, [currentView?.name, isEditingName]);

  const modified = isModified();

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  async function handleSave() {
    if (!modified) return;
    try {
      await saveView(localName, pageId);
    } catch {
      // Error handling is intentionally minimal at toolbar level.
      // Consumers can wrap in an error boundary or show a global toast.
    }
  }

  // ------------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------------
  function handleReset() {
    resetView();
  }

  // ------------------------------------------------------------------
  // Inline name editing
  // ------------------------------------------------------------------
  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      // Revert to saved name on Escape.
      setLocalName(currentView?.name ?? DEFAULT_VIEW_NAME);
      setIsEditingName(false);
      e.currentTarget.blur();
    }
  }

  function handleNameBlur() {
    setIsEditingName(false);
    const trimmed = localName.trim();
    if (!trimmed) {
      setLocalName(currentView?.name ?? DEFAULT_VIEW_NAME);
    }
  }

  // ------------------------------------------------------------------
  // ViewSelector handlers
  // ------------------------------------------------------------------
  async function handleViewSelect(id: string) {
    try {
      await loadView(id);
      onViewChange?.(id);
    } catch {
      // Silent — parent may surface an error toast.
    }
  }

  function handleCreateView() {
    onCreateView?.();
  }

  function handleRenameView(id: string, name: string) {
    onRenameView?.(id, name);
  }

  function handleDeleteView(id: string) {
    onDeleteView?.(id);
  }

  // ------------------------------------------------------------------
  // Keyboard shortcut: ⌘S saves the view
  // ------------------------------------------------------------------
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        // Only intercept when a panel is in focus (not a global form).
        const active = document.activeElement;
        const isInput =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement;
        if (!isInput) {
          e.preventDefault();
          void handleSave();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modified, localName, pageId]);

  return (
    <div
      className={classes.toolbar}
      role="toolbar"
      aria-label={t('view.toolbar.ariaLabel')}
    >
      {/* Left section */}
      <div className={classes.left}>
        {/* View selector dropdown trigger */}
        <ViewSelector
          currentViewId={currentViewId}
          currentUserId={currentUserId}
          views={views}
          onSelect={handleViewSelect}
          onCreate={handleCreateView}
          onRename={handleRenameView}
          onDelete={handleDeleteView}
        />

        {/* Inline editable view name */}
        <div className={classes.viewNameWrapper}>
          <input
            type="text"
            className={classes.viewNameInput}
            value={localName}
            aria-label={t('view.toolbar.viewNameAriaLabel')}
            onChange={(e) => setLocalName(e.currentTarget.value)}
            onFocus={() => setIsEditingName(true)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            // Prevent truncation overflow from the input itself — TruncatedText
            // handles the read-only presentation; input handles editing.
          />
        </div>

        {/* Modified indicator */}
        {modified && (
          <div className={classes.modifiedIndicator} data-testid="modified-indicator">
            <span className={classes.modifiedDot} aria-hidden="true" />
            <span className={classes.modifiedLabel}>{t('view.toolbar.modified')}</span>
            <button
              type="button"
              className={classes.resetLink}
              onClick={handleReset}
              aria-label={t('view.toolbar.resetAriaLabel')}
            >
              {t('view.toolbar.reset')}
            </button>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className={classes.separator} aria-hidden="true" />

      {/* Right section */}
      <div className={classes.right}>
        {/* Save button */}
        <Button
          size="xs"
          className={modified ? classes.saveButtonModified : classes.saveButtonClean}
          onClick={handleSave}
          disabled={!modified}
          aria-label={t('view.toolbar.saveAriaLabel')}
          aria-disabled={!modified}
          data-testid="save-button"
        >
          {t('view.toolbar.save')}
        </Button>

        {/* Share — placeholder (AC-6, implemented with data features) */}
        <Tooltip label={t('view.toolbar.share')}>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label={t('view.toolbar.shareAriaLabel')}
            disabled
            data-testid="share-button"
          >
            <IconShare size={14} />
          </ActionIcon>
        </Tooltip>

        {/* Overflow — placeholder (AC-8, implemented with data features) */}
        <Tooltip label={t('view.toolbar.more')}>
          <ActionIcon
            size="sm"
            variant="subtle"
            aria-label={t('view.toolbar.moreAriaLabel')}
            disabled
            data-testid="overflow-button"
          >
            <IconDots size={14} />
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
}

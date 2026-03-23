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
import { Button, ActionIcon, Tooltip, Menu } from '@mantine/core';
import { IconShare, IconDots, IconPin } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { useViewStore } from '../../stores/viewStore';
import { ViewSelector } from './ViewSelector';
import { PinToDashboardDialog } from '../../templates/Dashboard/PinToDashboardDialog';
import type { View } from '@vastu/shared/types';
import type { PinConfig } from '../../templates/Dashboard/PinToDashboardDialog';
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
  /**
   * Available dashboards for "Pin to dashboard".
   * If not provided, the dialog will offer the default "Main dashboard" option.
   */
  availableDashboards?: Array<{ id: string; name: string }>;
  /**
   * Called when the user confirms pinning the current view to a dashboard.
   */
  onPinToDashboard?: (config: PinConfig) => void;
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
  availableDashboards,
  onPinToDashboard,
}: ViewToolbarProps) {
  const { currentViewId, isModified, saveView, loadView, resetView, newView } = useViewStore();
  // pageId is fully resolved by WorkspaceShell (activePanelId ?? prop fallback).
  // ViewToolbar uses it directly — no secondary panelStore lookup here.
  const resolvedPageId = pageId;

  const [pinDialogOpen, setPinDialogOpen] = React.useState(false);

  function handlePin(config: PinConfig) {
    onPinToDashboard?.(config);
  }

  // Ref to the inline name input — used to allow Cmd+S from within it.
  const nameInputRef = React.useRef<HTMLInputElement>(null);

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
      await saveView(localName, resolvedPageId);
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
    // Reset to blank defaults — clears currentViewId and savedState so
    // the toolbar shows "Default view" and the save button treats it as new.
    // No confirmation prompt: "New View when current view has unsaved changes: clear without prompting" (AC-5).
    newView();
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
        // Always prevent the browser's native "Save page" dialog for Cmd+S.
        e.preventDefault();
        // Allow Cmd+S from the toolbar's own name input; block from all other
        // input elements (e.g., global search, form fields in other panels).
        const active = document.activeElement;
        const isOtherInput =
          (active instanceof HTMLInputElement && active !== nameInputRef.current) ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement;
        if (!isOtherInput) {
          void handleSave();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modified, localName, resolvedPageId]);

  return (
    <>
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
            ref={nameInputRef}
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

        {/* Modified indicator — always present; dot and label hidden when clean.
            Reset button is disabled (not hidden) when view is clean (AC-6). */}
        <div
          className={classes.modifiedIndicator}
          data-testid={modified ? 'modified-indicator' : undefined}
          aria-hidden={!modified}
        >
          {modified && (
            <>
              <span className={classes.modifiedDot} aria-hidden="true" />
              <span className={classes.modifiedLabel}>{t('view.toolbar.modified')}</span>
            </>
          )}
          <button
            type="button"
            className={modified ? classes.resetLink : classes.resetLinkDisabled}
            onClick={modified ? handleReset : undefined}
            disabled={!modified}
            aria-label={t('view.toolbar.resetAriaLabel')}
            aria-disabled={!modified}
            data-testid="reset-button"
          >
            {t('view.toolbar.reset')}
          </button>
        </div>
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

        {/* Overflow menu (AC-8) */}
        <Menu position="bottom-end" withArrow shadow="md">
          <Menu.Target>
            <Tooltip label={t('view.toolbar.more')}>
              <ActionIcon
                size="sm"
                variant="subtle"
                aria-label={t('view.toolbar.moreAriaLabel')}
                data-testid="overflow-button"
              >
                <IconDots size={14} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconPin size={14} />}
              onClick={() => setPinDialogOpen(true)}
              data-testid="pin-to-dashboard-menu-item"
            >
              {t('view.toolbar.pinToDashboard')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>

    {/* Pin to dashboard dialog */}
    <PinToDashboardDialog
      opened={pinDialogOpen}
      onClose={() => setPinDialogOpen(false)}
      viewName={localName}
      dashboards={availableDashboards}
      onPin={handlePin}
    />
    </>
  );
}

'use client';

/**
 * ViewSelector — dropdown popover listing available views.
 *
 * Shows two sections:
 *   - MY VIEWS: views owned by the current user
 *   - SHARED WITH ME: views shared with the organization
 *
 * Each entry has: color dot · view name (TruncatedText) · ⋯ menu (rename, delete)
 * Active view is highlighted.
 *
 * "+" Create new view action at the bottom.
 *
 * Implements US-111 AC-2, AC-3.
 */

import React from 'react';
import {
  Popover,
  TextInput,
  Text,
  Stack,
  UnstyledButton,
  Menu,
  ActionIcon,
  Divider,
  Button,
} from '@mantine/core';
import { IconChevronDown, IconDots, IconPlus } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { TruncatedText } from '../TruncatedText';
import { ConfirmDialog } from '../ConfirmDialog';
import type { View } from '@vastu/shared/types';
import classes from './ViewSelector.module.css';

export interface ViewSelectorProps {
  /** Currently active view ID (null for unsaved). */
  currentViewId: string | null;
  /** Current user ID, used to split MY VIEWS vs SHARED WITH ME. */
  currentUserId?: string;
  /** All views accessible to the user. */
  views: View[];
  /** Called when user selects a view to load. */
  onSelect: (id: string) => void;
  /** Called when user clicks "+ Create new view". */
  onCreate: () => void;
  /** Called when user renames a view. */
  onRename: (id: string, name: string) => void;
  /** Called when user deletes a view. */
  onDelete: (id: string) => void;
}

export function ViewSelector({
  currentViewId,
  currentUserId,
  views,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: ViewSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  /** ID of the view pending deletion — drives the confirmation dialog. */
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const deletingView = views.find((v) => v.id === deletingId) ?? null;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return views;
    return views.filter((v) => v.name.toLowerCase().includes(q));
  }, [views, search]);

  const myViews = filtered.filter((v) => v.createdBy === currentUserId);
  const sharedViews = filtered.filter((v) => v.isShared && v.createdBy !== currentUserId);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
    setSearch('');
  }

  function handleRenameCommit(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  }

  function handleRenameCancel() {
    setRenamingId(null);
    setRenameValue('');
  }

  function startRename(view: View) {
    setRenamingId(view.id);
    setRenameValue(view.name);
  }

  const activeView = views.find((v) => v.id === currentViewId);

  function handleDeleteRequest(id: string) {
    setDeletingId(id);
  }

  function handleDeleteConfirm() {
    if (deletingId) {
      onDelete(deletingId);
    }
    setDeletingId(null);
  }

  function handleDeleteCancel() {
    setDeletingId(null);
  }

  return (
    <>
    <Popover
      opened={open}
      onChange={setOpen}
      width={260}
      position="bottom-start"
      shadow="md"
      withinPortal
    >
      <Popover.Target>
        <UnstyledButton
          className={classes.trigger}
          onClick={() => setOpen((o) => !o)}
          aria-label={t('view.selector.ariaLabel')}
          aria-expanded={open}
        >
          {activeView?.colorDot && (
            <span
              className={classes.colorDot}
              style={{ backgroundColor: activeView.colorDot }}
              aria-hidden="true"
            />
          )}
          <IconChevronDown size={12} className={classes.chevron} aria-hidden="true" />
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown className={classes.dropdown}>
        <Stack gap={4}>
          {/* Search input */}
          <TextInput
            placeholder={t('view.selector.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="xs"
            className={classes.searchInput}
            aria-label={t('view.selector.searchAriaLabel')}
            autoFocus
          />

          {/* MY VIEWS section */}
          {myViews.length > 0 && (
            <>
              <Text
                size="xs"
                fw={500}
                c="var(--v-text-tertiary)"
                className={classes.sectionLabel}
              >
                {t('view.selector.myViews')}
              </Text>
              {myViews.map((view) => (
                <ViewEntry
                  key={view.id}
                  view={view}
                  isActive={view.id === currentViewId}
                  isRenaming={renamingId === view.id}
                  renameValue={renameValue}
                  onSelect={handleSelect}
                  onStartRename={startRename}
                  onRenameValueChange={setRenameValue}
                  onRenameCommit={handleRenameCommit}
                  onRenameCancel={handleRenameCancel}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </>
          )}

          {/* SHARED WITH ME section */}
          {sharedViews.length > 0 && (
            <>
              {myViews.length > 0 && <Divider className={classes.divider} />}
              <Text
                size="xs"
                fw={500}
                c="var(--v-text-tertiary)"
                className={classes.sectionLabel}
              >
                {t('view.selector.sharedWithMe')}
              </Text>
              {sharedViews.map((view) => (
                <ViewEntry
                  key={view.id}
                  view={view}
                  isActive={view.id === currentViewId}
                  isRenaming={renamingId === view.id}
                  renameValue={renameValue}
                  onSelect={handleSelect}
                  onStartRename={startRename}
                  onRenameValueChange={setRenameValue}
                  onRenameCommit={handleRenameCommit}
                  onRenameCancel={handleRenameCancel}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <Text size="sm" c="var(--v-text-tertiary)" className={classes.emptyLabel}>
              {t('view.selector.noResults')}
            </Text>
          )}

          <Divider className={classes.divider} />

          {/* Create new view */}
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconPlus size={12} />}
            onClick={() => {
              onCreate();
              setOpen(false);
            }}
            className={classes.createButton}
          >
            {t('view.selector.createNew')}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>

    {/* Delete confirmation dialog — shown when user clicks Delete in the ⋯ menu (AC-7). */}
    <ConfirmDialog
      opened={deletingId !== null}
      title={t('view.selector.deleteTitle')}
      description={
        deletingView
          ? t('view.selector.deleteDescription', { name: deletingView.name })
          : t('view.selector.deleteDescriptionGeneric')
      }
      confirmLabel={t('view.selector.deleteConfirmButton')}
      variant="delete"
      onConfirm={handleDeleteConfirm}
      onCancel={handleDeleteCancel}
    />
    </>
  );
}

/* ================================================================
 * Internal: single view entry row
 * ================================================================ */

interface ViewEntryProps {
  view: View;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelect: (id: string) => void;
  onStartRename: (view: View) => void;
  onRenameValueChange: (value: string) => void;
  onRenameCommit: (id: string) => void;
  onRenameCancel: () => void;
  onDelete: (id: string) => void;
}

function ViewEntry({
  view,
  isActive,
  isRenaming,
  renameValue,
  onSelect,
  onStartRename,
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onDelete,
}: ViewEntryProps) {
  return (
    <div
      className={`${classes.entry} ${isActive ? classes.entryActive : ''}`}
      data-active={isActive}
    >
      {/* Color dot */}
      <span
        className={classes.colorDot}
        style={{ backgroundColor: view.colorDot ?? 'var(--v-text-tertiary)' }}
        aria-hidden="true"
      />

      {/* Name — either inline input or truncated label */}
      {isRenaming ? (
        <TextInput
          value={renameValue}
          onChange={(e) => onRenameValueChange(e.currentTarget.value)}
          onBlur={() => onRenameCommit(view.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit(view.id);
            if (e.key === 'Escape') onRenameCancel();
          }}
          size="xs"
          className={classes.renameInput}
          aria-label={t('view.selector.renameAriaLabel')}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <UnstyledButton className={classes.entryName} onClick={() => onSelect(view.id)}>
          <TruncatedText maxWidth={160}>{view.name}</TruncatedText>
        </UnstyledButton>
      )}

      {/* ⋯ context menu */}
      {!isRenaming && (
        <Menu position="right-start" shadow="sm" withinPortal>
          <Menu.Target>
            <ActionIcon
              size="xs"
              variant="subtle"
              className={classes.entryMenu}
              aria-label={t('view.selector.entryMenuAriaLabel')}
              onClick={(e) => e.stopPropagation()}
            >
              <IconDots size={12} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => onStartRename(view)}>
              {t('view.selector.rename')}
            </Menu.Item>
            <Menu.Item
              color="red"
              onClick={() => {
                onDelete(view.id);
              }}
            >
              {t('view.selector.delete')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </div>
  );
}

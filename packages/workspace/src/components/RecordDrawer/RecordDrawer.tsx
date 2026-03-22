'use client';

/**
 * RecordDrawer — slide-in record detail panel from the right edge.
 *
 * Opens when a table row is clicked (or programmatically via openDrawer).
 * Contains tabs: Details, Items, History, Notes, Permissions.
 *
 * Architecture:
 * - Reads open state and record ID from drawerStore.
 * - Tab content is mounted lazily when the tab is first activated.
 * - Loading state: skeleton → content → error.
 * - Click on overlay closes the drawer.
 * - Focus is trapped inside the drawer when open.
 * - role="dialog", aria-modal, aria-label for accessibility.
 *
 * Implements US-128a.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Skeleton } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useDrawerStore } from '../../stores/drawerStore';
import type { DrawerTab } from '../../stores/drawerStore';
import { t } from '../../lib/i18n';
import { RecordDrawerHeader } from './RecordDrawerHeader';
import { RecordDrawerFooter } from './RecordDrawerFooter';
import { VastuTabs } from '../VastuTabs/VastuTabs';
import { DetailsTab } from './tabs/DetailsTab';
import { ItemsTab } from './tabs/ItemsTab';
import { HistoryTab } from './tabs/HistoryTab';
import { NotesTab } from './tabs/NotesTab';
import { PermissionsTab } from './tabs/PermissionsTab';
import { useAbility } from '../../providers/AbilityContext';
import classes from './RecordDrawer.module.css';

/** Minimal record data returned from the API. */
export interface RecordDetail {
  id: string;
  title: string;
  type: string;
  fields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface RecordDrawerProps {
  /**
   * Optional fetch function. When provided, the drawer calls it with the
   * current recordId whenever the drawer opens or the record changes.
   * Should resolve with a RecordDetail or reject on error.
   *
   * When omitted the drawer renders placeholder/mock content (useful for
   * stories and tests).
   */
  fetchRecord?: (recordId: string) => Promise<RecordDetail>;
}

const TAB_DEFS = [
  { key: 'details' as DrawerTab, label: t('drawer.tab.details') },
  { key: 'items' as DrawerTab, label: t('drawer.tab.items') },
  { key: 'history' as DrawerTab, label: t('drawer.tab.history') },
  { key: 'notes' as DrawerTab, label: t('drawer.tab.notes') },
  { key: 'permissions' as DrawerTab, label: t('drawer.tab.permissions') },
];

export function RecordDrawer({ fetchRecord }: RecordDrawerProps) {
  const isOpen = useDrawerStore((s) => s.isOpen);
  const recordId = useDrawerStore((s) => s.recordId);
  const activeTab = useDrawerStore((s) => s.activeTab);
  const setActiveTab = useDrawerStore((s) => s.setActiveTab);
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  const ability = useAbility();

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Incrementing this triggers the fetch useEffect to re-run (retry logic).
  // Using a counter rather than calling fetchRecord directly ensures the
  // cancellation guard in the effect is always active.
  const [retryCount, setRetryCount] = useState(0);

  // Focus management — remember what had focus before drawer opened
  const previousFocusRef = useRef<Element | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Track "closing" state to play exit animation before unmounting.
  // We listen for the animationend event on the drawer element so that the
  // teardown timing is always driven by the actual CSS animation, not a
  // hardcoded timeout that would drift if the CSS duration changes.
  // If no animation is running (JSDOM, prefers-reduced-motion, etc.) we
  // close synchronously so tests and reduced-motion users are not blocked.
  const handleClose = useCallback(() => {
    const finish = () => {
      setClosing(false);
      closeDrawer();
      setRecord(null);
      setError(null);
      setDirty(false);
    };

    const el = drawerRef.current;
    if (!el) {
      finish();
      return;
    }

    // Check whether a CSS animation is actually running on the closing element.
    // getAnimations() is available in modern browsers and JSDOM 16+.
    setClosing(true);

    // Re-read the element after state update (next microtask)
    queueMicrotask(() => {
      const runningAnimations =
        typeof el.getAnimations === 'function' ? el.getAnimations() : [];

      if (runningAnimations.length === 0) {
        // No animation running (test env / reduced-motion / animation: none).
        finish();
      } else {
        el.addEventListener('animationend', finish, { once: true });
      }
    });
  }, [closeDrawer]);

  // Fetch record data whenever recordId changes
  useEffect(() => {
    if (!recordId || !isOpen) return;

    // Capture the narrowed non-null value so the async closure is properly typed.
    const id = recordId;
    let cancelled = false;

    async function load() {
      // All state updates happen inside the async function, not synchronously
      // in the effect body, so the react-hooks/set-state-in-effect rule is satisfied.
      setLoading(true);
      setError(null);

      try {
        // When no fetchRecord is provided, resolve with a placeholder (dev/test)
        const data: RecordDetail = fetchRecord
          ? await fetchRecord(id)
          : {
              id,
              title: `Record ${id}`,
              type: 'record',
              fields: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
        if (!cancelled) setRecord(data);
      } catch {
        if (!cancelled) setError(t('drawer.error.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [recordId, isOpen, fetchRecord, retryCount]);

  // Save previous focus and move focus into drawer when it opens
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      // Focus the drawer panel itself; the first focusable element can be
      // found via autoFocus on the close button in the header.
      setTimeout(() => {
        drawerRef.current?.focus();
      }, 50);
    } else {
      // Restore focus when closed
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // Trap focus inside the drawer
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusable = drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [handleClose],
  );

  // CASL gate: hide Permissions tab for non-admins
  const canViewPermissions = ability.can('manage', 'all');
  const visibleTabs = TAB_DEFS.filter(
    (tab) => tab.key !== 'permissions' || canViewPermissions,
  );

  if (!isOpen && !closing) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`${classes.overlay}${closing ? ` ${classes.overlayClosing}` : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('drawer.ariaLabel')}
        className={`${classes.drawer}${closing ? ` ${classes.drawerClosing}` : ''}`}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className={classes.header}>
          <RecordDrawerHeader
            record={record}
            loading={loading}
            onClose={handleClose}
          />
        </div>

        {/* Tabs */}
        <div className={classes.tabsContainer}>
          <VastuTabs
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as DrawerTab)}
          />
        </div>

        {/* Tab content */}
        {loading ? (
          <DrawerSkeleton />
        ) : error ? (
          <DrawerError
            message={error}
            onRetry={() => setRetryCount((n) => n + 1)}
          />
        ) : (
          <div className={classes.content}>
            {activeTab === 'details' && (
              <DetailsTab record={record} onDirtyChange={setDirty} />
            )}
            {activeTab === 'items' && <ItemsTab recordId={recordId ?? ''} />}
            {activeTab === 'history' && <HistoryTab recordId={recordId ?? ''} />}
            {activeTab === 'notes' && <NotesTab recordId={recordId ?? ''} />}
            {activeTab === 'permissions' && canViewPermissions && (
              <PermissionsTab recordId={recordId ?? ''} />
            )}
          </div>
        )}

        {/* Footer */}
        <div className={classes.footer}>
          <RecordDrawerFooter
            record={record}
            dirty={dirty}
            onSave={() => setDirty(false)}
            onCancel={() => setDirty(false)}
          />
        </div>
      </div>
    </>
  );
}

// ── Internal sub-components ────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className={classes.skeletonContent} aria-label={t('drawer.loading.ariaLabel')}>
      <Skeleton height={20} width="60%" />
      <Skeleton height={14} width="40%" />
      <Skeleton height={14} />
      <Skeleton height={14} />
      <Skeleton height={14} width="80%" />
      <Skeleton height={14} />
      <Skeleton height={14} width="70%" />
      <Skeleton height={14} />
      <Skeleton height={14} width="90%" />
    </div>
  );
}

interface DrawerErrorProps {
  message: string;
  onRetry: () => void;
}

function DrawerError({ message, onRetry }: DrawerErrorProps) {
  return (
    <div className={classes.errorContent} role="alert">
      <IconAlertCircle size={32} aria-hidden="true" style={{ color: 'var(--v-status-error)' }} />
      <p className={classes.errorTitle}>{t('drawer.error.title')}</p>
      <p className={classes.errorMessage}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '6px 16px',
          borderRadius: 'var(--v-radius-md)',
          border: '1px solid var(--v-border-default)',
          background: 'var(--v-bg-secondary)',
          color: 'var(--v-text-primary)',
          fontSize: 'var(--v-text-sm)',
          cursor: 'pointer',
          fontFamily: 'var(--v-font-sans)',
          fontWeight: 'var(--v-font-regular)',
        }}
      >
        {t('drawer.error.retry')}
      </button>
    </div>
  );
}

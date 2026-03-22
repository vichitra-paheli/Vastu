'use client';

/**
 * MultiTabDetailTemplate — entity detail page with header band and RBAC-gated tabs.
 *
 * Registered as the 'multi-tab-detail' panel type.
 * Uses useTemplateConfig(pageId) to load config.
 *
 * Layout:
 *   EntityHeader (avatar, name, subtitle, status badge, action buttons)
 *   VastuTabs (RBAC-gated horizontal tab bar)
 *   Tab content area (OverviewTab and further tabs driven by config)
 *
 * Deep-linking: reads ?tab= from URL search params on mount and updates URL
 * whenever the active tab changes.
 *
 * Loading state: TemplateSkeleton with variant='multi-tab-detail'.
 * Error state: inline error with back navigation.
 *
 * Implements US-131.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { EntityHeader } from './EntityHeader';
import type { EntityAction, EntityHeaderProps } from './EntityHeader';
import { OverviewTab } from './tabs/OverviewTab';
import type { OverviewTabProps } from './tabs/OverviewTab';
import { VastuTabs } from '../../components/VastuTabs/VastuTabs';
import type { TabDefinition } from '../../components/VastuTabs/VastuTabs';
import { TemplateSkeleton } from '../TemplateSkeleton';
import { useTemplateConfig } from '../useTemplateConfig';
import { useAbility } from '../../providers/AbilityContext';
import { t } from '../../lib/i18n';
import classes from './MultiTabDetailTemplate.module.css';

// ── Panel type ID ─────────────────────────────────────────────────────────────

/** Panel type identifier registered in the panel registry. */
export const MULTI_TAB_DETAIL_PANEL_TYPE_ID = 'multi-tab-detail';

// ── Tab key constants ─────────────────────────────────────────────────────────

export type MultiTabDetailTab =
  | 'overview'
  | 'activity'
  | 'notes'
  | 'files'
  | 'permissions';

const DEFAULT_TAB: MultiTabDetailTab = 'overview';

// ── Entity data types ─────────────────────────────────────────────────────────

/** Minimal entity data to drive EntityHeader and the Overview tab. */
export interface EntityData {
  id: string;
  name: string;
  subtitle?: string;
  status?: string;
  avatarUrl?: string;
  initials?: string;
  icon?: React.ReactElement;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MultiTabDetailTemplateProps {
  /** The page ID — used to load/persist template config. */
  pageId: string;
  /**
   * Optional entity data to populate the header.
   * When omitted the header renders with placeholder values.
   */
  entity?: EntityData;
  /**
   * Action buttons shown in the entity header.
   * Caller is responsible for defining actions and their handlers.
   */
  actions?: EntityAction[];
  /**
   * Props forwarded to the OverviewTab.
   * Allows the caller to supply fields, sub-tables, and activity entries.
   */
  overviewProps?: Omit<OverviewTabProps, 'loading'>;
  /**
   * True while entity data (not config) is loading.
   * Drives per-tab skeleton while the entity row is in flight.
   */
  entityLoading?: boolean;
  /**
   * Non-null when the entity data failed to load.
   * Shows an inline error state with a retry option.
   */
  entityError?: string | null;
  /** Called when the user clicks the retry button in the error state. */
  onRetry?: () => void;
}

// ── URL tab helper ────────────────────────────────────────────────────────────

/** Read the ?tab= query param from the current URL (browser only). */
function getTabFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return new URL(window.location.href).searchParams.get('tab');
  } catch {
    return null;
  }
}

/** Update the ?tab= query param without a full navigation. */
function setTabInUrl(tab: string): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  } catch {
    // Silent — URL manipulation is best-effort
  }
}

// ── Tab definitions ───────────────────────────────────────────────────────────

/**
 * Build the ordered tab list.
 * The Permissions tab is included only when canManageAll is true (admin gate).
 */
function buildTabDefs(canManageAll: boolean): TabDefinition[] {
  const base: TabDefinition[] = [
    { key: 'overview', label: t('multiTabDetail.tab.overview') },
    { key: 'activity', label: t('multiTabDetail.tab.activity') },
    { key: 'notes', label: t('multiTabDetail.tab.notes') },
    { key: 'files', label: t('multiTabDetail.tab.files') },
  ];

  if (canManageAll) {
    base.push({ key: 'permissions', label: t('multiTabDetail.tab.permissions') });
  }

  return base;
}

// ── Placeholder tab content ───────────────────────────────────────────────────

function PlaceholderTab({ tabKey }: { tabKey: string }) {
  return (
    <div className={classes.content} style={{ padding: 'var(--v-space-6)' }}>
      <p
        style={{
          fontFamily: 'var(--v-font-sans)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-text-secondary)',
          fontWeight: 'var(--v-font-regular)',
          margin: 0,
        }}
      >
        {t('multiTabDetail.tab.placeholder', { tab: tabKey })}
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

interface EntityErrorStateProps {
  message: string;
  onRetry?: () => void;
}

function EntityErrorState({ message, onRetry }: EntityErrorStateProps) {
  return (
    <div className={classes.errorState} role="alert">
      <IconAlertCircle
        size={32}
        aria-hidden="true"
        style={{ color: 'var(--v-status-error)' }}
      />
      <p className={classes.errorTitle}>{t('multiTabDetail.error.title')}</p>
      <p className={classes.errorMessage}>{message}</p>
      {onRetry && (
        <button
          className={classes.errorButton}
          onClick={onRetry}
          aria-label={t('multiTabDetail.error.retry')}
        >
          {t('multiTabDetail.error.retry')}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MultiTabDetailTemplate({
  pageId,
  entity,
  actions = [],
  overviewProps = {},
  entityLoading = false,
  entityError = null,
  onRetry,
}: MultiTabDetailTemplateProps) {
  const ability = useAbility();
  const canManageAll = ability.can('manage', 'all');

  // Load template config (drives field visibility, section order, etc.)
  const { loading: configLoading } = useTemplateConfig(pageId);

  // ── Tab state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>(() => {
    return getTabFromUrl() ?? DEFAULT_TAB;
  });

  const tabDefs = useMemo(() => buildTabDefs(canManageAll), [canManageAll]);

  // Derive the resolved tab: if activeTab is no longer in tabDefs (e.g. RBAC
  // removes the Permissions tab), fall back to the default tab.
  // This is computed synchronously so there is no cascading setState call.
  const resolvedTab = tabDefs.some((td) => td.key === activeTab)
    ? activeTab
    : DEFAULT_TAB;

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
    setTabInUrl(key);
  }, []);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (configLoading) {
    return <TemplateSkeleton variant="multi-tab-detail" />;
  }

  // ── Build EntityHeader props ────────────────────────────────────────────────
  const headerProps: EntityHeaderProps = {
    name: entity?.name ?? t('multiTabDetail.entity.unnamed'),
    subtitle: entity?.subtitle,
    status: entity?.status,
    avatarUrl: entity?.avatarUrl,
    initials: entity?.initials,
    icon: entity?.icon,
    actions,
    loading: entityLoading,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={classes.root}
      aria-label={t('multiTabDetail.ariaLabel')}
      data-testid="multi-tab-detail-template"
    >
      {/* Entity header */}
      <EntityHeader {...headerProps} />

      {/* Tab bar */}
      <div className={classes.tabBar}>
        <VastuTabs
          tabs={tabDefs}
          activeTab={resolvedTab}
          onTabChange={handleTabChange}
          ariaLabel={t('multiTabDetail.tabs.ariaLabel')}
        />
      </div>

      {/* Tab content */}
      <div className={classes.content}>
        {entityError ? (
          <EntityErrorState message={entityError} onRetry={onRetry} />
        ) : resolvedTab === 'overview' ? (
          <OverviewTab {...overviewProps} loading={entityLoading} />
        ) : (
          <PlaceholderTab tabKey={resolvedTab} />
        )}
      </div>
    </div>
  );
}

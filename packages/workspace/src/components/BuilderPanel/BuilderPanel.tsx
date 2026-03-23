'use client';

/**
 * BuilderPanel — two-column admin config panel for a workspace page.
 *
 * Replaces the panel content when a user switches to Builder mode
 * (via ModeSwitch). Allows admins to configure a page's data source,
 * fields, sections, and permissions without writing code.
 *
 * Layout:
 *   - Warning header bar (amber tint) with Discard / Save config buttons
 *   - Two-column body:
 *       Left: section navigation (8 sections)
 *       Right: active section config form
 *
 * Saves to /api/workspace/pages/[id]/config via useTemplateConfig.
 * Config is JSON only — no code generation.
 *
 * Loading states:
 *   - Skeleton displayed while config is first loading (loading === true)
 *   - Error state shown when fetch fails (error !== null)
 *   - Content rendered once config is available
 *
 * Implements US-136 (AC-1 through AC-14).
 */

import React from 'react';
import {
  IconDatabase,
  IconColumns,
  IconLayoutRows,
  IconAdjustments,
  IconLock,
  IconCode,
  IconFileDescription,
  IconToggleRight,
  IconAlertCircle,
} from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import { useBuilderStore } from '../../stores/builderStore';
import type { BuilderSection } from '../../stores/builderStore';
import { useTemplateConfig } from '../../templates/useTemplateConfig';
import { BuilderWarningHeader } from './BuilderWarningHeader';
import { DataSourceSection } from './sections/DataSourceSection';
import { FieldConfigSection } from './sections/FieldConfigSection';
import { SectionsLayoutSection } from './sections/SectionsLayoutSection';
import { DefaultViewSection } from './sections/DefaultViewSection';
import { PermissionsSection } from './sections/PermissionsSection';
import { HooksSection } from './sections/HooksSection';
import { PageMetadataSection } from './sections/PageMetadataSection';
import { EphemeralToggleSection } from './sections/EphemeralToggleSection';
import classes from './BuilderPanel.module.css';

// ─── Nav items ────────────────────────────────────────────────────────────────

interface NavItem {
  section: BuilderSection;
  labelKey: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    section: 'dataSource',
    labelKey: 'builder.nav.dataSource',
    icon: <IconDatabase size={14} />,
  },
  {
    section: 'fieldConfig',
    labelKey: 'builder.nav.fieldConfig',
    icon: <IconColumns size={14} />,
  },
  {
    section: 'sectionsLayout',
    labelKey: 'builder.nav.sectionsLayout',
    icon: <IconLayoutRows size={14} />,
  },
  {
    section: 'defaultView',
    labelKey: 'builder.nav.defaultView',
    icon: <IconAdjustments size={14} />,
  },
  {
    section: 'permissions',
    labelKey: 'builder.nav.permissions',
    icon: <IconLock size={14} />,
  },
  {
    section: 'hooks',
    labelKey: 'builder.nav.hooks',
    icon: <IconCode size={14} />,
  },
  {
    section: 'pageMetadata',
    labelKey: 'builder.nav.pageMetadata',
    icon: <IconFileDescription size={14} />,
  },
  {
    section: 'ephemeral',
    labelKey: 'builder.nav.ephemeral',
    icon: <IconToggleRight size={14} />,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BuilderPanelProps {
  /** The page ID this builder panel is configuring. */
  pageId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

function BuilderPanelInner({ pageId }: BuilderPanelProps) {
  const { config, loading, error, updateConfig } = useTemplateConfig(pageId);

  const activeSection = useBuilderStore((s) => s.activeSection);
  const setActiveSection = useBuilderStore((s) => s.setActiveSection);
  const getDraftConfig = useBuilderStore((s) => s.getDraftConfig);
  const isPageDirty = useBuilderStore((s) => s.isPageDirty);
  const initPage = useBuilderStore((s) => s.initPage);
  const discardChanges = useBuilderStore((s) => s.discardChanges);
  const markSaved = useBuilderStore((s) => s.markSaved);
  const updateDraftConfig = useBuilderStore((s) => s.updateDraftConfig);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Initialize builder state when config is loaded
  React.useEffect(() => {
    if (config) {
      initPage(pageId, config);
    }
  }, [pageId, config, initPage]);

  const draftConfig = getDraftConfig(pageId);
  const isDirty = isPageDirty(pageId);

  // Effective config: use draft if available, fall back to saved
  const effectiveConfig = draftConfig ?? config;

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleDiscard() {
    discardChanges(pageId);
  }

  async function handleSave() {
    if (!draftConfig) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateConfig(draftConfig);
      markSaved(pageId);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('builder.save.errorFallback');
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={classes.root}
        data-testid="builder-panel"
        aria-label={t('builder.panel.ariaLabel')}
        aria-busy="true"
      >
        <div className={classes.loadingState} role="status" aria-label={t('builder.loading')}>
          <div className={classes.loadingBar} style={{ width: '60%' }} />
          <div className={classes.loadingBar} style={{ width: '80%' }} />
          <div className={classes.loadingBar} style={{ width: '45%' }} />
          <div className={classes.loadingBar} style={{ width: '70%' }} />
          <div className={classes.loadingBar} style={{ width: '55%' }} />
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div
        className={classes.root}
        data-testid="builder-panel"
        aria-label={t('builder.panel.ariaLabel')}
      >
        <div className={classes.errorState} role="alert">
          <IconAlertCircle size={24} aria-hidden="true" />
          <span>{t('builder.loadError')}</span>
          <span className={classes.errorStateMessage}>{error}</span>
        </div>
      </div>
    );
  }

  // ─── Active section renderer ──────────────────────────────────────────────

  function renderSection() {
    if (!effectiveConfig) return null;

    switch (activeSection) {
      case 'dataSource':
        return (
          <DataSourceSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      case 'fieldConfig':
        return (
          <FieldConfigSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      case 'sectionsLayout':
        return (
          <SectionsLayoutSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      case 'defaultView':
        return (
          <DefaultViewSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      case 'permissions':
        return (
          <PermissionsSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      case 'hooks':
        return (
          <HooksSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      case 'pageMetadata':
        return (
          <PageMetadataSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      case 'ephemeral':
        return (
          <EphemeralToggleSection
            config={effectiveConfig}
            onChange={(partial) => updateDraftConfig(pageId, partial)}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className={classes.root} data-testid="builder-panel" aria-label={t('builder.panel.ariaLabel')}>
      {/* Warning header bar (AC-3) */}
      <BuilderWarningHeader
        isDirty={isDirty}
        isSaving={isSaving}
        onDiscard={handleDiscard}
        onSave={() => void handleSave()}
      />

      {/* Save error notification */}
      {saveError && (
        <div className={classes.errorState} role="alert" style={{ padding: '8px 16px', flexDirection: 'row', gap: 8 }}>
          <IconAlertCircle size={14} aria-hidden="true" />
          <span className={classes.errorStateMessage}>{saveError}</span>
        </div>
      )}

      {/* Two-column body */}
      <div className={classes.body}>
        {/* Left: section navigation (AC-2) */}
        <nav className={classes.nav} aria-label={t('builder.nav.ariaLabel')}>
          {NAV_ITEMS.map(({ section, labelKey, icon }) => (
            <button
              key={section}
              type="button"
              className={`${classes.navItem} ${activeSection === section ? classes.navItemActive : ''}`}
              onClick={() => setActiveSection(section)}
              aria-current={activeSection === section ? 'page' : undefined}
            >
              <span className={classes.navIcon} aria-hidden="true">
                {icon}
              </span>
              {t(labelKey)}
            </button>
          ))}
        </nav>

        {/* Right: active section content */}
        <main className={classes.content} aria-label={t('builder.content.ariaLabel')}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

export const BuilderPanel = React.memo(BuilderPanelInner);

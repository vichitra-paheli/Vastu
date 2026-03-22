'use client';

/**
 * ModeSwitch — panel mode segmented control (Editor / Builder / Workflow).
 *
 * Renders in the Dockview tab bar. Allows switching between panel modes
 * depending on the user's CASL abilities and page configuration:
 *
 *   Editor   — always available, default mode
 *   Builder  — requires 'configure' on 'Page' OR 'manage' on 'all'
 *   Workflow — requires 'manage' on 'all' AND page has ephemeral mode enabled
 *
 * Segments that the user is not permitted to see are hidden entirely (not disabled).
 * If only Editor is available (viewer/editor role), no control is rendered at all
 * since there is nothing to switch between.
 *
 * Colors per plan:
 *   Editor   = --v-accent-primary       (blue)
 *   Builder  = --v-accent-secondary     (slate)
 *   Workflow = --v-accent-quaternary    (muted violet)
 *
 * Reads mode from panelStore.panelModes[panelId].
 * Writes mode via panelStore.setPanelMode on change.
 *
 * CASL ability is consumed from AbilityContext (set in WorkspaceShell).
 * The `ability` prop is also accepted directly for testing purposes.
 *
 * Implements US-120 (AC-2 through AC-8).
 */

import React, { useEffect } from 'react';
import type { AppAbility } from '@vastu/shared/permissions';
import { t } from '../../lib/i18n';
import { useAbility } from '../../providers/AbilityContext';
import { usePanelStore } from '../../stores/panelStore';
import type { PanelId, PanelMode } from '../../types/panel';
import classes from './ModeSwitch.module.css';

export interface ModeSwitchProps {
  /** The ID of the panel this switch controls. */
  panelId: PanelId;
  /**
   * CASL ability instance for the current user.
   * When provided, overrides the ability from AbilityContext.
   * Useful for testing or when rendering outside the workspace shell.
   */
  ability?: AppAbility;
  /**
   * Whether the page has ephemeral mode enabled.
   * Required for the Workflow segment to appear (even for admins).
   * Defaults to false.
   */
  ephemeralEnabled?: boolean;
}

interface ModeSegment {
  mode: PanelMode;
  labelKey: string;
  activeClass: string;
}

const SEGMENTS: ModeSegment[] = [
  {
    mode: 'editor',
    labelKey: 'panel.mode.editor',
    activeClass: classes.activeEditor,
  },
  {
    mode: 'builder',
    labelKey: 'panel.mode.builder',
    activeClass: classes.activeBuilder,
  },
  {
    mode: 'workflow',
    labelKey: 'panel.mode.workflow',
    activeClass: classes.activeWorkflow,
  },
];

export function ModeSwitch({ panelId, ability: abilityProp, ephemeralEnabled = false }: ModeSwitchProps) {
  const contextAbility = useAbility();
  const ability = abilityProp ?? contextAbility;

  const currentMode = usePanelStore((s) => s.panelModes[panelId] ?? 'editor');
  const setPanelMode = usePanelStore((s) => s.setPanelMode);

  // Determine which segments to show based on CASL abilities.
  const canUseBuilder =
    ability.can('configure', 'Page') || ability.can('manage', 'all');
  const canUseWorkflow = ability.can('manage', 'all') && ephemeralEnabled;

  const visibleSegments = SEGMENTS.filter(({ mode }) => {
    if (mode === 'builder') return canUseBuilder;
    if (mode === 'workflow') return canUseWorkflow;
    return true; // editor is always visible
  });

  const visibleModes = new Set<PanelMode>(visibleSegments.map(({ mode }) => mode));

  // Reset stale mode: if the stored mode is no longer in the visible set
  // (e.g., user's permissions changed to viewer-only or ephemeralEnabled flipped
  // to false after Workflow was selected), fall back to 'editor' so the panel
  // is never stuck in an inaccessible mode.
  useEffect(() => {
    if (!visibleModes.has(currentMode)) {
      setPanelMode(panelId, 'editor');
    }
    // visibleModes is derived from ability and ephemeralEnabled — including it
    // directly would cause referential instability on every render, so we depend
    // on the stable primitives that drive it instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseBuilder, canUseWorkflow, currentMode, panelId, setPanelMode]);

  // If only Editor is available there is nothing to switch between — render nothing.
  if (visibleSegments.length <= 1) {
    return null;
  }

  function handleSegmentClick(mode: PanelMode) {
    setPanelMode(panelId, mode);
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('panel.modeSwitch.ariaLabel')}
      className={classes.root}
    >
      {visibleSegments.map(({ mode, labelKey, activeClass }) => {
        const isActive = currentMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${classes.segment} ${isActive ? `${classes.active} ${activeClass}` : classes.inactive}`}
            onClick={() => handleSegmentClick(mode)}
            title={t(`panel.modeSwitch.${mode}.tooltip`)}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * ModeSwitch unit and component tests.
 *
 * Covers US-120 acceptance criteria:
 *
 * CASL gating (AC-3, AC-4, AC-5):
 *   - Viewer (no special abilities): only Editor available — renders null
 *   - Builder (configure Page): Editor + Builder visible
 *   - Admin (manage all): Editor + Builder + Workflow visible (when ephemeral enabled)
 *   - Admin but ephemeral disabled: Editor + Builder visible (no Workflow)
 *
 * Mode change (AC-6):
 *   - Clicking a segment updates panelStore.panelModes
 *   - Currently active mode is aria-checked="true"
 *
 * Per-panel isolation (AC-7):
 *   - panelA and panelB have independent mode state
 *
 * Serialization round-trip (AC-7):
 *   - Mode state stored in panelStore survives component unmount/remount
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { defineAbilitiesFor, type AppAbility } from '@vastu/shared/permissions';
import { TestProviders } from '../../../test-utils/providers';
import { ModeSwitch } from '../ModeSwitch';
import { usePanelStore } from '../../../stores/panelStore';

// ---- Helpers ----------------------------------------------------------------

/** Ability with read-only permissions — viewer role. */
const viewerAbility: AppAbility = defineAbilitiesFor({
  roles: [{ name: 'viewer', isSystem: true, permissions: [] }],
});

/** Ability with 'configure' on 'Page' — builder role. */
const builderAbility: AppAbility = defineAbilitiesFor({
  roles: [{ name: 'builder', isSystem: true, permissions: [] }],
});

/** Ability with 'manage' on 'all' — admin role. */
const adminAbility: AppAbility = defineAbilitiesFor({
  roles: [{ name: 'admin', isSystem: true, permissions: [] }],
});

function renderSwitch(
  panelId: string,
  ability: AppAbility,
  ephemeralEnabled = false,
) {
  return render(
    <ModeSwitch panelId={panelId} ability={ability} ephemeralEnabled={ephemeralEnabled} />,
    { wrapper: TestProviders },
  );
}

// Reset panelStore between tests so they don't bleed into each other.
beforeEach(() => {
  usePanelStore.setState({ panelModes: {} });
});

// ---- CASL gating ------------------------------------------------------------

describe('ModeSwitch — CASL gating', () => {
  it('renders nothing for a viewer (only Editor available — nothing to switch)', () => {
    const { container } = renderSwitch('panel-1', viewerAbility);
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it('renders Editor and Builder for a builder role', () => {
    renderSwitch('panel-1', builderAbility);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.getByText('Editor')).toBeTruthy();
    expect(screen.getByText('Builder')).toBeTruthy();
    expect(screen.queryByText('Workflow')).toBeNull();
  });

  it('renders Editor, Builder, and Workflow for an admin when ephemeral is enabled', () => {
    renderSwitch('panel-1', adminAbility, true);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByText('Editor')).toBeTruthy();
    expect(screen.getByText('Builder')).toBeTruthy();
    expect(screen.getByText('Workflow')).toBeTruthy();
  });

  it('renders Editor and Builder for an admin when ephemeral is disabled', () => {
    renderSwitch('panel-1', adminAbility, false);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.queryByText('Workflow')).toBeNull();
  });

  it('hides Workflow for builder role even when ephemeral is enabled', () => {
    renderSwitch('panel-1', builderAbility, true);
    expect(screen.queryByText('Workflow')).toBeNull();
  });
});

// ---- Mode switching ---------------------------------------------------------

describe('ModeSwitch — mode change', () => {
  it('defaults to Editor mode (aria-checked="true" on Editor)', () => {
    renderSwitch('panel-1', builderAbility);
    const editorBtn = screen.getByRole('radio', { name: /editor/i });
    expect(editorBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('updates panelStore when Builder is clicked', () => {
    renderSwitch('panel-1', builderAbility);
    fireEvent.click(screen.getByRole('radio', { name: /builder/i }));
    expect(usePanelStore.getState().panelModes['panel-1']).toBe('builder');
  });

  it('marks the newly active segment aria-checked="true" after click', () => {
    renderSwitch('panel-1', builderAbility);
    fireEvent.click(screen.getByRole('radio', { name: /builder/i }));
    expect(screen.getByRole('radio', { name: /builder/i }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /editor/i }).getAttribute('aria-checked')).toBe('false');
  });

  it('updates panelStore when Workflow is clicked (admin + ephemeral)', () => {
    renderSwitch('panel-1', adminAbility, true);
    fireEvent.click(screen.getByRole('radio', { name: /workflow/i }));
    expect(usePanelStore.getState().panelModes['panel-1']).toBe('workflow');
  });

  it('clicking Editor after Builder switches back to editor mode', () => {
    renderSwitch('panel-1', builderAbility);
    fireEvent.click(screen.getByRole('radio', { name: /builder/i }));
    fireEvent.click(screen.getByRole('radio', { name: /editor/i }));
    expect(usePanelStore.getState().panelModes['panel-1']).toBe('editor');
  });
});

// ---- Per-panel isolation ----------------------------------------------------

describe('ModeSwitch — per-panel isolation', () => {
  it('panel modes are independent between different panelIds', () => {
    const { unmount } = renderSwitch('panel-A', builderAbility);
    fireEvent.click(screen.getByRole('radio', { name: /builder/i }));
    unmount();

    renderSwitch('panel-B', builderAbility);
    // panel-B should default to editor, not inherit panel-A's builder mode
    expect(screen.getByRole('radio', { name: /editor/i }).getAttribute('aria-checked')).toBe('true');

    expect(usePanelStore.getState().panelModes['panel-A']).toBe('builder');
    expect(usePanelStore.getState().panelModes['panel-B']).toBeUndefined();
  });
});

// ---- Serialization round-trip -----------------------------------------------

describe('ModeSwitch — serialization round-trip', () => {
  it('restores active mode from panelStore on remount', () => {
    // Simulate a pre-existing mode (e.g., restored from localStorage)
    usePanelStore.setState({ panelModes: { 'panel-1': 'builder' } });

    renderSwitch('panel-1', builderAbility);

    expect(screen.getByRole('radio', { name: /builder/i }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: /editor/i }).getAttribute('aria-checked')).toBe('false');
  });
});

// ---- Accessibility ----------------------------------------------------------

describe('ModeSwitch — accessibility', () => {
  it('renders with role="radiogroup"', () => {
    renderSwitch('panel-1', builderAbility);
    expect(screen.getByRole('radiogroup')).toBeTruthy();
  });

  it('has aria-label on the radiogroup', () => {
    renderSwitch('panel-1', builderAbility);
    const group = screen.getByRole('radiogroup');
    expect(group.getAttribute('aria-label')).toBeTruthy();
  });

  it('each segment has a tooltip (title attribute)', () => {
    renderSwitch('panel-1', builderAbility);
    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => {
      expect(radio.getAttribute('title')).toBeTruthy();
    });
  });
});

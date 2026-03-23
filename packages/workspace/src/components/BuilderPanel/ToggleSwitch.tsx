'use client';

/**
 * ToggleSwitch — shared toggle/checkbox control used across BuilderPanel sections.
 *
 * Extracted to avoid duplicating the same pattern in every section file.
 * Accepts a stable `id` prop for label association.
 */

import React from 'react';
import classes from './BuilderPanel.module.css';

export interface ToggleSwitchProps {
  /** Element id — must be unique in the document. Used to associate the label. */
  id: string;
  /** Current checked state. */
  checked: boolean;
  /** Called with the new boolean value when the toggle changes. */
  onChange: (val: boolean) => void;
  /** Optional aria-label for screen readers when there is no adjacent visible label. */
  ariaLabel?: string;
}

export function ToggleSwitch({ id, checked, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <label className={classes.toggleSwitch} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={classes.toggleSwitchInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
      />
      <span className={classes.toggleSwitchTrack} />
      <span className={classes.toggleSwitchThumb} />
    </label>
  );
}

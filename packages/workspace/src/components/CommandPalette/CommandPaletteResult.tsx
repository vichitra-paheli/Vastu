'use client';

/**
 * CommandPaletteResult — custom result item renderer for the command palette.
 *
 * Renders three distinct layouts depending on action group:
 *   - Pages: icon placeholder + name + template type badge
 *   - Recent records: record title + type badge
 *   - Commands: ">" prefix + command name + description
 *
 * This component is used as a standalone renderer.
 * The CommandPalette itself renders these inline via Spotlight.Action.
 *
 * Implements US-125b (AC-1).
 */

import React from 'react';
import type { CommandPaletteAction } from '../../hooks/useCommandPaletteActions';
import classes from './CommandPalette.module.css';

export interface CommandPaletteResultProps {
  action: CommandPaletteAction;
}

/** Renders a badge chip for template type or record type. */
function TypeBadge({ label }: { label: string }) {
  return <span className={classes.typeBadge}>{label}</span>;
}

export function CommandPaletteResult({ action }: CommandPaletteResultProps) {
  if (action.group === 'pages') {
    return (
      <div className={classes.resultInner}>
        {action.iconName && (
          <span className={classes.resultIcon} aria-hidden="true" />
        )}
        <span className={classes.resultLabel}>{action.label}</span>
        {action.meta && <TypeBadge label={action.meta} />}
      </div>
    );
  }

  if (action.group === 'recent') {
    return (
      <div className={classes.resultInner}>
        <span className={classes.resultLabel}>{action.label}</span>
        {action.meta && <TypeBadge label={action.meta} />}
      </div>
    );
  }

  // commands group
  return (
    <div className={classes.resultInner}>
      <span className={classes.resultCommandPrefix} aria-hidden="true">
        {'>'}
      </span>
      <div className={classes.resultTextBlock}>
        <span className={classes.resultLabel}>{action.label}</span>
        {action.description && (
          <span className={classes.resultDescription}>{action.description}</span>
        )}
      </div>
    </div>
  );
}

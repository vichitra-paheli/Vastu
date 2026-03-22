'use client';

/**
 * EntityHeader — entity name, avatar/icon, subtitle, status badge, and action buttons.
 *
 * Used by MultiTabDetailTemplate as the top band of the entity detail page.
 * Follows Style Guide §2.2 for entity name sizing (--v-text-xl).
 * All colors via --v-* CSS custom properties.
 * All strings via t('key').
 *
 * Implements US-131a.
 */

import React from 'react';
import { Skeleton } from '@mantine/core';
import { TruncatedText } from '../../components/TruncatedText';
import { t } from '../../lib/i18n';
import classes from './MultiTabDetailTemplate.module.css';

export interface EntityAction {
  /** Unique key for the action. */
  key: string;
  /** Display label. */
  label: string;
  /** Optional icon element. */
  icon?: React.ReactElement;
  /** True when this is the primary CTA action. */
  primary?: boolean;
  /** Called when the button is clicked. */
  onClick: () => void;
  /** aria-label for the button (falls back to label). */
  ariaLabel?: string;
  /** Whether the action is disabled. */
  disabled?: boolean;
}

export interface EntityHeaderProps {
  /** Entity name — rendered at --v-text-xl. */
  name: string;
  /** Secondary line below name (type, description, etc.). */
  subtitle?: string;
  /** Status text shown as a badge (e.g. "Active", "Archived"). */
  status?: string;
  /** URL for the entity avatar image. */
  avatarUrl?: string;
  /** Fallback initials when avatarUrl is absent. */
  initials?: string;
  /** Icon element shown in the avatar slot when avatarUrl and initials are both absent. */
  icon?: React.ReactElement;
  /** Action buttons to render in the header. */
  actions?: EntityAction[];
  /** True while entity data is loading. */
  loading?: boolean;
}

/** Renders a single action button in the header. */
function ActionButton({ action }: { action: EntityAction }) {
  return (
    <button
      className={`${classes.actionButton}${action.primary ? ` ${classes.actionButtonPrimary}` : ''}`}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.ariaLabel ?? action.label}
    >
      {action.icon &&
        React.cloneElement(action.icon, {
          size: 14,
          'aria-hidden': true,
        })}
      {action.label}
    </button>
  );
}

/** Skeleton variant shown while entity data loads. */
function EntityHeaderSkeleton() {
  return (
    <div
      className={classes.headerRow}
      aria-label={t('entityHeader.skeleton.ariaLabel')}
      aria-busy="true"
      role="status"
    >
      <Skeleton height={48} width={48} radius="md" />
      <div style={{ flex: 1 }}>
        <Skeleton height={20} width="40%" mb={6} radius="sm" />
        <Skeleton height={14} width="25%" mb={8} radius="sm" />
        <Skeleton height={20} width={80} radius="xl" />
      </div>
    </div>
  );
}

export function EntityHeader({
  name,
  subtitle,
  status,
  avatarUrl,
  initials,
  icon,
  actions = [],
  loading = false,
}: EntityHeaderProps) {
  if (loading) {
    return (
      <div className={classes.header}>
        <EntityHeaderSkeleton />
      </div>
    );
  }

  return (
    <div className={classes.header} aria-label={t('entityHeader.ariaLabel')}>
      <div className={classes.headerRow}>
        {/* Avatar / icon slot */}
        <div
          className={classes.entityAvatar}
          aria-hidden="true"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className={classes.entityAvatarImg}
            />
          ) : initials ? (
            initials
          ) : icon ? (
            React.cloneElement(icon, { size: 24, 'aria-hidden': true })
          ) : null}
        </div>

        {/* Name + subtitle + status */}
        <div className={classes.headerMeta}>
          <h1 className={classes.entityName}>
            <TruncatedText>{name}</TruncatedText>
          </h1>

          {subtitle && (
            <p className={classes.entitySubtitle}>
              <TruncatedText>{subtitle}</TruncatedText>
            </p>
          )}

          {status && (
            <div className={classes.headerBadgeRow}>
              <span className={classes.statusBadge}>{status}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {actions.length > 0 && (
          <div className={classes.headerActions} role="group" aria-label={t('entityHeader.actions.ariaLabel')}>
            {actions.map((action) => (
              <ActionButton key={action.key} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

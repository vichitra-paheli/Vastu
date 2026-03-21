'use client';

/**
 * SidebarUserAvatar — user avatar displayed at the bottom of the sidebar.
 *
 * Collapsed: avatar only (with tooltip showing name).
 * Expanded:  avatar + name + role text.
 */

import React from 'react';
import { Avatar, Tooltip } from '@mantine/core';
import classes from './SidebarNav.module.css';

interface SidebarUserAvatarProps {
  /** User display name. */
  name: string;
  /** User role label (e.g. "Admin", "Editor"). */
  role: string;
  /** Avatar image URL. Optional — falls back to initials. */
  avatarUrl?: string;
  /** Whether the sidebar is in collapsed mode. */
  collapsed?: boolean;
}

/** Returns up to two initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function SidebarUserAvatar({
  name,
  role,
  avatarUrl,
  collapsed = false,
}: SidebarUserAvatarProps) {
  const initials = getInitials(name);

  const avatarEl = (
    <Avatar
      src={avatarUrl ?? null}
      size={28}
      radius="xl"
      aria-label={name}
      style={{ flexShrink: 0, backgroundColor: 'var(--v-accent-primary)', color: 'var(--v-text-on-accent)' }}
    >
      {initials}
    </Avatar>
  );

  const content = (
    <div className={classes.userArea}>
      {collapsed ? (
        <Tooltip
          label={`${name} — ${role}`}
          position="right"
          openDelay={300}
          styles={{
            tooltip: {
              background: 'var(--v-bg-elevated)',
              boxShadow: 'var(--v-shadow-sm)',
              fontSize: 'var(--v-text-sm)',
              color: 'var(--v-text-primary)',
              border: '1px solid var(--v-border-default)',
            },
          }}
        >
          {avatarEl}
        </Tooltip>
      ) : (
        <>
          {avatarEl}
          <div className={classes.userInfo} aria-hidden={collapsed}>
            <div className={classes.userName}>{name}</div>
            <div className={classes.userRole}>{role}</div>
          </div>
        </>
      )}
    </div>
  );

  return content;
}

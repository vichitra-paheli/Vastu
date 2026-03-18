'use client';

/**
 * UserMenu — Avatar dropdown for the shell TopBar.
 *
 * Displays the current user's avatar (initials-based), name, email, and role badge.
 * Provides a "Sign out" action via next-auth signOut.
 *
 * Must be "use client" because it uses Mantine Menu (interactive dropdown)
 * and next-auth/react signOut.
 */

import { Avatar, Badge, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconLogout, IconSettings, IconUser } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import { TruncatedText } from '../shared/TruncatedText';

export interface UserMenuProps {
  name: string;
  email: string;
  /** Primary role name to display as a badge */
  role: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0]?.charAt(0) ?? '').toUpperCase();
  }
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <Menu
      position="bottom-end"
      offset={4}
      shadow="var(--v-shadow-md)"
      radius="var(--v-radius-md)"
      withArrow={false}
    >
      <Menu.Target>
        <UnstyledButton
          aria-label={`User menu for ${name}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--v-space-2)',
            padding: 'var(--v-space-1) var(--v-space-2)',
            borderRadius: 'var(--v-radius-md)',
            transition: 'background-color var(--v-duration-fast) var(--v-ease-default)',
          }}
          styles={{
            root: {
              '&:hover': { backgroundColor: 'var(--v-interactive-hover)' },
            },
          }}
        >
          <Avatar
            size={28}
            radius="var(--v-radius-full)"
            style={{
              backgroundColor: 'var(--v-accent-primary)',
              color: 'var(--v-text-inverse)',
              fontSize: 'var(--v-text-xs)',
              fontWeight: 'var(--v-font-medium)',
            }}
          >
            {getInitials(name)}
          </Avatar>
          <Text fz="var(--v-text-sm)" fw="var(--v-font-regular)" c="var(--v-text-primary)" visibleFrom="sm">
            {name}
          </Text>
          <IconChevronDown
            size={14}
            style={{ color: 'var(--v-text-tertiary)' }}
            aria-hidden="true"
          />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown
        style={{
          backgroundColor: 'var(--v-bg-elevated)',
          borderColor: 'var(--v-border-default)',
          minWidth: 220,
        }}
      >
        {/* User info header */}
        <Menu.Label
          style={{
            padding: 'var(--v-space-2) var(--v-space-3)',
            borderBottom: '1px solid var(--v-border-subtle)',
            marginBottom: 'var(--v-space-1)',
          }}
        >
          <Group gap="xs" wrap="nowrap" align="flex-start">
            <Avatar
              size={32}
              radius="var(--v-radius-full)"
              style={{
                backgroundColor: 'var(--v-accent-primary)',
                color: 'var(--v-text-inverse)',
                fontSize: 'var(--v-text-xs)',
                fontWeight: 'var(--v-font-medium)',
                flexShrink: 0,
              }}
            >
              {getInitials(name)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <TruncatedText fz="var(--v-text-sm)" fw="var(--v-font-medium)" c="var(--v-text-primary)">
                {name}
              </TruncatedText>
              <TruncatedText fz="var(--v-text-xs)" c="var(--v-text-secondary)">
                {email}
              </TruncatedText>
              <Badge
                size="xs"
                variant="light"
                mt={2}
                style={{
                  backgroundColor: 'var(--v-accent-primary-light)',
                  color: 'var(--v-accent-primary)',
                  fontWeight: 'var(--v-font-medium)',
                  textTransform: 'capitalize',
                }}
              >
                {role}
              </Badge>
            </div>
          </Group>
        </Menu.Label>

        {/* Actions */}
        <Menu.Item
          leftSection={<IconUser size={14} aria-hidden="true" />}
          component="a"
          href="/settings/profile"
          style={{ fontSize: 'var(--v-text-sm)', color: 'var(--v-text-primary)' }}
        >
          Profile
        </Menu.Item>

        <Menu.Item
          leftSection={<IconSettings size={14} aria-hidden="true" />}
          component="a"
          href="/settings/organization"
          style={{ fontSize: 'var(--v-text-sm)', color: 'var(--v-text-primary)' }}
        >
          Settings
        </Menu.Item>

        <Menu.Divider style={{ borderColor: 'var(--v-border-subtle)' }} />

        <Menu.Item
          leftSection={<IconLogout size={14} aria-hidden="true" />}
          onClick={handleSignOut}
          style={{ fontSize: 'var(--v-text-sm)', color: 'var(--v-status-error)' }}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

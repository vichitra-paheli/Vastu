'use client';

/**
 * Breadcrumb — Dynamic breadcrumb component for the shell TopBar.
 *
 * Derives segments from the current pathname and renders them using
 * Mantine's Breadcrumbs component. Segment labels are humanized from
 * the URL slug.
 *
 * Patterns Library §7 — breadcrumb segments use TruncatedText.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Breadcrumbs, Anchor, Text } from '@mantine/core';

/** Maps URL slugs to human-readable labels. */
const SEGMENT_LABELS: Record<string, string> = {
  settings: 'Settings',
  admin: 'Admin',
  profile: 'Profile',
  organization: 'Organization',
  databases: 'DB Connections',
  'api-keys': 'API Keys',
  appearance: 'Appearance',
  sso: 'SSO',
  users: 'Users',
  roles: 'Roles',
  permissions: 'Permissions',
  tenants: 'Tenants',
  'audit-log': 'Audit Log',
};

function humanize(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

export function Breadcrumb() {
  const pathname = usePathname();

  // Build segments from the pathname — skip empty strings from leading slash.
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const items = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = humanize(segment);
    const isLast = index === segments.length - 1;

    if (isLast) {
      return (
        <Text
          key={href}
          fz="var(--v-text-sm)"
          c="var(--v-text-primary)"
          fw="var(--v-font-medium)"
          component="span"
        >
          {label}
        </Text>
      );
    }

    return (
      <Anchor
        key={href}
        component={Link}
        href={href}
        fz="var(--v-text-sm)"
        c="var(--v-text-secondary)"
        style={{ textDecoration: 'none' }}
      >
        {label}
      </Anchor>
    );
  });

  return (
    <Breadcrumbs
      separator="/"
      separatorMargin={4}
      styles={{
        separator: { color: 'var(--v-text-tertiary)', fontSize: 'var(--v-text-sm)' },
        root: { flexWrap: 'nowrap', overflow: 'hidden' },
      }}
    >
      {items}
    </Breadcrumbs>
  );
}

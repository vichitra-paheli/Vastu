/**
 * SideNav — Shell layout side navigation.
 *
 * Renders a SETTINGS section for all users and an ADMIN section that is
 * CASL-gated (only visible when the user has 'manage all' permission).
 *
 * Server component: reads session + ability on the server and passes
 * `isAdmin` to the client-rendered SideNavItem components.
 *
 * Navigation sections per CLAUDE.md:
 * SETTINGS: Profile, Organization, DB Connections, API Keys, Appearance, SSO
 * ADMIN:     Users, Roles, Permissions, Tenants, Audit Log
 */

import {
  IconUser,
  IconBuilding,
  IconDatabase,
  IconKey,
  IconPalette,
  IconShieldLock,
  IconUsers,
  IconShield,
  IconLock,
  IconLayoutGrid,
  IconActivity,
} from '@tabler/icons-react';
import { t } from '@/lib/i18n';
import { SideNavItem } from './SideNavItem';
import classes from './SideNav.module.css';

export interface SideNavProps {
  /** Whether the current user has admin access. Determined server-side via CASL. */
  isAdmin: boolean;
}

const SETTINGS_ITEMS = [
  { href: '/settings/profile', label: t('nav.profile'), icon: <IconUser size={16} /> },
  { href: '/settings/organization', label: t('nav.organization'), icon: <IconBuilding size={16} /> },
  { href: '/settings/databases', label: t('nav.databases'), icon: <IconDatabase size={16} /> },
  { href: '/settings/api-keys', label: t('nav.apiKeys'), icon: <IconKey size={16} /> },
  { href: '/settings/appearance', label: t('nav.appearance'), icon: <IconPalette size={16} /> },
  { href: '/settings/sso', label: t('nav.sso'), icon: <IconShieldLock size={16} /> },
] as const;

const ADMIN_ITEMS = [
  { href: '/admin/users', label: t('nav.users'), icon: <IconUsers size={16} /> },
  { href: '/admin/roles', label: t('nav.roles'), icon: <IconShield size={16} /> },
  { href: '/admin/permissions', label: t('nav.permissions'), icon: <IconLock size={16} /> },
  { href: '/admin/tenants', label: t('nav.tenants'), icon: <IconLayoutGrid size={16} /> },
  { href: '/admin/audit-log', label: t('nav.auditLog'), icon: <IconActivity size={16} /> },
] as const;

export function SideNav({ isAdmin }: SideNavProps) {
  return (
    <nav className={classes.sideNav} aria-label="Shell navigation">
      {/* SETTINGS section */}
      <div className={classes.section}>
        <div className={classes.sectionLabel} aria-hidden="true">
          {t('nav.settings')}
        </div>
        {SETTINGS_ITEMS.map((item) => (
          <SideNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </div>

      {/* ADMIN section — only rendered for admin users */}
      {isAdmin && (
        <div className={classes.section}>
          <div className={classes.sectionLabel} aria-hidden="true">
            {t('nav.admin')}
          </div>
          {ADMIN_ITEMS.map((item) => (
            <SideNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </div>
      )}
    </nav>
  );
}

'use client';

/**
 * SideNavItem — Individual navigation item for the shell side nav.
 *
 * Renders a Next.js Link with active state detection based on the current pathname.
 * Active items are highlighted with --v-accent-primary per design system AC-4.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import classes from './SideNavItem.module.css';

export interface SideNavItemProps {
  /** Navigation target path */
  href: string;
  /** Icon element to display beside the label */
  icon?: ReactNode;
  /** Text label for the nav item */
  label: string;
  /** Whether to use exact match for active detection. Default: false (prefix match). */
  exact?: boolean;
}

export function SideNavItem({ href, icon, label, exact = false }: SideNavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`${classes.navItem}${isActive ? ` ${classes.navItemActive}` : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon && (
        <span className={classes.navIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      {label}
    </Link>
  );
}

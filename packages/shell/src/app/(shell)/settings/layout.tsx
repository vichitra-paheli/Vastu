/**
 * Settings route group layout.
 *
 * Renders children in the shell content area. The shell itself (TopBar + SideNav)
 * is provided by the parent (shell) group layout.
 *
 * This layout exists to allow settings-specific metadata and loading states
 * in the future without affecting admin pages.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — Vastu',
  description: 'Manage your profile, organization, and workspace settings',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

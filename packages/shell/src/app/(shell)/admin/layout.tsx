/**
 * Admin route group layout — CASL-gated.
 *
 * Checks whether the current user has admin permissions before rendering
 * the admin section. Non-admin users are shown a 404 (not found) response
 * rather than a redirect to avoid leaking the existence of admin pages.
 *
 * The shell layout (TopBar + SideNav) is provided by the parent (shell) group.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';

export const metadata: Metadata = {
  title: 'Admin — Vastu',
  description: 'Platform administration',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, ability } = await getSessionWithAbility();

  // Unauthenticated users are handled by middleware, but defensive check here.
  if (!session || !ability) {
    notFound();
  }

  // Non-admin users see 404 — do not reveal the existence of admin pages.
  if (!isAdmin(ability)) {
    notFound();
  }

  return <>{children}</>;
}

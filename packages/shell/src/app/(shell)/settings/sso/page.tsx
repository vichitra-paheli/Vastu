/**
 * Settings — SSO configuration page.
 * US-019, AC-1: Admin-only, CASL-gated.
 *
 * Server component: reads session and CASL ability. Redirects non-admins to
 * /settings/profile (the first settings page they have access to).
 *
 * Renders SsoProviderList which manages the full CRUD lifecycle client-side.
 *
 * MCP parity note: The read half of this page corresponds to a future
 * `list_sso_provider_configs()` MCP tool (Phase 4).
 */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionWithAbility } from '@/lib/session';
import { isAdmin } from '@vastu/shared/permissions';
import { SsoProviderList } from '@/components/settings/SsoProviderList';

export const metadata: Metadata = {
  title: 'SSO Configuration — Vastu',
  description: 'Configure identity providers for single sign-on',
};

export default async function SsoPage() {
  const { session, ability } = await getSessionWithAbility();

  // Defensive guard — middleware handles the primary check, but belt-and-suspenders.
  if (!session) {
    redirect('/login');
  }

  // CASL gate: only admins may access SSO configuration (AC-1).
  if (!ability || !isAdmin(ability)) {
    redirect('/settings/profile');
  }

  return <SsoProviderList />;
}

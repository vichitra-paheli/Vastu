/**
 * Admin — Tenants page.
 *
 * Server component: reads session to pass the current tenantId to TenantList.
 * The TenantList client component handles all data fetching and mutations.
 *
 * US-023: Tenant management (AC-1 through AC-7)
 */

import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import { TenantList } from '@/components/admin/TenantList';

export const metadata: Metadata = {
  title: 'Tenants — Vastu',
  description: 'Manage tenants and data isolation for your organization',
};

export default async function AdminTenantsPage() {
  const session = await getSession();
  const currentTenantId = session?.user.tenantId ?? null;

  return <TenantList currentTenantId={currentTenantId} />;
}

/**
 * Admin — Permissions page.
 * US-022: Permission matrix (admin-only, CASL-gated via parent admin layout).
 *
 * Server component: fetches the org user count for the save confirmation dialog,
 * then renders the PermissionMatrix client component which handles the grid,
 * toggles, and CSV export.
 */

import type { Metadata } from 'next';
import { prisma } from '@vastu/shared/prisma';
import { getSession } from '@/lib/session';
import { PermissionMatrix } from '@/components/admin/PermissionMatrix';

export const metadata: Metadata = {
  title: 'Permissions — Vastu',
};

export default async function AdminPermissionsPage() {
  const session = await getSession();

  // Session is guaranteed by the admin layout but typing requires the guard.
  if (!session) {
    return null;
  }

  // Fetch total user count for the "affects N users" message in the save dialog.
  const orgUserCount = await prisma.user.count({
    where: {
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });

  return <PermissionMatrix orgUserCount={orgUserCount} />;
}

/**
 * Admin — Roles page.
 *
 * Server component. Fetches all roles for the organisation (with user counts)
 * and passes them to the RoleList client component.
 *
 * Access control is enforced by the parent admin layout (CASL admin check).
 * This page trusts that the user is an admin.
 */

import type { Metadata } from 'next';
import { prisma } from '@vastu/shared/prisma';
import { getSession } from '@/lib/session';
import { RoleList } from '@/components/admin/RoleList';
import type { RoleListRole } from '@/components/admin/RoleList';

export const metadata: Metadata = {
  title: 'Role Management — Vastu',
};

export default async function AdminRolesPage() {
  const session = await getSession();

  // Session is guaranteed by the admin layout but typing requires the guard.
  if (!session) {
    return null;
  }

  const dbRoles = await prisma.role.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      permissions: true,
      _count: { select: { userRoles: true } },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  const roles: RoleListRole[] = dbRoles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r._count.userRoles,
    permissions: r.permissions.map((p) => ({
      resource: p.resource,
      action: p.action,
      granted: p.granted,
    })),
  }));

  return <RoleList initialRoles={roles} />;
}

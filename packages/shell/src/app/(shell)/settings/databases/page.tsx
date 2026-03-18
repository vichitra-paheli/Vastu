/**
 * Settings — Database Connections page.
 *
 * Server component: fetches DB connections for the current org and renders
 * the client DbConnectionList. The encryptedPassword column is excluded from
 * the query — it must never reach the browser.
 *
 * Implements US-016 (DB Connections, AC-1 through AC-7).
 */

import type { Metadata } from 'next';
import { prisma } from '@vastu/shared/prisma';
import { requireSession } from '../../../../lib/session';
import { DbConnectionList } from '../../../../components/settings/DbConnectionList';
import type { DbConnection } from '@vastu/shared/types';

export const metadata: Metadata = {
  title: 'Database Connections — Vastu',
  description: 'Manage external database connections for your workspace',
};

export default async function DatabasesPage() {
  const session = await requireSession();

  const rawConnections = await prisma.dbConnection.findMany({
    where: {
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      host: true,
      port: true,
      database: true,
      username: true,
      sslEnabled: true,
      protocol: true,
      healthStatus: true,
      lastHealthCheck: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Cast to the shared DbConnection type (deletedAt is included for type compat)
  const connections = rawConnections as DbConnection[];

  return <DbConnectionList initialConnections={connections} />;
}

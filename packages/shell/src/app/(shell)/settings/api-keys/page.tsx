/**
 * Settings — API Keys page.
 *
 * Server component: fetches the user's non-revoked API keys from the database
 * and passes them to the client-side ApiKeyTable component.
 *
 * Route: /settings/api-keys
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@vastu/shared/prisma';
import type { ApiKey } from '@vastu/shared/types';
import { getSession } from '@/lib/session';
import { ApiKeyTable } from '@/components/settings/ApiKeyTable';

export const metadata: Metadata = {
  title: 'API Keys — Vastu',
  description: 'Generate and manage API keys for programmatic access to Vastu',
};

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login?redirect=/settings/api-keys');
  }

  const rawKeys = await prisma.apiKey.findMany({
    where: {
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scope: true,
      description: true,
      lastUsedAt: true,
      requestCount24h: true,
      userId: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize Date objects to ISO strings for client component serialization,
  // then reconstruct as the ApiKey type shape accepted by ApiKeyTable.
  const keys: ApiKey[] = rawKeys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    deletedAt: k.deletedAt,
  }));

  return <ApiKeyTable initialKeys={keys} />;
}

/**
 * Seed Keycloak users and link them to existing DB users via Account records.
 *
 * Run after:
 *   1. Keycloak is healthy with the vastu realm imported
 *   2. Prisma migrations have been applied
 *   3. prisma:seed has created the DB users
 *
 * This script:
 *   - Creates each test user in Keycloak via the Admin REST API
 *   - Creates an Account record linking the DB user → Keycloak user
 *
 * Without these Account records, next-auth's first OAuth callback would try to
 * create a new User (which fails because organizationId is required). With them,
 * next-auth finds the existing Account and reuses the seeded User.
 *
 * Usage:
 *   KEYCLOAK_URL=http://localhost:8080 tsx packages/shell/e2e/seed-keycloak-accounts.ts
 */

import { PrismaClient } from '@prisma/client';

const KEYCLOAK_URL = process.env['KEYCLOAK_URL'] ?? 'http://localhost:8080';
const REALM = process.env['KEYCLOAK_REALM'] ?? 'vastu';

/** Must match seed.ts IDs and fixtures.ts passwords */
const SEED_USERS = [
  {
    dbId: 'cccccccc-0000-4000-a000-000000000001',
    email: 'admin@vastu.dev',
    password: 'Admin1234!',
    firstName: 'Admin',
    lastName: 'User',
  },
  {
    dbId: 'cccccccc-0000-4000-a000-000000000002',
    email: 'editor@vastu.dev',
    password: 'Editor1234!',
    firstName: 'Editor',
    lastName: 'User',
  },
  {
    dbId: 'cccccccc-0000-4000-a000-000000000003',
    email: 'viewer@vastu.dev',
    password: 'Viewer1234!',
    firstName: 'Viewer',
    lastName: 'User',
  },
] as const;

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: 'admin',
      password: 'admin',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get admin token: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function createKeycloakUser(
  token: string,
  user: (typeof SEED_USERS)[number],
): Promise<string> {
  const res = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: user.email,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      enabled: true,
      emailVerified: true,
      credentials: [{ type: 'password', value: user.password, temporary: false }],
    }),
  });

  if (res.status === 409) {
    // User already exists — look up by email.
    const lookupRes = await fetch(
      `${KEYCLOAK_URL}/admin/realms/${REALM}/users?email=${encodeURIComponent(user.email)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const users = (await lookupRes.json()) as { id: string }[];
    if (users.length === 0) {
      throw new Error(`User ${user.email} reported as duplicate but not found in lookup`);
    }
    return users[0]!.id;
  }

  if (!res.ok) {
    throw new Error(`Failed to create Keycloak user ${user.email}: ${res.status} ${await res.text()}`);
  }

  // Keycloak returns the user ID in the Location header.
  const location = res.headers.get('Location');
  if (!location) {
    throw new Error(`No Location header returned for ${user.email}`);
  }
  return location.split('/').pop()!;
}

async function main(): Promise<void> {
  console.log(`[seed-keycloak] Keycloak URL: ${KEYCLOAK_URL}, realm: ${REALM}`);

  const token = await getAdminToken();
  console.log('[seed-keycloak] Got admin token');

  const prisma = new PrismaClient();

  try {
    for (const user of SEED_USERS) {
      const keycloakId = await createKeycloakUser(token, user);
      console.log(`[seed-keycloak] Keycloak user ${user.email} → ${keycloakId}`);

      // Link the DB user to the Keycloak identity via an Account record.
      // This is what next-auth creates on first OAuth sign-in. Pre-creating it
      // ensures next-auth reuses the seeded User (with roles and permissions)
      // rather than attempting to create a new one.
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: 'keycloak',
            providerAccountId: keycloakId,
          },
        },
        update: {},
        create: {
          userId: user.dbId,
          type: 'oidc',
          provider: 'keycloak',
          providerAccountId: keycloakId,
        },
      });
      console.log(`[seed-keycloak] Linked Account for ${user.email}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('[seed-keycloak] Done');
}

main().catch((err: unknown) => {
  console.error('[seed-keycloak] Fatal error:', err);
  process.exit(1);
});

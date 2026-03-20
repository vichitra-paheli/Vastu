/**
 * E2E auth setup — creates database sessions for test users.
 *
 * Called from global-setup.ts before any test runs. For each user in
 * TEST_USERS it inserts (or upserts) a session row in the database and
 * writes a Playwright storageState JSON file to `.auth/<role>.json`.
 *
 * Tests that need an authenticated browser context reference these files:
 *   test.use({ storageState: '.auth/admin.json' });
 *
 * This approach bypasses Keycloak entirely — the session is created
 * directly in the database, which is all next-auth's database strategy
 * needs to recognise the user as authenticated.
 */

import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/** Must match the user IDs in packages/shared/src/prisma/seed.ts */
const SEED_USER_IDS: Record<string, string> = {
  admin: 'cccccccc-0000-4000-a000-000000000001',
  editor: 'cccccccc-0000-4000-a000-000000000002',
  viewer: 'cccccccc-0000-4000-a000-000000000003',
};

/** Session expiry: 24 hours from now */
function sessionExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

/**
 * Deterministic session IDs so upsert is idempotent across re-runs.
 * Using a fixed prefix + role avoids creating a new session every time.
 */
function sessionId(role: string): string {
  const ids: Record<string, string> = {
    admin: 'e2e-sess-0000-4000-a000-000000000001',
    editor: 'e2e-sess-0000-4000-a000-000000000002',
    viewer: 'e2e-sess-0000-4000-a000-000000000003',
  };
  return ids[role] ?? randomUUID();
}

function sessionToken(role: string): string {
  return `e2e-test-session-token-${role}`;
}

/**
 * Build a Playwright storageState object with the next-auth session cookie.
 *
 * next-auth v5 (Auth.js) with database strategy uses `authjs.session-token`
 * as the cookie name when running over HTTP (no __Secure- prefix).
 */
function buildStorageState(token: string) {
  return {
    cookies: [
      {
        name: 'authjs.session-token',
        value: token,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };
}

/**
 * Create sessions for all test users and write storageState files.
 *
 * @param authDir - Absolute path to the `.auth/` directory (created if missing).
 */
export async function seedTestSessions(authDir: string): Promise<void> {
  const prisma = new PrismaClient();

  try {
    for (const role of Object.keys(SEED_USER_IDS)) {
      const userId = SEED_USER_IDS[role]!;
      const id = sessionId(role);
      const token = sessionToken(role);
      const expires = sessionExpiry();

      // Upsert session — safe to re-run.
      await prisma.session.upsert({
        where: { id },
        update: { expires },
        create: {
          id,
          sessionToken: token,
          userId,
          expires,
        },
      });

      // Write storageState file.
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }
      const filePath = path.join(authDir, `${role}.json`);
      fs.writeFileSync(filePath, JSON.stringify(buildStorageState(token), null, 2));

      console.log(`[auth-setup] Created session for ${role} → ${filePath}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

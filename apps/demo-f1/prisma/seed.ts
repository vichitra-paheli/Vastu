/**
 * demo-f1 seed script
 *
 * Runs the Vastu base seed first (users, roles, permissions, org, tenant),
 * then seeds application-specific F1 domain data below.
 *
 * Usage:
 *   pnpm prisma:seed                  — runs base seed + domain seed
 *   DATABASE_URL=... pnpm prisma:seed — explicit connection
 *
 * The domain seed is intentionally left empty here — the full F1 seed data
 * is implemented in US-221 (apps/demo-f1/prisma/f1Seed.ts).
 * This file wires the two seeds together.
 */

import { runBaseSeed } from '@vastu/shared/prisma';
import { PrismaClient } from '@prisma/client';
import { runF1Seed } from './f1Seed';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Main — base seed runs first, domain seed second
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Step 1: Run the Vastu framework base seed:
  //   org, tenant, users (admin/editor/viewer), roles, permissions, API keys, audit events
  await runBaseSeed(prisma);

  // Step 2: Run F1-specific domain seed (US-221)
  //   circuits, constructors, drivers, seasons, races, results, standings, etc.
  await runF1Seed(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

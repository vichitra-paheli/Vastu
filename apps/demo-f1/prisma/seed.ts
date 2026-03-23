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

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Domain seed — F1-specific data
// ---------------------------------------------------------------------------

async function runDomainSeed(): Promise<void> {
  console.log('Seeding domain data for demo-f1...');

  // TODO (US-221): Full F1 seed with 5 seasons of realistic data will be
  // implemented in the next story. This stub ensures the seed wiring is
  // correct and the base seed completes successfully.

  // Example of the pattern that will be used:
  //   await prisma.season.upsert({
  //     where: { year: 2024 },
  //     update: {},
  //     create: { year: 2024, rounds: 24, ... },
  //   });

  console.log('  done');
}

// ---------------------------------------------------------------------------
// Main — base seed runs first, domain seed second
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Step 1: Run the Vastu framework base seed:
  //   org, tenant, users (admin/editor/viewer), roles, permissions, API keys, audit events
  await runBaseSeed(prisma);

  // Step 2: Run F1-specific domain seed
  await runDomainSeed();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

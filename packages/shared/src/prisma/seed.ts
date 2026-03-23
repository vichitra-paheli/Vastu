/**
 * seed.ts — Vastu framework development seed
 *
 * Runs the base seed (all framework tables) for development and testing.
 * App-specific seeds import runBaseSeed from baseSeed.ts and call it first.
 *
 * Usage:
 *   pnpm prisma:seed          — from packages/shared/
 *   pnpm prisma:seed          — from root (delegates to @vastu/shared)
 */

import { PrismaClient } from '@prisma/client';
import { runBaseSeed } from './baseSeed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await runBaseSeed(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

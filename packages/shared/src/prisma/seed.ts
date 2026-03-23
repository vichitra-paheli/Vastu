import { PrismaClient } from '@prisma/client';
import { seedFrameworkData } from './base-seed';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Seeding database...');

  await seedFrameworkData(prisma);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

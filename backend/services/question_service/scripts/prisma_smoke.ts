// scripts/prisma-smoke.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // quick connectivity check
  const version =
    (
      await prisma.$queryRawUnsafe<Array<{ version: string }>>(
        'select version() as version',
      )
    )[0]?.version ?? 'unknown';
  console.log('Connected to:', version);

  // optional: check your "questions" table (adjust to your model name)
  try {
    const count = await prisma.questions.count();
    const sample = await prisma.questions.findMany({
      orderBy: { updated_at: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        status: true,
        difficulty: true,
        updated_at: true,
      },
    });
    console.log('questions count =', count);
    console.table(sample);
  } catch (e) {
    console.warn('Skipped questions check (table/model may not exist yet).');
  }
}

main()
  .catch((e) => {
    console.error('Prisma smoke test failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

// src/repositories/prisma

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({
  adapter,
  log: [
    { level: 'error', emit: 'stdout' },
    { level: 'query', emit: 'stdout' },
  ],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// src/repositories/TopicRepository.ts

import { prisma } from './prisma';

export async function list() {
  return prisma.topics.findMany({
    select: { slug: true, display: true, color_hex: true },
    orderBy: { slug: 'asc' },
  });
}

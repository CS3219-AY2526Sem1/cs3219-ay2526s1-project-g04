// src/repositories/TopicRepository.ts

import { prisma } from './prisma';

export async function list() {
  return prisma.topics.findMany({
    select: { slug: true, display: true, color_hex: true },
    orderBy: { slug: 'asc' },
  });
}

export async function listPublished(difficulty: 'Easy' | 'Medium' | 'Hard') {
  return prisma.topics.findMany({
    where: {
      // at least one link to a published question
      question_topics: {
        some: { questions: { status: 'published', difficulty } },
      },
    },
    select: { slug: true, display: true, color_hex: true },
    orderBy: { slug: 'asc' },
  });
}

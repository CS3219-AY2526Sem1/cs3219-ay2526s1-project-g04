// src/repositories/QuestionRepository.ts

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { slugifyTitle } from '../utils/slug';

export async function getPublishedById(id: string) {
  return prisma.questions.findFirst({ where: { id, status: 'published' } });
}

export async function listPublished(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  size?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const size = Math.min(100, Math.max(1, opts.size ?? 20));
  const offset = (page - 1) * size;

  // Fast path — no search text and no topic filter → use Prisma
  if (!opts.q && !opts.topics?.length) {
    const where: Prisma.questionsWhereInput = {
      status: 'published',
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    };
    return prisma.questions.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: size,
    });
  }

  // FTS / topics path — parameterized SQL with explicit casts
  const clauses: string[] = ['status = $1'];
  const params: unknown[] = ['published'];
  let i = params.length + 1;

  if (opts.difficulty) {
    clauses.push(`difficulty = $${i++}`);
    params.push(opts.difficulty);
  }
  if (opts.topics?.length) {
    clauses.push(`topics ?| $${i++}::text[]`);
    params.push(opts.topics);
  }
  if (opts.q) {
    clauses.push(`tsv_en @@ plainto_tsquery('english', $${i++})`);
    params.push(opts.q);
  }

  const sql = `
    SELECT id, title, body_md, difficulty, topics, attachments,
         status, version, rand_key, created_at, updated_at
    FROM questions
    WHERE ${clauses.join(' AND ')}
    ORDER BY updated_at DESC
    LIMIT ${size} OFFSET ${offset}
  `;

  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      body_md: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      topics: unknown; // jsonb
      attachments: unknown; // jsonb
      status: 'draft' | 'published' | 'archived';
      version: number;
      rand_key: number;
      created_at: Date | null;
      updated_at: Date | null;
    }>
  >(sql, ...params);
}

export async function listAll(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  size?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const size = Math.min(100, Math.max(1, opts.size ?? 20));
  const offset = (page - 1) * size;

  // Fast path — no search text and no topic filter → use Prisma
  if (!opts.q && !opts.topics?.length) {
    const where: Prisma.questionsWhereInput = {
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    };
    return prisma.questions.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: size,
    });
  }

  // FTS / topics path — parameterized SQL with explicit casts
  const clauses: string[] = ['status = $1'];
  const params: unknown[] = [];
  let i = params.length + 1;

  if (opts.difficulty) {
    clauses.push(`difficulty = $${i++}`);
    params.push(opts.difficulty);
  }
  if (opts.topics?.length) {
    clauses.push(`topics ?| $${i++}::text[]`);
    params.push(opts.topics);
  }
  if (opts.q) {
    clauses.push(`tsv_en @@ plainto_tsquery('english', $${i++})`);
    params.push(opts.q);
  }

  const sql = `
    SELECT id, title, body_md, difficulty, topics, attachments,
         status, version, rand_key, created_at, updated_at
    FROM questions
    WHERE ${clauses.join(' AND ')}
    ORDER BY updated_at DESC
    LIMIT ${size} OFFSET ${offset}
  `;

  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      body_md: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      topics: unknown; // jsonb
      attachments: unknown; // jsonb
      status: 'draft' | 'published' | 'archived';
      version: number;
      rand_key: number;
      created_at: Date | null;
      updated_at: Date | null;
    }>
  >(sql, ...params);
}

export async function createDraft(q: {
  id?: string;
  title: string;
  body_md: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  attachments: unknown[];
}) {
  const base = slugifyTitle(q.title);
  const MAX_SUFFIX = 50;

  for (let n = 0; n <= MAX_SUFFIX; n += 1) {
    const id = n === 0 ? base : `${base}-${n + 1}`;
    try {
      return await prisma.questions.create({
        data: {
          id,
          title: q.title,
          body_md: q.body_md,
          difficulty:
            q.difficulty as unknown as Prisma.questionsCreateInput['difficulty'],
          topics: q.topics as unknown as Prisma.InputJsonValue,
          attachments: q.attachments as unknown as Prisma.InputJsonValue,
          status: 'draft',
          version: 1,
        },
      });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        continue;
      }
      throw err;
    }
  }

  throw new Error('Could not allocate a unique slug for this title');
}

export async function updateDraft(
  id: string,
  patch: Omit<Prisma.questionsUpdateInput, 'id'>,
) {
  try {
    return await prisma.questions.update({
      where: { id },
      data: {
        ...patch,
        updated_at: new Date(),
      },
    });
  } catch {
    return undefined;
  }
}

export async function publish(id: string) {
  return prisma.$transaction(async (tx) => {
    // load current draft
    const draft = await tx.questions.findUnique({ where: { id } });
    if (!draft || draft.status !== 'draft') return null;

    const newVersion = (draft.version ?? 1) + 1;

    // update live row to 'published' and bump version/rand_key
    const updated = await tx.questions.update({
      where: { id },
      data: {
        status: 'published',
        version: newVersion,
        rand_key: Math.random(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        title: true,
        body_md: true,
        difficulty: true,
        topics: true,
        attachments: true,
        status: true,
        version: true,
        rand_key: true,
        created_at: true,
        updated_at: true,
      },
    });

    // snapshot to question_versions
    await tx.question_versions.create({
      data: {
        id: updated.id,
        version: updated.version,
        title: updated.title,
        body_md: updated.body_md,
        difficulty: updated.difficulty,
        topics: updated.topics as unknown as Prisma.InputJsonValue,
        attachments: updated.attachments as unknown as Prisma.InputJsonValue,
        status: updated.status, // 'published'
        published_at: new Date(),
      },
    });

    return updated;
  });
}

// selection helper
export async function pickRandomEligible(filters: {
  difficulty?: string;
  topics?: string[];
  recentIds?: string[];
}) {
  const clauses: string[] = [`status = 'published'`];
  const params: unknown[] = [];
  let i = 1;

  if (filters.difficulty) {
    clauses.push(`difficulty = $${i++}`);
    params.push(filters.difficulty);
  }
  if (filters.topics?.length) {
    clauses.push(`topics ?| $${i++}::text[]`);
    params.push(filters.topics);
  }
  if (filters.recentIds?.length) {
    clauses.push(`NOT (id = ANY($${i++}::text[]))`);
    params.push(filters.recentIds);
  }

  const sql = `
    SELECT 
      id, title, body_md, difficulty, topics, attachments,
    status, version, rand_key, created_at, updated_at
    FROM questions
    WHERE ${clauses.join(' AND ')}
    ORDER BY rand_key
    LIMIT 1
  `;
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      body_md: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      topics: string[]; // jsonb
      attachments: unknown[]; // jsonb
      status: 'draft' | 'published' | 'archived';
      version: number;
      rand_key: number;
      created_at: Date;
      updated_at: Date;
    }>
  >(sql, ...params);

  return rows[0];
}

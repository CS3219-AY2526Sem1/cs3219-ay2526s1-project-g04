// src/repositories/QuestionRepository.ts

import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
import type { questions as Question } from '@prisma/client';
import { slugify } from '../utils/slug.js';
import type { AttachmentInput } from '../types/attachments.js';

export async function getPublishedById(id: string) {
  return prisma.questions.findFirst({
    where: { id, status: 'published' },
    select: {
      id: true,
      title: true,
      body_md: true,
      difficulty: true,
      status: true,
      version: true,
      attachments: true,
      created_at: true,
      updated_at: true,
      question_topics: {
        select: {
          topics: {
            select: {
              slug: true,
              color_hex: true,
            },
          },
        },
      },
    },
  });
}

export async function getQuestionById(id: string) {
  return prisma.questions.findFirst({ where: { id } });
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

  // simple filters (no full-text search case)
  if (!opts.q && !opts.topics?.length) {
    return prisma.questions.findMany({
      where: {
        status: 'published',
        ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
      },
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: size,
      select: {
        id: true,
        title: true,
        body_md: true,
        difficulty: true,
        status: true,
        version: true,
        attachments: true,
        created_at: true,
        updated_at: true,
        question_topics: {
          select: {
            topics: {
              select: {
                slug: true,
                color_hex: true,
              },
            },
          },
        },
      },
    });
  }

  return prisma.questions.findMany({
    where: {
      status: 'published',
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
      ...(opts.topics?.length
        ? {
            question_topics: {
              some: {
                topic_slug: { in: opts.topics },
              },
            },
          }
        : {}),
      // TODO: q full-text search, hook up `tsv_en` + raw query here
    },
    orderBy: { updated_at: 'desc' },
    skip: offset,
    take: size,
    select: {
      id: true,
      title: true,
      body_md: true,
      difficulty: true,
      status: true,
      version: true,
      attachments: true,
      created_at: true,
      updated_at: true,
      question_topics: {
        select: {
          topics: {
            select: {
              slug: true,
              color_hex: true,
            },
          },
        },
      },
    },
  });
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
  const clauses: string[] = [];
  const params: unknown[] = [];
  let i = 1;

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

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT id, title, body_md, difficulty, topics, attachments,
           status, version, rand_key, created_at, updated_at
    FROM questions
    ${whereSql}
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
  attachments: AttachmentInput[];
}) {
  const base = slugify(q.title);
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
    // 1) Update the source row and return the snapshot
    const updated = await tx
      .$queryRawUnsafe<Question[]>(
        `
        UPDATE questions
        SET status = 'published',
            version = version + 1,
            updated_at = now(),
            rand_key = random()
        WHERE id = $1
        RETURNING id, title, body_md, difficulty, topics, attachments,
         status, version, created_at, updated_at
        `,
        id,
      )
      .then((r) => r[0])
      .catch(() => undefined);

    if (!updated) return undefined;

    // 2) Normalize JSON fields for Prisma
    const topicsJson =
      (updated as unknown as { topics: unknown }).topics === null
        ? Prisma.JsonNull
        : ((updated as unknown as { topics: unknown })
            .topics as Prisma.InputJsonValue);

    const attachmentsJson =
      (updated as unknown as { attachments: unknown }).attachments === null
        ? Prisma.JsonNull
        : ((updated as unknown as { attachments: unknown })
            .attachments as Prisma.InputJsonValue);

    // 3) Insert into question_versions — ONLY fields that exist
    await tx.question_versions.create({
      data: {
        id: updated.id,
        version: updated.version,
        title: updated.title,
        body_md: updated.body_md,
        difficulty: updated.difficulty,
        topics: topicsJson,
        attachments: attachmentsJson,
        status: updated.status,
        published_at: new Date(),
      },
    });

    return updated;
  });
}

export async function pickRandomEligible(filters: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  excludeIds?: string[];
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
  if (filters.excludeIds?.length) {
    clauses.push(`NOT (id = ANY($${i++}::text[]))`);
    params.push(filters.excludeIds);
  }
  if (filters.recentIds?.length) {
    clauses.push(`NOT (id = ANY($${i++}::text[]))`);
    params.push(filters.recentIds);
  }

  const sql = `
    SELECT id, title, body_md, difficulty, topics, attachments,
         status, version, created_at, updated_at
    FROM questions
    WHERE ${clauses.length ? clauses.join(' AND ') : 'TRUE'}
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

export async function archive(id: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.questions.findUnique({ where: { id } });
    if (!current || current.status !== 'published') return null;

    const newVersion = (current.version ?? 1) + 1;

    const updated = await tx.questions.update({
      where: { id },
      data: {
        status: 'archived',
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
        status: true, // 'archived'
        version: true,
        rand_key: true,
        created_at: true,
        updated_at: true,
      },
    });
    await tx.question_versions.create({
      data: {
        id: updated.id,
        version: updated.version,
        title: updated.title,
        body_md: updated.body_md,
        difficulty: updated.difficulty,
        topics: updated.topics as Prisma.InputJsonValue, // jsonb
        attachments: updated.attachments as Prisma.InputJsonValue,
        status: updated.status, // 'archived'
        published_at: null, // archived snapshot → no publish time
      },
    });

    return updated;
  });
}

export async function updateQuestionAttachments(
  id: string,
  attachments: AttachmentInput[],
) {
  return prisma.questions.update({
    where: { id },
    data: { attachments: attachments as unknown as Prisma.InputJsonValue },
  });
}

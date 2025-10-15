// src/repositories/QuestionRepository.ts

import { prisma } from './prisma';
import { Prisma, questions as Question } from '@prisma/client';
import { slugifyTitle } from '../utils/slug';

export async function getPublishedById(id: string) {
  return prisma.questions.findFirst({ where: { id, status: 'Published' } });
}

export async function listPublished(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  size?: number;
}) {
  const page = Math.max(1, opts.page || 1);
  const size = Math.min(100, Math.max(1, opts.size || 20));
  const offset = (page - 1) * size;

  // fast path: no search text and no topic filter -> use prisma
  if (!opts.q && !opts.topics?.length) {
    const where: Prisma.questionsWhereInput = {
      status: 'Published',
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    };
    return prisma.questions.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: size,
    });
  }

  // fts / topics path -- parameterized sql
  const clauses: string[] = ['status = $1'];
  const params: (string | string[])[] = ['Published'];
  let i = params.length + 1;

  if (opts.difficulty) {
    clauses.push(`difficulty = $${i++}`);
    params.push(opts.difficulty);
  }
  if (opts.topics?.length) {
    // jsonb ?| needs text[]; cast the placeholder
    clauses.push(`topics ?| $${i++}::text[]`);
    params.push(opts.topics);
  }
  if (opts.q) {
    clauses.push(`tsv_en @@ plainto_tsquery('english', $${i++})`);
    params.push(opts.q);
  }

  const sql = `
    SELECT *
    FROM questions
    WHERE ${clauses.join(' AND ')}
    ORDER BY updated_at DESC
    LIMIT ${size} OFFSET ${offset}
  `;

  return prisma.$queryRawUnsafe<Question[]>(sql, ...params);
}

export async function createDraft(q: {
  id: string;
  title: string;
  body_md: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  attachments: unknown[];
}) {
  const base = slugifyTitle(q.title);

  const MAX_SUFFIX = 50;
  for (let n = 0; n <= MAX_SUFFIX; n++) {
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
          status: 'Draft',
          version: 1,
        },
      });
    } catch (err: any) {
      // unique violation on PK id -> try next suffix
      if (
        err?.code === 'P2002' ||
        (err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002')
      ) {
        continue;
      }
      // any other DB error -> surface it
      throw err;
    }
    throw new Error('Could not allocate a unique slug for this title');
  }
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
    const updated = await tx
      .$queryRawUnsafe<any[]>(
        `UPDATE questions
         SET status='Published',
             version = version + 1,
             updated_at = now(),
             rand_key = random()
         WHERE id=$1
         RETURNING *`,
        id,
      )
      .then((r) => r[0])
      .catch(() => undefined);

    if (!updated) return undefined;

    await tx.question_versions.create({
      data: {
        id: updated.id,
        version: updated.version,
        title: updated.title,
        body_md: updated.body_md,
        topics: updated.topics,
        attachments: updated.attachments,
        status: updated.status,
        rand_key: updated.rand_key,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        published_at: new Date(),
      },
    });

    return updated;
  });
}

export async function pickRandomEligible(*filters: {
  difficulty?: string;
  topics?: string[];
  excludeIds?: string[];
  recentIds?: string[];
}) {
  const wh: string[] = [`status='Published'`];
  const params: any[] = [];
  let i = 1;

  if (filters.difficulty) { wh.push(`difficulty=$${i++}`); params.push(filters.difficulty); }
  if (filters.topics?.length) { wh.push(`topics ?| $${i++}`); params.push(filters.topics); }
  if (filters.excludeIds?.length) { wh.push(`NOT (id = ANY($${i++}))`); params.push(filters.excludeIds); }
  if (filters.recentIds?.length) { wh.push(`NOT (id = ANY($${i++}))`); params.push(filters.recentIds); }

  const sql = `
    SELECT * FROM questions
    WHERE ${wh.join(" AND ")}
    ORDER BY rand_key
    LIMIT 50
  `;
  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);
  return rows[0];
}

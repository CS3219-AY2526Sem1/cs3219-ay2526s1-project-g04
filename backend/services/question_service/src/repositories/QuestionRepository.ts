// src/repositories/QuestionRepository.ts

import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';
import type {
  questions as Question,
  question_test_cases as QuestionTestCase,
  question_python_starter as QuestionStarter,
} from '@prisma/client';
import { slugify } from '../utils/slug.js';
import type { AttachmentInput } from '../types/attachments.js';

function isoOrNow(v: Date | string | null | undefined): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return new Date().toISOString();
}

async function upsertStarterCode(
  questionId: string,
  starterCode: string | undefined,
) {
  if (starterCode === undefined) return; // means caller didnt mention it

  // if explicitly send empty string, we persist empty string
  await prisma.question_python_starter.upsert({
    where: { question_id: questionId },
    update: { starter_code: starterCode },
    create: { question_id: questionId, starter_code: starterCode },
  });
}

type IncomingTestCase = {
  visibility: 'sample' | 'hidden';
  input_data: string;
  expected_output: string;
  ordinal?: number;
};

async function replaceTestCases(
  questionId: string,
  casesInput: IncomingTestCase[] | undefined,
) {
  if (casesInput === undefined) return; // not provided -> dont edit

  // when we update test cases: wipe all rows, then bulk insert new list (if any)
  await prisma.question_test_cases.deleteMany({
    where: { question_id: questionId },
  });

  if (!casesInput.length) return;

  await prisma.question_test_cases.createMany({
    data: casesInput.map((tc, idx) => ({
      question_id: questionId,
      visibility: tc.visibility,
      input_data: tc.input_data,
      expected_output: tc.expected_output,
      ordinal: tc.ordinal ?? idx,
    })),
  });
}

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
              display: true,
              color_hex: true,
            },
          },
        },
      },
    },
  });
}

export async function getQuestionById(id: string) {
  return prisma.questions.findFirst({
    where: { id },
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
              display: true,
              color_hex: true,
            },
          },
        },
      },
    },
  });
}

export async function listPublished(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  page_size?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const page_size = Math.min(100, Math.max(1, opts.page_size ?? 20));
  const offset = (page - 1) * page_size;

  // simple filters (no full-text search case)
  if (!opts.q && !opts.topics?.length) {
    return prisma.questions.findMany({
      where: {
        status: 'published',
        ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
      },
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: page_size,
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
                display: true,
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
    take: page_size,
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
  page_size?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const page_size = Math.min(100, Math.max(1, opts.page_size ?? 20));
  const offset = (page - 1) * page_size;

  const where: Prisma.questionsWhereInput = {
    ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),

    // topics filter (if provided)
    ...(opts.topics?.length
      ? {
          question_topics: {
            some: {
              topic_slug: { in: opts.topics },
            },
          },
        }
      : {}),

    // q filter (very naive for now: match title OR body_md contains substring, case-insensitive)
    ...(opts.q
      ? {
          OR: [
            { title: { contains: opts.q, mode: 'insensitive' } },
            { body_md: { contains: opts.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return prisma.questions.findMany({
    where,
    orderBy: { updated_at: 'desc' },
    skip: offset,
    take: page_size,
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
              display: true,
              color_hex: true,
            },
          },
        },
      },
    },
  });
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

export async function createDraftWithResources(q: {
  title: string;
  body_md: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  attachments: AttachmentInput[];
  starter_code?: string;
  test_cases?: IncomingTestCase[];
}) {
  // create base draft question
  const created = await createDraft({
    title: q.title,
    body_md: q.body_md,
    difficulty: q.difficulty,
    topics: q.topics,
    attachments: q.attachments,
  });

  const questionId = created.id;

  // upsert starter code
  await upsertStarterCode(questionId, q.starter_code);

  // insert test cases
  await replaceTestCases(questionId, q.test_cases);

  return created;
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

export async function updateDraftWithResources(
  id: string,
  patch: {
    title?: string;
    body_md?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    topics?: string[];
    attachments?: AttachmentInput[];
    starter_code?: string;
    test_cases?: IncomingTestCase[];
  },
) {
  // build Prisma.questionsUpdateInput from the provided patch
  const data: Prisma.questionsUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.body_md !== undefined) data.body_md = patch.body_md;
  if (patch.difficulty !== undefined) data.difficulty = patch.difficulty;
  if (patch.attachments !== undefined) {
    data.attachments = patch.attachments as unknown as Prisma.InputJsonValue;
  }
  if (patch.topics !== undefined) {
    data.topics = patch.topics as unknown as Prisma.InputJsonValue;
  }

  const updated = await updateDraft(id, data);
  if (!updated) return undefined;

  // 2. upsert starter code if included in payload
  await upsertStarterCode(id, patch.starter_code);

  // 3. replace test cases if included in payload
  await replaceTestCases(id, patch.test_cases);

  // 4. if topics[] was provided, also sync the join table
  if (patch.topics !== undefined) {
    // nuke old mappings
    await prisma.question_topics.deleteMany({
      where: { question_id: id },
    });

    if (patch.topics.length) {
      await prisma.question_topics.createMany({
        data: patch.topics.map((slug) => ({
          question_id: id,
          topic_slug: slug,
        })),
      });
    }
  }

  return updated;
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

/**
 * Read starter_code + SAMPLE test cases for a *published* question.
 * This is what we expose to normal clients / students.
 *
 * Returns null if:
 *   - question doesn't exist
 *   - OR question is not published
 */
export async function getPublicResourcesBundle(questionId: string) {
  // check published question basics
  const q = await prisma.questions.findFirst({
    where: { id: questionId, status: 'published' },
    select: {
      id: true,
      updated_at: true,
    },
  });
  if (!q) return null;

  // pull python starter (may not exist for sql-only questions)
  const starterRow: QuestionStarter | null =
    await prisma.question_python_starter.findUnique({
      where: { question_id: questionId },
    });

  // pull only SAMPLE test cases
  const sampleCases: QuestionTestCase[] =
    await prisma.question_test_cases.findMany({
      where: {
        question_id: questionId,
        visibility: 'sample',
      },
      orderBy: { ordinal: 'asc' },
    });

  return {
    question_id: q.id,
    starter_code: starterRow ? { python: starterRow.starter_code } : {},
    test_cases: sampleCases.map((tc) => ({
      name: `case-${tc.ordinal}`,
      visibility: tc.visibility,
      input: tc.input_data,
      expected: tc.expected_output,
      ordinal: tc.ordinal,
    })),
    updated_at: isoOrNow(q.updated_at),
  };
}

/**
 * Read starter_code + ALL test cases (sample + hidden) for ANY status.
 * This is what we expose to admin/service (judge, matching worker, etc.).
 *
 * Returns null if question_id doesn't exist at all.
 */
export async function getInternalResourcesBundle(questionId: string) {
  const q = await prisma.questions.findFirst({
    where: { id: questionId },
    select: {
      id: true,
      status: true,
      updated_at: true,
    },
  });
  if (!q) return null;

  const starterRow: QuestionStarter | null =
    await prisma.question_python_starter.findUnique({
      where: { question_id: questionId },
    });

  const allCases: QuestionTestCase[] =
    await prisma.question_test_cases.findMany({
      where: { question_id: questionId },
      orderBy: { ordinal: 'asc' },
    });

  return {
    question_id: q.id,
    status: q.status,
    starter_code: starterRow ? { python: starterRow.starter_code } : {},
    test_cases: allCases.map((tc) => ({
      name: `case-${tc.ordinal}`,
      visibility: tc.visibility, // includes 'hidden'
      input: tc.input_data,
      expected: tc.expected_output,
      ordinal: tc.ordinal,
    })),
    updated_at: isoOrNow(q.updated_at),
  };
}

export async function getPublishedManyById(ids: string[]) {
  if (!ids.length) return [];

  const rows = await prisma.questions.findMany({
    where: {
      id: { in: ids },
      status: 'published',
    },
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

  return rows;
}

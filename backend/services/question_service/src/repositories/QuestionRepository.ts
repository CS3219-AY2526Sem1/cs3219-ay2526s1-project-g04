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

/** Renumbers to contiguous ascending ordinals (1..n).
 *  Why: prevents gaps/dupes from client payloads. */
function sanitizeAndRenumberTestCases(
  casesInput: IncomingTestCase[],
): Array<IncomingTestCase & { ordinal: number }> {
  const decorated = casesInput.map((tc, idx) => {
    const validInt =
      typeof tc.ordinal === 'number' &&
      Number.isFinite(tc.ordinal) &&
      Math.floor(tc.ordinal) === tc.ordinal &&
      tc.ordinal > 0;
    const sortKey = validInt
      ? (tc.ordinal as number)
      : Number.POSITIVE_INFINITY;
    return { tc, idx, sortKey };
  });

  decorated.sort((a, b) =>
    a.sortKey !== b.sortKey ? a.sortKey - b.sortKey : a.idx - b.idx,
  );

  return decorated.map((item, i) => ({ ...item.tc, ordinal: i + 1 }));
}

async function replaceTestCases(
  questionId: string,
  casesInput: IncomingTestCase[] | undefined,
) {
  if (casesInput === undefined) return;

  await prisma.question_test_cases.deleteMany({
    where: { question_id: questionId },
  });
  if (!casesInput.length) return;

  const normalized = sanitizeAndRenumberTestCases(casesInput);

  await prisma.question_test_cases.createMany({
    data: normalized.map((tc) => ({
      question_id: questionId,
      visibility: tc.visibility,
      input_data: tc.input_data,
      expected_output: tc.expected_output,
      ordinal: tc.ordinal, // always 1..n
    })),
  });
}

const commonSelect = {
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
};

export async function getPublishedById(id: string) {
  return prisma.questions.findFirst({
    where: { id, status: 'published' },
    select: commonSelect,
  });
}

export async function getQuestionById(id: string) {
  return prisma.questions.findFirst({
    where: { id },
    select: commonSelect,
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

  // ============== Fast path: no FTS needed ==============
  if (!opts.q && !opts.topics?.length) {
    const where = {
      status: 'published' as const,
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.questions.count({ where }),
      prisma.questions.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip: offset,
        take: page_size,
        select: commonSelect,
      }),
    ]);
    return { rows, total };
  }

  //  Full-Text Search path (q present)
  if (opts.q) {
    type Row = {
      id: string;
      title: string;
      body_md: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      status: 'draft' | 'published' | 'archived';
      version: number;
      attachments: unknown;
      created_at: Date;
      updated_at: Date;
      question_topics: Array<{
        topics: { slug: string; display: string; color_hex: string };
      }>;
    };

    // Dynamic SQL parts
    const whereClauses: string[] = [
      `q.status = 'published'`,
      `q.tsv_en @@ websearch_to_tsquery('english', $1)`,
    ];
    const params: unknown[] = [opts.q]; // $1

    let paramIdx = params.length + 1; // next parameter index

    if (opts.difficulty) {
      whereClauses.push(`q.difficulty = $${paramIdx++}`);
      params.push(opts.difficulty);
    }

    if (opts.topics?.length) {
      // Filter: at least one topic matches
      whereClauses.push(
        `EXISTS (SELECT 1 FROM question_topics qt2 WHERE qt2.question_id = q.id AND qt2.topic_slug = ANY($${paramIdx++}::text[]))`,
      );
      params.push(opts.topics);
    }

    // COUNT(*) with same WHERE (no LIMIT/OFFSET)
    const countSql = `
      SELECT COUNT(*)::int AS cnt
      FROM questions q
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countResult = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      countSql,
      ...params,
    );
    const total = countResult[0]?.cnt ?? 0;

    // Paged SELECT
    const limitIdx = paramIdx++;
    const offsetIdx = paramIdx++;
    params.push(page_size, offset);

    const sql = `
      WITH qmatch AS (
        SELECT
          q.*,
          ts_rank_cd(q.tsv_en, websearch_to_tsquery('english', $1)) AS rank
        FROM questions q
        WHERE ${whereClauses.join(' AND ')}
      )
      SELECT
        qm.id,
        qm.title,
        qm.body_md,
        qm.difficulty,
        qm.status,
        qm.version,
        qm.attachments,
        qm.created_at,
        qm.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'topics', json_build_object(
                'slug', t.slug,
                'display', t.display,
                'color_hex', t.color_hex
              )
            )
          ) FILTER (WHERE t.slug IS NOT NULL),
          '[]'::json
        ) AS question_topics
      FROM qmatch qm
      LEFT JOIN question_topics qt ON qt.question_id = qm.id
      LEFT JOIN topics t ON t.slug = qt.topic_slug
      GROUP BY
        qm.id, qm.title, qm.body_md, qm.difficulty, qm.status, qm.version, qm.attachments, qm.created_at, qm.updated_at, qm.rank
      ORDER BY
        qm.rank DESC,
        qm.updated_at DESC
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx};
    `;

    const rows = await prisma.$queryRawUnsafe<Row[]>(sql, ...params);
    return { rows, total };
  }

  // topics-only filter
  const whereTopicsOnly: Prisma.questionsWhereInput = {
    status: 'published',
    ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    ...(opts.topics?.length
      ? { question_topics: { some: { topic_slug: { in: opts.topics } } } }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.questions.count({ where: whereTopicsOnly }),
    prisma.questions.findMany({
      where: whereTopicsOnly,
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: page_size,
      select: commonSelect,
    }),
  ]);

  return { rows, total };
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

  // ========= FTS path when q is present =========
  if (opts.q) {
    type Row = {
      id: string;
      title: string;
      body_md: string;
      difficulty: 'Easy' | 'Medium' | 'Hard';
      status: 'draft' | 'published' | 'archived';
      version: number;
      attachments: unknown;
      created_at: Date;
      updated_at: Date;
      question_topics: Array<{
        topics: { slug: string; display?: string; color_hex: string };
      }>;
    };

    const whereClauses: string[] = [
      `q.tsv_en @@ websearch_to_tsquery('english', $1)`,
    ];
    const params: unknown[] = [opts.q]; // $1
    let i = 2;

    if (opts.difficulty) {
      whereClauses.push(`q.difficulty = $${i}`);
      params.push(opts.difficulty);
      i += 1;
    }

    if (opts.topics?.length) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM question_topics qt2 WHERE qt2.question_id = q.id AND qt2.topic_slug = ANY($${i}::text[]))`,
      );
      params.push(opts.topics);
      i += 1;
    }

    const countSql = `
      SELECT COUNT(*)::int AS cnt
      FROM questions q
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countResult = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      countSql,
      ...params,
    );
    const total = countResult[0]?.cnt ?? 0;

    const limitIdx = i++;
    const offsetIdx = i++;
    params.push(page_size, offset);

    const sql = `
      WITH qmatch AS (
        SELECT
          q.*,
          ts_rank_cd(q.tsv_en, websearch_to_tsquery('english', $1)) AS rank
        FROM questions q
        WHERE ${whereClauses.join(' AND ')}
      )
      SELECT
        qm.id,
        qm.title,
        qm.body_md,
        qm.difficulty,
        qm.status,
        qm.version,
        qm.attachments,
        qm.created_at,
        qm.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'topics', json_build_object(
                'slug', t.slug,
                'display', t.display,
                'color_hex', t.color_hex
              )
            )
          ) FILTER (WHERE t.slug IS NOT NULL),
          '[]'::json
        ) AS question_topics
      FROM qmatch qm
      LEFT JOIN question_topics qt ON qt.question_id = qm.id
      LEFT JOIN topics t ON t.slug = qt.topic_slug
      GROUP BY
        qm.id, qm.title, qm.body_md, qm.difficulty, qm.status, qm.version, qm.attachments, qm.created_at, qm.updated_at, qm.rank
      ORDER BY
        qm.rank DESC,
        qm.updated_at DESC
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx};
    `;

    const rows = await prisma.$queryRawUnsafe<Row[]>(sql, ...params);
    return { rows, total };
  }

  // ========= No q: keep Prisma path (topics/difficulty filters only) =========
  const where: Prisma.questionsWhereInput = {
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
  };

  const [total, rows] = await Promise.all([
    prisma.questions.count({ where }),
    prisma.questions.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip: offset,
      take: page_size,
      select: commonSelect,
    }),
  ]);

  return { rows, total };
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

export async function update(
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

export async function updateWithResources(
  id: string,
  patch: {
    title?: string;
    body_md?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    status?: 'draft' | 'published' | 'archived';
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
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.difficulty !== undefined) data.difficulty = patch.difficulty;
  if (patch.attachments !== undefined) {
    data.attachments = patch.attachments as unknown as Prisma.InputJsonValue;
  }
  if (patch.topics !== undefined) {
    data.topics = patch.topics as unknown as Prisma.InputJsonValue;
  }

  const updated = await update(id, data);
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
    // Allow publishing from 'draft' or 'archived' (but not if already published)
    const current = await tx.questions.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        version: true,
        title: true,
        body_md: true,
        difficulty: true,
        topics: true,
        attachments: true,
      },
    });
    if (!current) return undefined;
    if (current.status !== 'draft' && current.status !== 'archived') {
      // already published or invalid state → signal not publishable
      return undefined;
    }

    // Promote to published + bump version
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

    // Normalize JSON for Prisma
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

    // Snapshot to question_versions with published_at set
    await tx.question_versions.create({
      data: {
        id: updated.id,
        version: updated.version,
        title: updated.title,
        body_md: updated.body_md,
        difficulty: updated.difficulty,
        topics: topicsJson,
        attachments: attachmentsJson,
        status: updated.status, // 'published'
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
      input_data: tc.input_data,
      expected_output: tc.expected_output,
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
      input_data: tc.input_data,
      expected_output: tc.expected_output,
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
    select: commonSelect,
  });

  return rows;
}

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  beforeAll,
} from '@jest/globals';

type MockFn = jest.Mock<any, any>;

// Will be set after dynamic import
let Repo: typeof import('../../src/repositories/QuestionRepository.js');
let slug: typeof import('../../src/utils/slug.js');
let prisma: any;

// Build a reusable prisma mock shape that matches our repository usage
const makePrismaMock = () => ({
  $transaction: jest.fn(),
  $queryRawUnsafe: jest.fn(),
  questions: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  question_python_starter: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  question_test_cases: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  question_versions: {
    create: jest.fn(),
  },
  question_topics: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  topics: {
    // not used directly here, but keep for safety
    findMany: jest.fn(),
  },
});

beforeAll(async () => {
  // Mock slugify for deterministic IDs
  await jest.unstable_mockModule('../../src/utils/slug.js', () => ({
    __esModule: true,
    slugify: jest.fn((t: string) =>
      t
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    ),
  }));

  // Mock prisma client module
  const prismaMock = makePrismaMock();
  await jest.unstable_mockModule('../../src/repositories/prisma.js', () => ({
    __esModule: true,
    prisma: prismaMock,
  }));

  // Import AFTER mocks are registered
  Repo = await import('../../src/repositories/QuestionRepository.js');
  slug = await import('../../src/utils/slug.js');
  ({ prisma } = await import('../../src/repositories/prisma.js'));
});

beforeEach(() => {
  // reset all prisma mocks
  for (const k of Object.keys(prisma)) {
    const v = prisma[k];
    if (typeof v === 'function') (v as MockFn).mockReset?.();
    else if (typeof v === 'object' && v !== null) {
      for (const kk of Object.keys(v)) {
        (v as any)[kk]?.mockReset?.();
      }
    }
  }
  (slug.slugify as jest.Mock).mockClear();
});

// ───────────────────────────────────────────────────────────────────────────────
// listPublished: fast path (no q, no topics)
describe('listPublished (fast path)', () => {
  it('returns rows/total with status=published and optional difficulty', async () => {
    prisma.questions.count.mockResolvedValue(1);
    prisma.questions.findMany.mockResolvedValue([{ id: 'q1' }]);

    const out = await Repo.listPublished({
      difficulty: 'Easy',
      page: 1,
      page_size: 20,
    });

    expect(prisma.questions.count).toHaveBeenCalledWith({
      where: { status: 'published', difficulty: 'Easy' },
    });
    expect(prisma.questions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'published', difficulty: 'Easy' },
        orderBy: { updated_at: 'desc' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
      }),
    );
    expect(out).toEqual({ rows: [{ id: 'q1' }], total: 1 });
  });
});

// listPublished: FTS path (q present)
describe('listPublished (FTS path)', () => {
  it('uses $queryRawUnsafe for count and select; applies filters & paging', async () => {
    // count returns [{cnt: 2}]
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ cnt: 2 }]) // count
      .mockResolvedValueOnce([
        {
          id: 'q2',
          title: 'Two Sum',
          body_md: '...',
          difficulty: 'Easy',
          status: 'published',
          version: 2,
          attachments: [],
          created_at: new Date(),
          updated_at: new Date(),
          question_topics: [],
        },
      ]); // rows

    const out = await Repo.listPublished({
      q: 'two sum',
      topics: ['arrays'],
      difficulty: 'Easy',
      page: 2,
      page_size: 5,
    });

    // Two calls (count and select)
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);

    // First call: COUNT(*) with params [q, difficulty, topics]
    const [countSql, ...countParams] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(typeof countSql).toBe('string');
    expect(countSql).toMatch(/SELECT COUNT\(\*\)::int AS cnt/i);
    expect(countParams).toEqual(['two sum', 'Easy', ['arrays']]);

    // Second call: SELECT with LIMIT/OFFSET appended
    const [selSql, ...selParams] = prisma.$queryRawUnsafe.mock.calls[1];
    expect(selSql).toMatch(/WITH qmatch AS \(/);
    // Params: [q, difficulty, topics, page_size, offset]
    expect(selParams).toEqual(['two sum', 'Easy', ['arrays'], 5, 5]); // offset = (2-1)*5

    expect(out.total).toBe(2);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].id).toBe('q2');
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// listAll: FTS path with q
describe('listAll (FTS path)', () => {
  it('performs raw FTS when q is present', async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ cnt: 1 }]) // count
      .mockResolvedValueOnce([
        {
          id: 'q10',
          title: 'Binary Search',
          body_md: '',
          difficulty: 'Medium',
          status: 'published',
          version: 3,
          attachments: [],
          created_at: new Date(),
          updated_at: new Date(),
          question_topics: [],
        },
      ]);

    const out = await Repo.listAll({
      q: 'binary search',
      page: 1,
      page_size: 10,
    });

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    const [csql, ...cparams] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(csql).toMatch(/SELECT COUNT\(\*\)::int AS cnt/i);
    expect(cparams).toEqual(['binary search']);

    const [ssql, ...sparams] = prisma.$queryRawUnsafe.mock.calls[1];
    expect(ssql).toMatch(/WITH qmatch AS \(/);
    expect(sparams).toEqual(['binary search', 10, 0]);
    expect(out.total).toBe(1);
    expect(out.rows[0].id).toBe('q10');
  });
});

// listAll: Prisma path when no q
describe('listAll (no q → Prisma filters)', () => {
  it('uses Prisma findMany/count with topics/difficulty filters', async () => {
    prisma.questions.count.mockResolvedValue(2);
    prisma.questions.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const out = await Repo.listAll({
      difficulty: 'Hard',
      topics: ['graphs', 'dfs'],
      page: 3,
      page_size: 10,
    });

    expect(prisma.questions.count).toHaveBeenCalledWith({
      where: {
        difficulty: 'Hard',
        question_topics: { some: { topic_slug: { in: ['graphs', 'dfs'] } } },
      },
    });
    expect(prisma.questions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          difficulty: 'Hard',
          question_topics: { some: { topic_slug: { in: ['graphs', 'dfs'] } } },
        },
        skip: 20,
        take: 10,
      }),
    );
    expect(out.total).toBe(2);
    expect(out.rows).toHaveLength(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// createDraft: slug collision → fallback id suffix
describe('createDraft (slug collision fallback)', () => {
  it('retries when Prisma throws P2002 and generates suffixed id', async () => {
    (slug.slugify as jest.Mock).mockReturnValueOnce('two-sum');

    // Build an object that passes instanceof check for PrismaKnownError
    // by borrowing the prototype (works in tests without constructing it).
    const p2002: any = { code: 'P2002' };
    const { Prisma } = await import('@prisma/client');
    Object.setPrototypeOf(
      p2002,
      (Prisma as any).PrismaClientKnownRequestError?.prototype ??
        Error.prototype,
    );

    // First create throws unique violation, second succeeds
    prisma.questions.create
      .mockRejectedValueOnce(p2002)
      .mockResolvedValueOnce({ id: 'two-sum-2', title: 'Two Sum' });

    const created = await Repo.createDraft({
      title: 'Two Sum',
      body_md: '...',
      difficulty: 'Easy',
      topics: [],
      attachments: [],
    });

    expect(prisma.questions.create).toHaveBeenCalledTimes(2);
    // first attempt with id 'two-sum'
    expect(prisma.questions.create.mock.calls[0][0].data.id).toBe('two-sum');
    // retry used id 'two-sum-2'
    expect(prisma.questions.create.mock.calls[1][0].data.id).toBe('two-sum-2');
    expect(created.id).toBe('two-sum-2');
  });
});

// createDraftWithResources wires starter_code + test_cases
describe('createDraftWithResources', () => {
  it('creates draft then upserts starter and replaces test cases', async () => {
    prisma.questions.create.mockResolvedValue({ id: 'qX' });

    const starter = 'def solve(): pass';
    const tcs = [
      { visibility: 'sample', input_data: '1', expected_output: '2' },
      {
        visibility: 'hidden',
        input_data: '2',
        expected_output: '3',
        ordinal: 5,
      },
    ];

    // replaceTestCases path: deleteMany + createMany called
    prisma.question_test_cases.deleteMany.mockResolvedValue({ count: 2 });
    prisma.question_test_cases.createMany.mockResolvedValue({ count: 2 });

    const out = await Repo.createDraftWithResources({
      title: 'X',
      body_md: 'B',
      difficulty: 'Easy',
      topics: [],
      attachments: [],
      starter_code: starter,
      test_cases: tcs as any,
    });

    expect(out.id).toBe('qX');
    expect(prisma.question_python_starter.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { question_id: 'qX' },
        update: { starter_code: starter },
        create: { question_id: 'qX', starter_code: starter },
      }),
    );
    // delete old then create normalized (ordinal 1..n)
    expect(prisma.question_test_cases.deleteMany).toHaveBeenCalledWith({
      where: { question_id: 'qX' },
    });
    const data = prisma.question_test_cases.createMany.mock.calls[0][0].data;
    expect(data.map((d: any) => d.ordinal)).toEqual([1, 2]);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// updateWithResources: early return & topic join sync
describe('updateWithResources', () => {
  it('returns undefined if base update fails', async () => {
    prisma.questions.update.mockRejectedValue(new Error('fail'));

    const res = await Repo.updateWithResources('id1', { title: 'T' });
    expect(res).toBeUndefined();
    expect(prisma.question_python_starter.upsert).not.toHaveBeenCalled();
    expect(prisma.question_test_cases.deleteMany).not.toHaveBeenCalled();
  });

  it('applies starter_code, test_cases and syncs topic join when topics provided', async () => {
    prisma.questions.update.mockResolvedValue({ id: 'id2' });

    const res = await Repo.updateWithResources('id2', {
      title: 'New',
      starter_code: 'print("hi")',
      test_cases: [
        { visibility: 'sample', input_data: 'a', expected_output: 'b' },
      ],
      topics: ['arrays', 'dp'],
    });

    expect(res).toEqual({ id: 'id2' });

    // starter code upsert
    expect(prisma.question_python_starter.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { question_id: 'id2' } }),
    );

    // test cases replaced
    expect(prisma.question_test_cases.deleteMany).toHaveBeenCalledWith({
      where: { question_id: 'id2' },
    });
    expect(prisma.question_test_cases.createMany).toHaveBeenCalled();

    // join table sync
    expect(prisma.question_topics.deleteMany).toHaveBeenCalledWith({
      where: { question_id: 'id2' },
    });
    expect(prisma.question_topics.createMany).toHaveBeenCalledWith({
      data: [
        { question_id: 'id2', topic_slug: 'arrays' },
        { question_id: 'id2', topic_slug: 'dp' },
      ],
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// publish flow
describe('publish', () => {
  it('returns undefined when not draft/archived', async () => {
    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        questions: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'q1', status: 'published', version: 1 }),
        },
      }),
    );

    const out = await Repo.publish('q1');
    expect(out).toBeUndefined();
  });

  it('promotes draft to published, bumps version, snapshots to question_versions', async () => {
    const tx = {
      questions: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'q1',
          status: 'draft',
          version: 1,
          title: 'T',
          body_md: 'B',
          difficulty: 'Easy',
          topics: ['a'],
          attachments: [],
        }),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          id: 'q1',
          title: 'T',
          body_md: 'B',
          difficulty: 'Easy',
          topics: ['a'],
          attachments: [],
          status: 'published',
          version: 2,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]),
      question_versions: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const out = await Repo.publish('q1');

    expect(tx.$queryRawUnsafe).toHaveBeenCalled();
    expect(tx.question_versions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'q1',
          version: 2,
          status: 'published',
          published_at: expect.any(Date),
        }),
      }),
    );
    expect(out?.status).toBe('published');
    expect(out?.version).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// archive flow
describe('archive', () => {
  it('archives only if currently published and snapshots', async () => {
    const now = new Date();

    const tx = {
      questions: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'q9',
          status: 'published',
          version: 4,
        }),
        update: jest.fn().mockResolvedValue({
          id: 'q9',
          title: 'T',
          body_md: 'B',
          difficulty: 'Hard',
          topics: ['x'],
          attachments: [],
          status: 'archived',
          version: 5,
          rand_key: 0.1,
          created_at: now,
          updated_at: now,
        }),
      },
      question_versions: {
        create: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
    const out = await Repo.archive('q9');

    expect(tx.questions.update).toHaveBeenCalled();
    expect(tx.question_versions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: 'q9',
          version: 5,
          status: 'archived',
          published_at: null,
        }),
      }),
    );
    expect(out?.status).toBe('archived');
  });

  it('returns null when question not published', async () => {
    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        questions: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'q0', status: 'draft' }),
        },
      }),
    );

    const out = await Repo.archive('q0');
    expect(out).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// pickRandomEligible: parameter order & filters
describe('pickRandomEligible', () => {
  it('builds SQL with filters in correct param order', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'pick-1',
        title: 'Picked',
        body_md: '',
        difficulty: 'Medium',
        topics: [],
        attachments: [],
        status: 'published',
        version: 1,
        rand_key: 0.5,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const out = await Repo.pickRandomEligible({
      difficulty: 'Medium',
      topics: ['arrays', 'dp'],
      excludeIds: ['a'],
      recentIds: ['b', 'c'],
    });

    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(sql).toMatch(/ORDER BY rand_key\s+LIMIT 1/i);
    // Param order must match the appending order in the repo
    expect(params).toEqual(['Medium', ['arrays', 'dp'], ['a'], ['b', 'c']]);
    expect(out.id).toBe('pick-1');
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// getPublicResourcesBundle
describe('getPublicResourcesBundle', () => {
  it('returns null when question not published', async () => {
    prisma.questions.findFirst.mockResolvedValue(null);
    const out = await Repo.getPublicResourcesBundle('nope');
    expect(out).toBeNull();
  });

  it('returns starter_code and ONLY sample test_cases with iso updated_at', async () => {
    const updatedAt = new Date('2020-01-01T00:00:00.000Z');

    prisma.questions.findFirst.mockResolvedValue({
      id: 'qpub',
      updated_at: updatedAt,
    });
    prisma.question_python_starter.findUnique.mockResolvedValue({
      question_id: 'qpub',
      starter_code: 'print("hi")',
    });
    prisma.question_test_cases.findMany.mockResolvedValue([
      {
        ordinal: 1,
        visibility: 'sample',
        input_data: '1',
        expected_output: '2',
      },
      {
        ordinal: 2,
        visibility: 'sample',
        input_data: '3',
        expected_output: '4',
      },
    ]);

    const out = await Repo.getPublicResourcesBundle('qpub');
    expect(out).toEqual(
      expect.objectContaining({
        question_id: 'qpub',
        starter_code: 'print("hi")',
        updated_at: updatedAt.toISOString(),
      }),
    );
    expect(out.test_cases).toHaveLength(2);
    expect(out.test_cases[0]).toEqual(
      expect.objectContaining({ visibility: 'sample', name: 'case-1' }),
    );
  });
});

// getInternalResourcesBundle
describe('getInternalResourcesBundle', () => {
  it('returns all (sample + hidden) regardless of status', async () => {
    const updatedAt = new Date('2020-01-02T00:00:00.000Z');

    prisma.questions.findFirst.mockResolvedValue({
      id: 'qint',
      status: 'draft',
      updated_at: updatedAt,
    });
    prisma.question_python_starter.findUnique.mockResolvedValue({
      question_id: 'qint',
      starter_code: 'def f(): pass',
    });
    prisma.question_test_cases.findMany.mockResolvedValue([
      {
        ordinal: 1,
        visibility: 'sample',
        input_data: '1',
        expected_output: '2',
      },
      {
        ordinal: 2,
        visibility: 'hidden',
        input_data: 'x',
        expected_output: 'y',
      },
    ]);

    const out = await Repo.getInternalResourcesBundle('qint');
    expect(out?.status).toBe('draft');
    expect(out?.test_cases.map((t) => t.visibility)).toEqual([
      'sample',
      'hidden',
    ]);
    expect(out?.updated_at).toBe(updatedAt.toISOString());
  });
});

// getPublishedManyById
describe('getPublishedManyById', () => {
  it('returns [] immediately for empty ids', async () => {
    const out = await Repo.getPublishedManyById([]);
    expect(out).toEqual([]);
    expect(prisma.questions.findMany).not.toHaveBeenCalled();
  });

  it('queries prisma when ids provided', async () => {
    prisma.questions.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const out = await Repo.getPublishedManyById(['a', 'b']);
    expect(prisma.questions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['a', 'b'] }, status: 'published' },
      }),
    );
    expect(out).toHaveLength(2);
  });
});

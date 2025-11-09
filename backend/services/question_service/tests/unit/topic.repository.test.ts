import {
  describe,
  it,
  expect,
  jest,
  beforeAll,
  beforeEach,
} from '@jest/globals';

let TopicRepo: typeof import('../../src/repositories/TopicRepository.js');
let prisma: any;

const makePrismaMock = () => ({
  topics: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
});

beforeAll(async () => {
  const prismaMock = makePrismaMock();

  await jest.unstable_mockModule('../../src/repositories/prisma.js', () => ({
    __esModule: true,
    prisma: prismaMock,
  }));

  TopicRepo = await import('../../src/repositories/TopicRepository.js');
  ({ prisma } = await import('../../src/repositories/prisma.js'));
});

beforeEach(() => {
  prisma.topics.findMany.mockReset();
  prisma.topics.upsert.mockReset();
});

describe('TopicRepository.list', () => {
  it('returns topics with fixed select and slug order', async () => {
    prisma.topics.findMany.mockResolvedValue([
      { slug: 'arrays', display: 'Arrays', color_hex: '#000000' },
    ]);

    const out = await TopicRepo.list();

    expect(prisma.topics.findMany).toHaveBeenCalledWith({
      select: { slug: true, display: true, color_hex: true },
      orderBy: { slug: 'asc' },
    });
    expect(out).toEqual([
      { slug: 'arrays', display: 'Arrays', color_hex: '#000000' },
    ]);
  });
});

describe('TopicRepository.listPublished', () => {
  it('filters topics that have at least one published question at given difficulty', async () => {
    prisma.topics.findMany.mockResolvedValue([
      { slug: 'graphs', display: 'Graphs', color_hex: '#123456' },
    ]);

    const out = await TopicRepo.listPublished('Medium');

    expect(prisma.topics.findMany).toHaveBeenCalledWith({
      where: {
        question_topics: {
          some: { questions: { status: 'published', difficulty: 'Medium' } },
        },
      },
      select: { slug: true, display: true, color_hex: true },
      orderBy: { slug: 'asc' },
    });
    expect(out).toEqual([
      { slug: 'graphs', display: 'Graphs', color_hex: '#123456' },
    ]);
  });
});

describe('TopicRepository.create', () => {
  it('upserts by slug (update existing)', async () => {
    prisma.topics.upsert.mockResolvedValue({
      slug: 'dp',
      display: 'Dynamic Programming',
      color_hex: '#00ff00',
    });

    const out = await TopicRepo.create('dp', 'Dynamic Programming', '#00ff00');

    expect(prisma.topics.upsert).toHaveBeenCalledWith({
      where: { slug: 'dp' },
      update: { display: 'Dynamic Programming', color_hex: '#00ff00' },
      create: {
        slug: 'dp',
        display: 'Dynamic Programming',
        color_hex: '#00ff00',
      },
      select: { slug: true, display: true, color_hex: true },
    });
    expect(out).toEqual({
      slug: 'dp',
      display: 'Dynamic Programming',
      color_hex: '#00ff00',
    });
  });

  it('upserts by slug (create new)', async () => {
    prisma.topics.upsert.mockResolvedValue({
      slug: 'math',
      display: 'Math',
      color_hex: '#112233',
    });

    const out = await TopicRepo.create('math', 'Math', '#112233');

    expect(prisma.topics.upsert).toHaveBeenCalledWith({
      where: { slug: 'math' },
      update: { display: 'Math', color_hex: '#112233' },
      create: { slug: 'math', display: 'Math', color_hex: '#112233' },
      select: { slug: true, display: true, color_hex: true },
    });
    expect(out).toEqual({
      slug: 'math',
      display: 'Math',
      color_hex: '#112233',
    });
  });
});

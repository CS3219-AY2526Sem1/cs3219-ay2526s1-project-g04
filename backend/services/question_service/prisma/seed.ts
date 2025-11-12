import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Topics
  await prisma.topics.createMany({
    data: [
      { slug: 'strings', display: 'Strings', color_hex: '#F4A261' },
      { slug: 'arrays', display: 'Arrays', color_hex: '#E9C46A' },
      { slug: 'algorithms', display: 'Algorithms', color_hex: '#2A9D8F' },
      { slug: 'graphs', display: 'Graphs', color_hex: '#577590' },
      { slug: 'linked-lists', display: 'Linked Lists', color_hex: '#B56576' },
    ],
    skipDuplicates: true,
  });

  const now = new Date();
  const qs = [
    {
      id: 'reverse-string',
      title: 'Reverse String',
      body_md:
        'Given a char array s, reverse it in-place.\n\n```\nInput: ["h","e","l","l","o"]\nOutput: ["o","l","l","e","h"]\n```\n\n![diagram](pp://questions/reverse-string/diag.png)',
      difficulty: 'Easy',
      status: 'published',
      version: 1,
      topics: [] as any,
      attachments: [] as any,
      rand_key: 0.111,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'two-sum',
      title: 'Two Sum',
      body_md:
        'Given an array nums and target, return indices of two numbers that add to target.',
      difficulty: 'Easy',
      status: 'published',
      version: 1,
      topics: [] as any,
      attachments: [] as any,
      rand_key: 0.222,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'graph-cycle-detection',
      title: 'Cycle Detection in Directed Graph',
      body_md: 'Detect if a directed graph has a cycle.',
      difficulty: 'Medium',
      status: 'published',
      version: 1,
      topics: [] as any,
      attachments: [] as any,
      rand_key: 0.333,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'palindrome-linked-list',
      title: 'Palindrome Linked List',
      body_md: 'Check if a singly linked list is a palindrome.',
      difficulty: 'Easy',
      status: 'draft',
      version: 1,
      topics: [] as any,
      attachments: [] as any,
      rand_key: 0.444,
      created_at: now,
      updated_at: now,
    },
  ];

  // Upsert core questions
  for (const q of qs) {
    await prisma.questions.upsert({
      where: { id: q.id },
      update: {
        title: q.title,
        body_md: q.body_md,
        difficulty: q.difficulty,
        status: q.status,
        version: q.version,
        topics: q.topics,
        attachments: q.attachments,
        rand_key: q.rand_key,
        updated_at: new Date(),
      },
      create: q,
    });
  }

  // Topic mappings (PK on (question_id, topic_slug))
  await prisma.question_topics.createMany({
    data: [
      { question_id: 'reverse-string', topic_slug: 'strings' },
      { question_id: 'two-sum', topic_slug: 'arrays' },
      { question_id: 'two-sum', topic_slug: 'algorithms' },
      { question_id: 'graph-cycle-detection', topic_slug: 'graphs' },
      { question_id: 'graph-cycle-detection', topic_slug: 'algorithms' },
      { question_id: 'palindrome-linked-list', topic_slug: 'linked-lists' },
    ],
    skipDuplicates: true,
  });

  // Optional: version snapshots
  await prisma.question_versions.createMany({
    data: [
      {
        id: 'reverse-string',
        version: 1,
        title: 'Reverse String',
        body_md: qs.find((x) => x.id === 'reverse-string')!.body_md,
        difficulty: 'Easy',
        topics: [] as any,
        attachments: [] as any,
        status: 'published',
        published_at: now,
        created_at: now,
      },
      {
        id: 'two-sum',
        version: 1,
        title: 'Two Sum',
        body_md: qs.find((x) => x.id === 'two-sum')!.body_md,
        difficulty: 'Easy',
        topics: [] as any,
        attachments: [] as any,
        status: 'published',
        published_at: now,
        created_at: now,
      },
      {
        id: 'graph-cycle-detection',
        version: 1,
        title: 'Cycle Detection in Directed Graph',
        body_md: qs.find((x) => x.id === 'graph-cycle-detection')!.body_md,
        difficulty: 'Medium',
        topics: [] as any,
        attachments: [] as any,
        status: 'published',
        published_at: now,
        created_at: now,
      },
    ],
    skipDuplicates: true,
  });

  // Optional: starter code example (if your service reads it)
  await prisma.question_python_starter.upsert({
    where: { question_id: 'reverse-string' },
    update: {
      starter_code: 'def solve(s):\n    return "".join(reversed(s))\n',
      entry_point: 'solve',
    },
    create: {
      question_id: 'reverse-string',
      starter_code: 'def solve(s):\n    return "".join(reversed(s))\n',
      entry_point: 'solve',
    },
  });
}

main().finally(() => prisma.$disconnect());

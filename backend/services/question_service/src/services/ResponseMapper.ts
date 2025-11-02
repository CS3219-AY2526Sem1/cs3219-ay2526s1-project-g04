// src/services/ResponseMapper.ts

export interface QuestionRecordFromRepo {
  id: string;
  title: string;
  body_md: string;
  difficulty: string;
  status: string;
  version: number;
  attachments: unknown;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  question_topics: Array<{
    topics: {
      slug: string;
      color_hex: string;
    };
  }>;
}

export interface PublicQuestionView {
  id: string;
  title: string;
  body_md: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: Array<{
    slug: string;
    color_hex: string;
  }>;
  attachments: Array<{
    object_key: string;
    mime?: string;
    byte_size?: number;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  body_html: string;
}

export function toPublicQuestion(args: {
  row: QuestionRecordFromRepo;
  body_html: string;
}): PublicQuestionView {
  const { row, body_html } = args;

  // Flatten the relation join: question_topics[*].topics
  const topics = Array.isArray(row.question_topics)
    ? row.question_topics.map((qt) => ({
        slug: qt.topics.slug,
        color_hex: qt.topics.color_hex,
      }))
    : [];

  // Safely map attachments (optional metadata)
  const attachmentsArray = Array.isArray(row.attachments)
    ? (row.attachments as Record<string, unknown>[])
    : [];

  const attachments = attachmentsArray.map((att) => {
    const out: {
      object_key: string;
      mime?: string;
      byte_size?: number;
      width?: number;
      height?: number;
      alt?: string;
    } = {
      object_key: String(att['object_key'] ?? ''),
    };

    if (att['mime']) {
      out.mime = String(att['mime']);
    }
    if (att['byte_size'] !== undefined) {
      const n = Number(att['byte_size']);
      if (!Number.isNaN(n)) out.byte_size = n;
    }
    if (att['width'] !== undefined) {
      const n = Number(att['width']);
      if (!Number.isNaN(n)) out.width = n;
    }
    if (att['height'] !== undefined) {
      const n = Number(att['height']);
      if (!Number.isNaN(n)) out.height = n;
    }
    if (att['alt']) {
      out.alt = String(att['alt']);
    }

    return out;
  });

  return {
    id: row.id,
    title: row.title,
    body_md: row.body_md,
    difficulty: row.difficulty as 'Easy' | 'Medium' | 'Hard',
    topics,
    attachments,
    status: row.status,
    version: row.version,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    body_html,
  };
}

function toIso(v: Date | string | null): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return new Date().toISOString();
}

// src/services/QuestionService.ts

import * as Repo from '../repositories/QuestionRepository.js';
import {
  renderQuestionMarkdown,
  type AttachmentLike,
} from './MarkdownService.js';
import { toPublicQuestion } from './ResponseMapper.js';
import type { QuestionRecordFromRepo } from './ResponseMapper.js';

export async function getPublishedWithHtml(id: string) {
  const row = await Repo.getPublishedById(id);

  if (!row) return undefined;

  const attachments = (row.attachments ?? []) as AttachmentLike[];

  const body_html = await renderQuestionMarkdown(row.body_md, attachments);

  const view = toPublicQuestion({
    row: row as QuestionRecordFromRepo,
    body_html,
  });

  return view;
}

export async function listPublished(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  page_size?: number;
}) {
  const rows = await Repo.listPublished(opts);

  // rows (plural) needs to ALSO come back in the same select shape from Repo.listPublished
  // i.e. listPublished in the repo should mirror getPublishedById's select,
  // including question_topics/topics.slug/color_hex etc.
  return Promise.all(
    rows.map(async (row) => {
      const attachments = (row.attachments ?? []) as AttachmentLike[];
      const body_html = await renderQuestionMarkdown(row.body_md, attachments);

      return toPublicQuestion({
        row: row as QuestionRecordFromRepo,
        body_html,
      });
    }),
  );
}

export async function getPublishedBatch(ids: string[]) {
  // pull raw rows from db
  const rows = await Repo.getPublishedManyById(ids);

  const enriched = await Promise.all(
    rows.map(async (q) => {
      const attachments = (q.attachments ?? []) as AttachmentLike[];
      const body_html = await renderQuestionMarkdown(q.body_md, attachments);

      return toPublicQuestion({
        row: q as QuestionRecordFromRepo,
        body_html,
      });
    }),
  );

  // keep the order consistent with caller's ids[]
  const orderIndex = new Map<string, number>();
  ids.forEach((id, i) => orderIndex.set(id, i));

  enriched.sort((a, b) => {
    const ai = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });

  return enriched;
}

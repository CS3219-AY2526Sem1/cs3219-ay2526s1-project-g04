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

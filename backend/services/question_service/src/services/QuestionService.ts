// src/services/QuestionService.ts

import * as Repo from '../repositories/QuestionRepository.js';
import {
  renderQuestionMarkdown,
  type AttachmentLike,
} from './MarkdownService.js';

export async function getPublishedWithHtml(id: string) {
  const q = await Repo.getPublishedById(id);

  if (!q) return undefined;

  const attachments = (q.attachments ?? []) as AttachmentLike[];

  const body_html = await renderQuestionMarkdown(q.body_md, attachments);
  return { ...q, body_html };
}

export async function listPublished(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  size?: number;
}) {
  const rows = await Repo.listPublished(opts);
  return Promise.all(
    rows.map(async (q) => {
      const attachments = (q.attachments ?? []) as AttachmentLike[];
      const body_html = await renderQuestionMarkdown(q.body_md, attachments);
      return { ...q, body_html };
    }),
  );
}

// src/services/QuestionService.ts

import * as Repo from '../repositories/QuestionRepository.js';
import { toSafeHtml } from './MarkdownService.js';

export async function getPublishedWithHtml(id: string) {
  const q = await Repo.getPublishedById(id);

  if (!q) return undefined;

  return { ...q, body_html: toSafeHtml(q.body_md) };
}

export async function listPublished(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  size?: number;
}) {
  const rows = await Repo.listPublished(opts);
  return rows.map((q) => ({ ...q, body_html: toSafeHtml(q.body_md) }));
}

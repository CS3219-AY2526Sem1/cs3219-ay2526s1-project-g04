// src/services/QuestionService.ts

import * as Repo from '../repositories/QuestionRepository';
import { toSafeHtml } from './MarkdownService';

export async function getPublishedWithHtml(id: string) {
  const q = await Repo.getPublishedById(id);

  if (!q) return undefined;

  return { ...q, body_html: toSafeHtml(q.body_md) };
}

export async function listPublished(opts: any) {
  const rows = await Repo.listPublished(opts);
  return rows.map((q: any) => ({ ...q, body_html: toSafeHtml(q.body_md) }));
}

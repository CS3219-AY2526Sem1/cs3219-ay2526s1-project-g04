// src/services/QuestionService.ts

import * as Repo from '../repositories/QuestionRepository.js';
import {
  renderQuestionMarkdown,
  type AttachmentLike,
} from './MarkdownService.js';
import { toPublicQuestion } from './ResponseMapper.js';
import type { QuestionRecordFromRepo } from './ResponseMapper.js';

type ListResult<T> = {
  items: T[];
  total: number;
};
type WithSnippetHtml<T> = T & { snippet_html?: string | null };

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
  highlight?: boolean;
}): Promise<ListResult<ReturnType<typeof toPublicQuestion>>> {
  const { rows, total } = await Repo.listPublished(opts);

  const items = await Promise.all(
    rows.map(async (row) => {
      const r = row as WithSnippetHtml<QuestionRecordFromRepo>;
      const attachments = (r.attachments ?? []) as AttachmentLike[];
      const body_html = await renderQuestionMarkdown(r.body_md, attachments);

      const base = toPublicQuestion({
        row: r,
        body_html,
      });

      return opts.highlight && r.snippet_html
        ? { ...base, snippet_html: r.snippet_html }
        : base;
    }),
  );

  return { items, total };
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

export async function listAll(opts: {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topics?: string[];
  q?: string;
  page?: number;
  page_size?: number;
  highlight?: boolean;
}): Promise<ListResult<ReturnType<typeof toPublicQuestion>>> {
  const { rows, total } = await Repo.listAll(opts);

  const items = await Promise.all(
    rows.map(async (row) => {
      const r = row as WithSnippetHtml<QuestionRecordFromRepo>;
      const attachments = (r.attachments ?? []) as AttachmentLike[];
      const body_html = await renderQuestionMarkdown(r.body_md, attachments);

      const base = toPublicQuestion({
        row: r,
        body_html,
      });

      return opts.highlight && r.snippet_html
        ? { ...base, snippet_html: r.snippet_html }
        : base;
    }),
  );

  return { items, total };
}

export async function getQuestionWithHtml(id: string) {
  const row = await Repo.getQuestionById(id);

  if (!row) return undefined;

  const attachments = (row.attachments ?? []) as AttachmentLike[];

  const body_html = await renderQuestionMarkdown(row.body_md, attachments);

  const view = toPublicQuestion({
    row: row as QuestionRecordFromRepo,
    body_html,
  });

  return view;
}

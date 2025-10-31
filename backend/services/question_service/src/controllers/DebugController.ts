// src/controllers/DebugController.ts

import type { Request, Response } from 'express';
import * as Repo from '../repositories/QuestionRepository.js';
import { renderQuestionMarkdown } from '../services/MarkdownService.js';
import type { AttachmentLike } from '../services/MarkdownService.js';

const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

interface PreviewQuestion {
  id: string;
  title: string;
  body_md: string | null;
  difficulty: string;
  status: string;
  version: number | null;
  created_at?: Date;
  updated_at?: Date;
  topics?: unknown;
  attachments?: unknown;
  body_html?: string;
}

export async function previewQuestion(req: Request, res: Response) {
  if (NODE_ENV !== 'development' && NODE_ENV !== 'test') {
    return res.status(403).send('debug disabled');
  }

  const id = String(req.params['id'] ?? '').trim();
  if (!id) {
    return res.status(400).send('id required');
  }

  const qRaw = await Repo.getPublishedById(id);

  if (!qRaw) {
    return res.status(404).send('not found');
  }

  const q = qRaw as unknown as PreviewQuestion;

  let renderedHtml: string | undefined =
    typeof q.body_html === 'string' ? q.body_html : undefined;

  if (!renderedHtml) {
    const bodyMd = q.body_md ?? '';
    const attachmentsArray: AttachmentLike[] = Array.isArray(q.attachments)
      ? q.attachments
          .filter(
            (a: unknown): a is AttachmentLike =>
              !!a &&
              typeof a === 'object' &&
              typeof (a as { object_key?: unknown }).object_key === 'string' &&
              typeof (a as { mime?: unknown }).mime === 'string',
          )
          .map((a) => a)
      : [];
    renderedHtml = await renderQuestionMarkdown(bodyMd, attachmentsArray);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(q.title)} — debug preview</title>
  <style>
    :root {
      --bg-page: #f5f5f7;
      --bg-card: #ffffff;
      --text-main: #1a1a1a;
      --text-dim: #666;
      --border-card: #ddd;
      --mono-bg: #0f172a;
      --mono-fg: #f8fafc;
      --radius-lg: 12px;
      --radius-md: 8px;
      --font-stack: system-ui, -apple-system, BlinkMacSystemFont, "Inter", Roboto, "Segoe UI", sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    body {
      background: var(--bg-page);
      color: var(--text-main);
      font-family: var(--font-stack);
      line-height: 1.5;
      max-width: 1200px;
      margin: 3rem auto;
      padding: 0 1rem 4rem;
    }

    header {
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--text-main);
      margin: 0 0 .5rem;
    }

    .meta {
      font-size: 0.8rem;
      color: var(--text-dim);
      line-height: 1.4;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
      box-shadow:
        0 20px 40px -10px rgb(0 0 0 / 0.08),
        0 4px 10px rgb(0 0 0 / 0.04);
    }

    .card h2 {
      margin: 0 0 .75rem;
      font-size: .9rem;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .question-body {
      font-size: .9rem;
      line-height: 1.5;
      color: var(--text-main);
    }

    .question-body p {
      margin: 0 0 .75rem;
    }

    .question-body ul {
      padding-left: 1.25rem;
      margin: 0 0 .75rem;
    }

    .question-body li {
      margin: 0 0 .4rem;
    }

    .raw-md {
      font-family: var(--font-mono);
      background: var(--mono-bg);
      color: var(--mono-fg);
      font-size: .8rem;
      line-height: 1.5;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      border: 1px solid #1f2937;
    }

    code, pre {
      font-family: var(--font-mono);
      background: #f6f6f6;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: .75rem 1rem;
      border-radius: var(--radius-md);
      line-height: 1.4;
      overflow-x: auto;
      border: 1px solid #1f2937;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      margin-top: .5rem;
    }
    .pill {
      background: #eef2ff;
      color: #4f46e5;
      font-size: .7rem;
      padding: .25rem .5rem;
      line-height: 1.2;
      border-radius: 999px;
      border: 1px solid #c7d2fe;
      font-weight: 500;
    }

    footer {
      margin-top: 3rem;
      font-size: 0.7rem;
      text-align: center;
      color: var(--text-dim);
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(q.title)}</h1>
    <div class="meta">
      <div><strong>ID:</strong> ${escapeHtml(q.id)}</div>
      <div><strong>Difficulty:</strong> ${escapeHtml(q.difficulty)}</div>
      <div><strong>Version:</strong> ${String(q.version ?? '')}</div>
    </div>
    <div class="pill-row">
      ${
        Array.isArray(q.topics)
          ? q.topics
              .map(
                (t) =>
                  `<span class="pill">${escapeHtml(String(t ?? ''))}</span>`,
              )
              .join('')
          : ''
      }
    </div>
  </header>

  <section class="grid">
    <section class="card">
      <h2>Sanitized HTML (what the frontend renders)</h2>
      <div class="question-body">
        ${renderedHtml}
      </div>
    </section>

    <section class="card">
      <h2>Raw Markdown (body_md)</h2>
      <div class="raw-md">${escapePre(q.body_md ?? '')}</div>
    </section>
  </section>

  <footer>
    <div>NODE_ENV=${escapeHtml(NODE_ENV)}</div>
    <div>This page is not exposed in production.</div>
  </footer>
</body>
</html>`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapePre(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

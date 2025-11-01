// src/controllers/DebugController.ts

import type { Request, Response } from 'express';
import * as QuestionService from '../services/QuestionService.js';

const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

export async function previewQuestion(req: Request, res: Response) {
  if (NODE_ENV !== 'development' && NODE_ENV !== 'test') {
    return res.status(403).send('debug disabled');
  }

  const id = String(req.params['id'] ?? '').trim();
  if (!id) {
    return res.status(400).send('id required');
  }

  // Pull the same shape we expose from GET /questions/:id
  const publicView = await QuestionService.getPublishedWithHtml(id);
  if (!publicView) {
    return res.status(404).send('not found');
  }

  // Build pills for topics if present
  const topicPills: Array<{ slug: string; color_hex?: string }> = Array.isArray(
    publicView.topics,
  )
    ? publicView.topics.map((t) => {
        const pill: { slug: string; color_hex?: string } = {
          slug: typeof t.slug === 'string' ? t.slug : String(t.slug ?? ''),
        };
        if (typeof t.color_hex === 'string') {
          pill.color_hex = t.color_hex;
        }
        return pill;
      })
    : [];

  // 🔓 OVERRIDE CSP FOR THIS RESPONSE:
  //
  // helmet() globally sets img-src 'self' data: which blocks S3.
  // Here we let the browser load images from your S3 bucket domain.
  //
  // You can add more domains (like CloudFront) later by appending them in img-src.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // allow images from same origin, data: URLs, and your S3 bucket host
      "img-src 'self' data: https://peerprep-question-service.s3.ap-southeast-1.amazonaws.com",
      // for inline styles in this debug page
      "style-src 'self' 'unsafe-inline' https:",
      // allow system fonts/CDN fonts if needed
      "font-src 'self' https: data:",
      // stay strict on scripts
      "script-src 'self'",
      // XHR/fetch targets
      "connect-src 'self'",
      // prevent embedding in random iframes
      "frame-ancestors 'self'",
      // optional extras mirroring helmet defaults:
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // Render final HTML
  const pageHtml = buildPreviewPageHtml({
    title: publicView.title,
    id: publicView.id,
    difficulty: publicView.difficulty,
    version: publicView.version,
    topics: topicPills,
    body_md: publicView.body_md,
    body_html: publicView.body_html,
    node_env: NODE_ENV,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(pageHtml);
}

function buildPreviewPageHtml(args: {
  title: string;
  id: string;
  difficulty: string;
  version: number | null | undefined;
  topics: Array<{ slug: string; color_hex?: string }>;
  body_md: string;
  body_html: string;
  node_env: string;
}): string {
  const {
    title,
    id,
    difficulty,
    version,
    topics,
    body_md,
    body_html,
    node_env,
  } = args;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — debug preview</title>
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

    header { margin-bottom: 2rem; }

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

    .question-body img {
      max-width: 100%;
      height: auto;
      display: block;
    }

    .raw-md {
      font-family: var(--font-mono);
      background: #0f172a;
      color: #f8fafc;
      font-size: .8rem;
      line-height: 1.5;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      border: 1px solid #1f2937;
    }

    code,
    pre {
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
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      <div><strong>ID:</strong> ${escapeHtml(id)}</div>
      <div><strong>Difficulty:</strong> ${escapeHtml(difficulty)}</div>
      <div><strong>Version:</strong> ${escapeHtml(String(version ?? ''))}</div>
    </div>
    <div class="pill-row">
      ${topics
        .map((t) => `<span class="pill">${escapeHtml(t.slug)}</span>`)
        .join('')}
    </div>
  </header>

  <section class="grid">
    <section class="card">
      <h2>SANITIZED HTML (WHAT THE FRONTEND RENDERS)</h2>
      <div class="question-body">
        ${body_html}
      </div>
    </section>

    <section class="card">
      <h2>RAW MARKDOWN (BODY_MD)</h2>
      <div class="raw-md">${escapePre(body_md)}</div>
    </section>
  </section>

  <footer>
    <div>NODE_ENV=${escapeHtml(node_env)}</div>
    <div>This page is not exposed in production.</div>
  </footer>
</body>
</html>`;
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

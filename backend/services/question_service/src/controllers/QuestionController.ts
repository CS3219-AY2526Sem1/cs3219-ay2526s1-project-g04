// src/controllers/QuestionController.ts

import type { Request, Response } from 'express';
import * as Service from '../services/QuestionService.js';
import { selectOne } from '../services/SelectionService.js';

// types
type Difficulty = 'Easy' | 'Medium' | 'Hard';

// helpers
function normalizeDifficulty(d: unknown): Difficulty | null {
  if (typeof d !== 'string') return null;
  const v = d.toLowerCase();
  if (v === 'easy') return 'Easy';
  if (v === 'medium') return 'Medium';
  if (v === 'hard') return 'Hard';
  return null;
}

function parseTopics(x: unknown): string[] | undefined {
  if (typeof x === 'string')
    return x
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  if (Array.isArray(x)) return x.map(String);
  return undefined;
}

function parseDifficulty(x: unknown): Difficulty | undefined {
  const d = normalizeDifficulty(x);
  return d ?? undefined;
}

function parseStr(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined;
}

function parseNum(x: unknown): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * GET /questions/:id
 */
export async function getById(req: Request, res: Response) {
  try {
    const id = String(req.params['id'] ?? '');
    if (!id) return res.status(400).json({ error: 'id param required' });

    const view = await Service.getPublishedWithHtml(id);
    if (!view) return res.status(404).json({ error: 'not found' });

    // view is already in PublicQuestionView shape:
    // {
    //   id, title, body_md, difficulty,
    //   topics: [{slug,color_hex},...],
    //   attachments: [...],
    //   status, version,
    //   created_at, updated_at,
    //   body_html
    // }
    return res.json(view);
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /questions
 */
export async function list(req: Request, res: Response) {
  const args: {
    difficulty?: Difficulty;
    topics?: string[];
    q?: string;
    page?: number;
    size?: number;
  } = {};

  const d = parseDifficulty(req.query['difficulty']);
  const t = parseTopics(req.query['topics']);
  const qq = parseStr(req.query['q']);
  const p = parseNum(req.query['page']);
  const s = parseNum(req.query['size']);

  if (d !== undefined) args.difficulty = d;
  if (t !== undefined) args.topics = t;
  if (qq !== undefined) args.q = qq;
  if (p !== undefined) args.page = p;
  if (s !== undefined) args.size = s;

  const data = await Service.listPublished(args);

  // data here is array<PublicQuestionView>
  // we wrap it in { items: [...] } for pagination later
  return res.json({ items: data });
}

/**
 * POST /select
 */
export async function select(req: Request, res: Response) {
  const { matching_id, difficulty, topics, recent_ids } = req.body || {};

  if (!matching_id)
    return res.status(400).json({ error: 'matching_id required' });

  const result = await selectOne({
    matching_id,
    difficulty,
    topics,
    recent_ids,
  });
  if (!result.question_id)
    return res.status(404).json({ error: 'no eligible question' });
  return res.json(result);
}

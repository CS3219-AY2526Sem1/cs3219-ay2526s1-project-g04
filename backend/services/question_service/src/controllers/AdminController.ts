// src/controllers/AdminController.ts (example)
import * as Repo from '../repositories/QuestionRepository.js';
import type { Request, Response } from 'express';
import { slugify } from '../utils/slug.js';

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

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === 'string');
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
 * POST /admin/questions
 */
export async function create(req: Request, res: Response) {
  try {
    const { title, body_md, difficulty, topics, attachments } = req.body ?? {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (typeof body_md !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'body_md is required' });
    }
    const diff = normalizeDifficulty(difficulty);
    if (!diff) {
      return res.status(400).json({
        error:
          'difficulty needs to be one of the following: Easy, Medium, Hard',
      });
    }

    const id = slugify(title);
    if (!id)
      return res
        .status(400)
        .json({ error: 'invalid title (cannot derive a slug)' });

    const created = await Repo.createDraft({
      id,
      title,
      body_md,
      difficulty: diff,
      topics: isStringArray(topics) ? topics : [],
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    res.status(201).location(`/admin/questions/${created.id}`).json(created);
  } catch {
    res.status(500).json({ error: 'internal_error' });
  }
}
/**
 * PATCH /admin/questions/:id
 */
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: 'id param required' });

    const patch: Partial<{
      title: string;
      body_md: string;
      difficulty: Difficulty;
      topics: string[];
      attachments: string[];
    }> = {};

    if (typeof req.body?.title === 'string') patch.title = req.body.title;
    if (typeof req.body?.body_md === 'string') patch.body_md = req.body.body_md;
    if (req.body?.difficulty !== undefined) {
      const diff = normalizeDifficulty(req.body.difficulty);
      if (!diff)
        return res
          .status(400)
          .json({ error: 'difficulty must be one of: easy, medium, hard' });
      patch.difficulty = diff;
    }
    if (req.body?.topics !== undefined) {
      if (!isStringArray(req.body.topics))
        return res.status(400).json({ error: 'topics must be string[]' });
      patch.topics = req.body.topics;
    }
    if (req.body?.attachments !== undefined) {
      if (!isStringArray(req.body.attachments))
        return res.status(400).json({ error: 'attachments must be string[]' });
      patch.attachments = req.body.attachments;
    }

    const q = await Repo.updateDraft(id, patch);
    if (!q) return res.status(404).json({ error: 'not_found' });
    res.json(q);
  } catch {
    res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * POST /admin/questions/:id/publish
 * Publishes current draft → creates a version snapshot.
 */
export async function publish(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id param required' });

    const q = await Repo.publish(id);
    if (!q) return res.status(404).json({ error: 'not_found' });
    res.json(q);
  } catch {
    res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /admin/questions
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
  const q = parseStr(req.query['q']);
  const p = parseNum(req.query['page']);
  const s = parseNum(req.query['size']);

  if (d !== undefined) args.difficulty = d;
  if (t !== undefined) args.topics = t;
  if (q !== undefined) args.q = q;
  if (p !== undefined) args.page = p;
  if (s !== undefined) args.size = s;

  const data = await Repo.listAll(args);
  return res.json({ items: data });
}

/**
 * DELETE /admin/questions/:id
 */
export async function archive(req: Request, res: Response) {
  const id = String(req.params['id'] ?? '');
  if (!id) return res.status(400).json({ error: 'id param required' });

  const q = await Repo.archive(id);
  if (!q) return res.status(404).json({ error: 'not_found_or_not_published' });

  return res.json(q);
}

/**
 * GET /admin/questions/:id
 */
export async function getById(req: Request, res: Response) {
  try {
    const id = String(req.params['id'] ?? '');
    if (!id) return res.status(400).json({ error: 'id param required' });

    const q = await Repo.getQuestionById(id);
    if (!q) return res.status(404).json({ error: 'not found' });
    return res.json(q);
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
}

// src/controllers/AdminController.ts (example)
import * as Repo from '../repositories/QuestionRepository';
import { Request, Response } from 'express';
import { slugifyTitle } from '../utils/slug';

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

/**
 * POST /admin/questions
 * Creates a DRAFT question
 * @param req
 * @param res
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

    const id = slugifyTitle(title);
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
 * Updates a DRAFT question (partial). Server ignores immutable fields,
 * @param req
 * @param res
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

export async function list(req: Request, res: Response) {
  const { difficulty, topics, q, page, size } = req.query;

  const data = await Repo.listAll({
    difficulty,
    topics: typeof topics === 'string' ? (topics as string).split(',') : topics,
    q,
    page: Number(page),
    size: Number(size),
  });
  return res.json({ items: data });
}

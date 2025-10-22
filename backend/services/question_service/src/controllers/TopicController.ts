// src/controllers/TopicController.ts
import * as Repo from '../repositories/TopicRepository.js';
import type { Request, Response } from 'express';
import { slugify } from '../utils/slug.js';

const norm = (d?: string) => {
  if (!d) return undefined;
  const n = d.toLowerCase();
  if (n === 'easy') return 'Easy';
  if (n === 'medium') return 'Medium';
  if (n === 'hard') return 'Hard';
  return undefined;
};

/**
 * GET /topics
 * Returns a list of topics
 */
export async function list(_req: Request, res: Response) {
  const result = await Repo.list();
  return res.json({ items: result });
}

/**
 * GET /questions/topics
 * @param req
 * @param res
 */
export async function listPublished(req: Request, res: Response) {
  const diff = norm(req.query.difficulty as string | undefined);
  if (!diff)
    return res.status(400).json({ error: 'invalid_or_missing_difficulty' });
  const items = await Repo.listPublished(diff);
  return res.json({ items });
}

/**
 * POST /admin/topics
 */
export async function create(req: Request, res: Response) {
  try {
    const { display, color_hex } = req.params;

    if (typeof display !== 'string' || !display.trim()) {
      return res.status(400).json({ error: 'display is required' });
    }
    if (typeof color_hex !== 'string' || !color_hex.trim()) {
      return res.status(400).json({ error: 'color_hex is required' });
    }

    const d = display.trim();
    const slug = slugify(d);
    if (!slug)
      return res
        .status(400)
        .json({ error: 'invalid display name (cannot derive a slug)' });

    const isHex = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(color_hex);
    const color = isHex ? color_hex.toLowerCase() : '#000000ff';

    const created = await Repo.create(slug, d, color);
    res.status(201).location(`/admin/topics/${created.slug}`).json(created);
  } catch {
    res.status(500).json({ error: 'internal_error' });
  }
}

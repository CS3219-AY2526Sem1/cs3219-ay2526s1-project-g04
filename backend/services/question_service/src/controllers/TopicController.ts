// src/controllers/TopicController.ts
import * as Repo from '../repositories/TopicRepository';
import { Request, Response } from 'express';

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

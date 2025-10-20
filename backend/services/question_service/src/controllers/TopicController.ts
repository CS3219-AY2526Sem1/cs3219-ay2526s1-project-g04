// src/controllers/TopicControllers.ts
import * as Repo from '../repositories/TopicRepository';
import { Request, Response } from 'express';

/**
 * GET /topics
 * Returns a list of topics
 */
export async function list(_req: Request, res: Response) {
  const result = await Repo.list();
  return res.json({ items: result });
}

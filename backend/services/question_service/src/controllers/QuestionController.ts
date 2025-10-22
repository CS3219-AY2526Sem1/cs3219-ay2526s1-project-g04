// src/controllers/QuestionController.ts

import type { Request, Response } from 'express';
import * as Service from '../services/QuestionService.js';
import { selectOne } from '../services/SelectionService.js';
import * as Repo from '../repositories/QuestionRepository.js';
/**
 * GET /questions/:id
 * Gets a question from repository by its ID
 * @param req
 * @param res
 */
export async function getById(req: Request, res: Response) {
  try {
    const q = await Repo.getPublishedById(req.params.id);
    if (!q) return res.status(404).json({ error: 'not found' });
    return res.json(q);
  } catch {
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /questions
 * Gets a list of published questions
 * @param req
 * @param res
 */
export async function list(req: Request, res: Response) {
  const { difficulty, topics, q, page, size } = req.query;

  const data = await Service.listPublished({
    difficulty,
    topics: typeof topics === 'string' ? (topics as string).split(',') : topics,
    q,
    page: Number(page),
    size: Number(size),
  });
  return res.json({ items: data });
}

/**
 * POST /select
 * Selects a question
 * @param req
 * @param res
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

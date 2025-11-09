// src/controllers/QuestionController.ts

import type { Response } from 'express';
import * as Service from '../services/QuestionService.js';
import { selectOne } from '../services/SelectionService.js';
import { log } from '../utils/logger.js';
import * as Repo from '../repositories/QuestionRepository.js';
import type { AuthRequest } from '../middleware/auth.js';

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
export async function getById(req: AuthRequest, res: Response) {
  const id = String(req.params['id'] ?? '');

  if (!id) {
    log.warn('[GET /questions/:id] missing id param', {
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.userId,
    });
    return res.status(400).json({ error: 'id param required' });
  }

  try {
    log.info('[GET /questions/:id] request', {
      id,
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.userId,
    });

    const view = await Service.getPublishedWithHtml(id);
    if (!view) {
      log.warn('[GET /questions/:id] not found', {
        id,
        ip: req.ip,
        userRole: req.user?.role,
        userId: req.user?.userId,
      });
      return res.status(404).json({ error: 'not found' });
    }

    const bundle = await Repo.getPublicResourcesBundle(id);
    const starter_code = bundle?.starter_code ?? {};
    const test_cases = bundle?.test_cases ?? [];

    log.info('[GET /questions/:id] success', {
      id: view.id,
      difficulty: view.difficulty,
      topics_count: Array.isArray(view.topics) ? view.topics.length : 0,
      attachments_count: Array.isArray(view.attachments)
        ? view.attachments.length
        : 0,
      sample_testcases: test_cases.length,
      starter_code_langs: Object.keys(starter_code),
    });

    return res.json({
      ...view,
      starter_code,
      test_cases,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[GET /questions/:id] error', {
      id,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /questions
 */
export async function list(req: AuthRequest, res: Response) {
  const args: {
    difficulty?: Difficulty;
    topics?: string[];
    q?: string;
    page?: number;
    page_size?: number;
  } = {};

  const d = parseDifficulty(req.query['difficulty']);
  const t = parseTopics(req.query['topics']);
  const qq = parseStr(req.query['q']);
  const p = parseNum(req.query['page']);
  const s = parseNum(req.query['page_size']);

  if (d !== undefined) args.difficulty = d;
  if (t !== undefined) args.topics = t;
  if (qq !== undefined) args.q = qq;
  if (p !== undefined) args.page = p;
  if (s !== undefined) args.page_size = s;

  log.info('[GET /questions] request', {
    ip: req.ip,
    ua: req.get('user-agent'),
    userRole: req.user?.role,
    userId: req.user?.userId,
    difficulty: args.difficulty,
    topics: args.topics,
    q_len: args.q?.length ?? 0,
    page: args.page,
    page_size: args.page_size,
  });

  try {
    const { items, total } = await Service.listPublished(args);

    log.info('[GET /questions] success', {
      returned: items.length,
      first_id: items[0]?.id,
      difficulty: args.difficulty,
      topics: args.topics,
      page: args.page,
      page_size: args.page_size,
    });

    return res.json({
      items,
      total,
      page: args.page ?? 1,
      page_size: args.page_size ?? 20,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[GET /questions] error', {
      ip: req.ip,
      userRole: req.user?.role,
      userId: req.user?.userId,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * POST /select  (public)
 */
export async function select(req: AuthRequest, res: Response) {
  const { matching_id, difficulty, topics, recent_ids } = req.body || {};

  if (typeof matching_id !== 'string' || matching_id.trim() === '') {
    log.warn('[POST /select] missing matching_id', {
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.userId,
    });
    return res.status(400).json({ error: 'matching_id required' });
  }

  log.info('[POST /select] request', {
    matching_id,
    ip: req.ip,
    ua: req.get('user-agent'),
    userRole: req.user?.role,
    userId: req.user?.userId,
    difficulty,
    topics,
    recent_ids_len: Array.isArray(recent_ids) ? recent_ids.length : undefined,
  });

  try {
    const result = await selectOne({
      matching_id,
      difficulty,
      topics,
      recent_ids,
    });

    if (!result.question_id) {
      log.warn('[POST /select] no eligible question', { matching_id });
      return res.status(404).json({ error: 'no eligible question' });
    }

    log.info('[POST /select] success', {
      matching_id,
      question_id: result.question_id,
      chosen_difficulty: difficulty,
    });

    return res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[POST /select] error', {
      matching_id,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /questions/batch?ids=q1,q2,q3
 */
export async function getBatchById(req: AuthRequest, res: Response) {
  const raw = (req.query['ids'] as string | undefined)?.trim() ?? '';
  if (!raw) {
    return res.status(400).json({
      error: 'missing_ids',
      message: 'query param ?ids=... is required',
    });
  }

  // split, trim, dedupe, drop empties
  const ids = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  if (!ids.length) {
    return res
      .status(400)
      .json({ error: 'no_valid_ids', message: 'no usable ids found' });
  }

  if (ids.length > 50) {
    return res.status(400).json({
      error: 'too_many_ids',
      message: 'limit 50 ids per request',
    });
  }

  try {
    const questions = await Service.getPublishedBatch(ids);
    return res.json({
      items: questions,
      count: questions.length,
    });
  } catch (err) {
    log.error('error in getBatchByIds', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

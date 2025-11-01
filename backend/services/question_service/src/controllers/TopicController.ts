// src/controllers/TopicController.ts

import * as Repo from '../repositories/TopicRepository.js';
import type { Request, Response } from 'express';
import { slugify } from '../utils/slug.js';
import { log } from '../utils/logger.js';

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
export async function list(req: Request, res: Response) {
  log.info('[GET /topics] request', {
    ip: req.ip,
    ua: req.get('user-agent'),
    userRole: req.user?.role,
    userId: req.user?.sub ?? req.user?.userId,
  });

  try {
    const result = await Repo.list();

    log.info('[GET /topics] success', {
      count: Array.isArray(result) ? result.length : 0,
    });

    return res.json({ items: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[GET /topics] error', {
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /questions/topics
 * Returns topics with question counts for a given difficulty.
 * Query params:
 *   difficulty = easy|medium|hard (required)
 */
export async function listPublished(req: Request, res: Response) {
  const rawDiff = req.query['difficulty'] as string | undefined;
  const diff = norm(rawDiff);

  if (!diff) {
    log.warn('[GET /questions/topics] invalid_or_missing_difficulty', {
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.sub ?? req.user?.userId,
      difficulty: rawDiff,
    });
    return res.status(400).json({ error: 'invalid_or_missing_difficulty' });
  }

  log.info('[GET /questions/topics] request', {
    ip: req.ip,
    ua: req.get('user-agent'),
    userRole: req.user?.role,
    userId: req.user?.sub ?? req.user?.userId,
    difficulty: diff,
  });

  try {
    const items = await Repo.listPublished(diff);

    log.info('[GET /questions/topics] success', {
      difficulty: diff,
      count: Array.isArray(items) ? items.length : 0,
      // peek at first item for debug (slug is enough, safe to log)
      first_slug: items?.[0]?.slug,
    });

    return res.json({ items });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[GET /questions/topics] error', {
      difficulty: diff,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * POST /admin/topics
 *
 * Body:
 *   {
 *     "display": "Graphs",
 *     "color_hex": "#2A9D8F"
 *   }
 *
 * Creates a canonical topic row.
 */
export async function create(req: Request, res: Response) {
  const role = req.user?.role ?? 'anonymous';
  const userId = req.user?.sub ?? req.user?.userId;

  log.info('[POST /admin/topics] request', {
    ip: req.ip,
    ua: req.get('user-agent'),
    role,
    userId,
    body_preview: {
      display_type: typeof req.body?.display,
      color_hex_type: typeof req.body?.color_hex,
    },
  });

  try {
    const { display, color_hex } = req.body;

    if (typeof display !== 'string' || !display.trim()) {
      log.warn('[POST /admin/topics] missing display', {
        role,
        userId,
        display,
      });
      return res.status(400).json({ error: 'display is required' });
    }

    if (typeof color_hex !== 'string' || !color_hex.trim()) {
      log.warn('[POST /admin/topics] missing color_hex', {
        role,
        userId,
        color_hex,
      });
      return res.status(400).json({ error: 'color_hex is required' });
    }

    const d = display.trim();
    const slug = slugify(d);

    if (!slug) {
      log.warn('[POST /admin/topics] invalid slug from display', {
        role,
        userId,
        display: d,
      });
      return res.status(400).json({
        error: 'invalid display name (cannot derive a slug)',
      });
    }

    const isHex = /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(color_hex);
    const color = isHex ? color_hex.toLowerCase() : '#000000ff';

    const created = await Repo.create(slug, d, color);

    log.info('[POST /admin/topics] success', {
      role,
      userId,
      slug: created.slug,
      display: created.display,
      color_hex: created.color_hex,
    });

    res.status(201).location(`/admin/topics/${created.slug}`).json(created);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[POST /admin/topics] error', {
      role,
      userId,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).json({ error: 'internal_error' });
  }
}

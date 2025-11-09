// src/controllers/ResourcesController.ts

import type { Response } from 'express';
import { log } from '../utils/logger.js';
import {
  getInternalResourcesBundle,
  getPublicResourcesBundle,
} from '../repositories/QuestionRepository.js';
import type { AuthRequest } from '../middleware/auth.js';
import { Role } from '../middleware/auth.js';

/**
 * GET /questions/:id/resources
 * Public: no auth required. Only returns resources for PUBLISHED questions.
 */
export async function getPublicQuestionResources(
  req: AuthRequest,
  res: Response,
) {
  const id = String(req.params['id'] ?? '').trim();
  const role = req.user?.role;
  const userId = req.user?.userId;

  if (!id) {
    log.warn('[GET /questions/:id/resources] missing id', {
      ip: req.ip,
      ua: req.get('user-agent'),
      role,
      userId,
    });
    return res.status(400).json({ error: 'id param required' });
  }

  log.info('[GET /questions/:id/resources] request', {
    id,
    ip: req.ip,
    ua: req.get('user-agent'),
    role,
    userId,
  });

  try {
    const payload = await getPublicResourcesBundle(id);

    if (!payload) {
      // either not found or not published
      log.warn('[GET /questions/:id/resources] not_found_or_unpublished', {
        id,
        role,
        userId,
      });
      return res.status(404).json({ error: 'not_found' });
    }

    const sampleCount = Array.isArray(payload.test_cases)
      ? payload.test_cases.length
      : 0;

    log.info('[GET /questions/:id/resources] success', {
      id,
      has_starter_code:
        typeof payload.starter_code === 'string' &&
        payload.starter_code.length > 0,
      starter_code_len:
        typeof payload.starter_code === 'string'
          ? payload.starter_code.length
          : 0,
      sampleCount,
    });

    return res.json(payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[GET /questions/:id/resources] error', {
      id,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /admin/questions/:id/resources
 * Admin-only: must be protected by authenticateToken + isAdmin in the router.
 * Returns resources for ANY status (draft/published/archived), including hidden tests.
 */
export async function getAdminQuestionResources(
  req: AuthRequest,
  res: Response,
) {
  const id = String(req.params['id'] ?? '').trim();
  const role = req.user?.role;
  const userId = req.user?.userId;

  if (!id) {
    log.warn('[GET /admin/questions/:id/resources] missing id', {
      ip: req.ip,
      ua: req.get('user-agent'),
      role,
      userId,
    });
    return res.status(400).json({ error: 'id param required' });
  }

  // Defensive check in case route is misconfigured without isAdmin
  if (role !== Role.ADMIN) {
    log.warn('[GET /admin/questions/:id/resources] forbidden (not admin)', {
      id,
      role,
      userId,
      ip: req.ip,
      ua: req.get('user-agent'),
    });
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  log.info('[GET /admin/questions/:id/resources] request', {
    id,
    role,
    userId,
    ip: req.ip,
    ua: req.get('user-agent'),
  });

  try {
    const payload = await getInternalResourcesBundle(id);

    if (!payload) {
      log.warn('[GET /admin/questions/:id/resources] not_found', {
        id,
        role,
        userId,
      });
      return res.status(404).json({ error: 'not_found' });
    }

    // Count sample vs hidden
    let hiddenCount = 0;
    let sampleCount = 0;
    if (Array.isArray(payload.test_cases)) {
      for (const tc of payload.test_cases) {
        if (tc.visibility === 'hidden') hiddenCount += 1;
        else if (tc.visibility === 'sample') sampleCount += 1;
      }
    }
    const totalCases = hiddenCount + sampleCount;

    log.info('[GET /admin/questions/:id/resources] success', {
      id,
      role,
      userId,
      totalCases,
      sampleCount,
      hiddenCount,
      has_starter_code:
        typeof payload.starter_code === 'string' &&
        payload.starter_code.length > 0,
      starter_code_len:
        typeof payload.starter_code === 'string'
          ? payload.starter_code.length
          : 0,
    });

    return res.json(payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('[GET /admin/questions/:id/resources] error', {
      id,
      role,
      userId,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

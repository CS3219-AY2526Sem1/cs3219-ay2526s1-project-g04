// src/controllers/ResourcesController.ts

import type { Request, Response } from 'express';
import { log } from '../utils/logger.js';
import {
  getInternalResourcesBundle,
  getPublicResourcesBundle,
} from '../repositories/QuestionRepository.js';

/**
 * GET /questions/:id/resources
 * anonymous/service/admin all allowed,
 * BUT only succeeds if question is published.
 */
export async function getPublicQuestionResources(req: Request, res: Response) {
  const id = String(req.params['id'] ?? '').trim();

  if (!id) {
    log.warn('[GET /questions/:id/resources] missing id', {
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.sub ?? req.user?.userId,
    });
    return res.status(400).json({ error: 'id required' });
  }

  log.info('[GET /questions/:id/resources] request', {
    id,
    ip: req.ip,
    ua: req.get('user-agent'),
    userRole: req.user?.role,
    userId: req.user?.sub ?? req.user?.userId,
  });

  try {
    const payload = await getPublicResourcesBundle(id);

    if (!payload) {
      // either question doesn't exist or isn't published
      log.warn('[GET /questions/:id/resources] not_found_or_unpublished', {
        id,
        userRole: req.user?.role,
        userId: req.user?.sub ?? req.user?.userId,
      });
      return res.status(404).json({ error: 'not_found' });
    }

    // payload has only sample tests
    log.info('[GET /questions/:id/resources] success', {
      id,
      starter_langs: Object.keys(payload.starter_code ?? {}),
      sample_case_count: Array.isArray(payload.test_cases)
        ? payload.test_cases.length
        : 0,
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
 * requires role admin OR service
 * returns unpublished + hidden tests.
 */
export async function getAdminQuestionResources(req: Request, res: Response) {
  const id = String(req.params['id'] ?? '').trim();

  if (!id) {
    log.warn('[GET /admin/questions/:id/resources] missing id', {
      ip: req.ip,
      ua: req.get('user-agent'),
      userRole: req.user?.role,
      userId: req.user?.sub ?? req.user?.userId,
    });
    return res.status(400).json({ error: 'id required' });
  }

  const role = req.user?.role ?? 'anonymous';
  const userId = req.user?.sub ?? req.user?.userId;

  if (role !== 'admin' && role !== 'service') {
    log.warn('[GET /admin/questions/:id/resources] unauthorized', {
      id,
      attemptedRole: role,
      userId,
      ip: req.ip,
      ua: req.get('user-agent'),
    });
    return res.status(401).json({ error: 'unauthorized' });
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

    // payload includes ALL test cases (sample + hidden)
    const totalCases = Array.isArray(payload.test_cases)
      ? payload.test_cases.length
      : 0;

    // We'll also count how many are hidden vs sample so we can see at a glance
    let hiddenCount = 0;
    let sampleCount = 0;
    if (Array.isArray(payload.test_cases)) {
      for (const tc of payload.test_cases) {
        if (tc.visibility === 'hidden') hiddenCount += 1;
        else if (tc.visibility === 'sample') sampleCount += 1;
      }
    }

    log.info('[GET /admin/questions/:id/resources] success', {
      id,
      role,
      userId,
      totalCases,
      sampleCount,
      hiddenCount,
      starter_langs: Object.keys(payload.starter_code ?? {}),
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

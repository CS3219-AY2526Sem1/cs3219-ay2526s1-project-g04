// src/controllers/ResourcesController.ts

import type { Request, Response } from 'express';
import { log } from '../utils/logger.js';
import {
  getPublicResources,
  getInternalResources,
} from '../repositories/ResourcesRepository.js';

/**
 * GET /questions/:id/resources
 * anonymous/service/admin all allowed,
 * BUT only succeeds if question is published.
 */
export async function getPublicQuestionResources(req: Request, res: Response) {
  const id = String(req.params['id'] ?? '').trim();
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }

  try {
    const payload = await getPublicResources(id);
    if (!payload) {
      return res.status(404).json({ error: 'not_found' });
    }

    return res.json(payload);
  } catch (err) {
    log.error('getPublicQuestionResources failed', err);
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
    return res.status(400).json({ error: 'id required' });
  }

  const role = req.user?.role ?? 'anonymous';
  if (role !== 'admin' && role !== 'service') {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const payload = await getInternalResources(id);
    if (!payload) {
      return res.status(404).json({ error: 'not_found' });
    }

    return res.json(payload);
  } catch (err) {
    log.error('getAdminQuestionResources failed', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

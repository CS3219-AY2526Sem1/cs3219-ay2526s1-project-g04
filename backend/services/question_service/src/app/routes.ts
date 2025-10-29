// src/app/routes.ts
import { Router } from 'express';
import * as AdminAttachmentController from '../controllers/AdminAttachmentController.js';
import * as QuestionController from '../controllers/QuestionController.js';
import * as AdminController from '../controllers/AdminController.js';
import * as TopicController from '../controllers/TopicController.js';
import * as HealthController from '../controllers/HealthController.js';
import { requireAuth, requireRole } from '../middleware/auth.js'; // ⬅️ add requireAuth

const r = Router();

// Health
r.get('/healthz', HealthController.healthz);
r.get('/readyz', HealthController.readyz);

// Public read
r.get('/questions/topics', TopicController.listPublished);
r.get('/questions/:id', QuestionController.getById);
r.get('/questions', QuestionController.list);
r.get('/topics', TopicController.list);

// Service-to-service (selection) — lock to 'service'
r.post(
  '/select',
  requireAuth(),
  requireRole('service'),
  QuestionController.select,
);

// Admin — lock entire /admin subtree
r.post(
  '/admin/attachments/sign-upload',
  requireAuth(),
  requireRole('admin'),
  AdminAttachmentController.signUpload,
);
r.post(
  '/admin/attachments/sign-view',
  requireAuth(),
  requireRole('admin'),
  AdminAttachmentController.signView,
);
r.post(
  '/admin/topics',
  requireAuth(),
  requireRole('admin'),
  TopicController.create,
);
r.get(
  '/admin/questions',
  requireAuth(),
  requireRole('admin'),
  AdminController.list,
);
r.post(
  '/admin/questions',
  requireAuth(),
  requireRole('admin'),
  AdminController.create,
);
r.delete(
  '/admin/questions/:id',
  requireAuth(),
  requireRole('admin'),
  AdminController.archive,
);
r.patch(
  '/admin/questions/:id',
  requireAuth(),
  requireRole('admin'),
  AdminController.update,
);
r.get(
  '/admin/questions/:id',
  requireAuth(),
  requireRole('admin'),
  AdminController.getById,
);
r.post(
  '/admin/questions/:id/publish',
  requireAuth(),
  requireRole('admin'),
  AdminController.publish,
);

export default r;

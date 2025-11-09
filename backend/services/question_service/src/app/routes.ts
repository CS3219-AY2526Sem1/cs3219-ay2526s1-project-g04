// src/app/routes.ts
import { Router } from 'express';
import { authenticateToken, isAdmin, isUser } from '../middleware/auth.js';

import * as AdminAttachmentController from '../controllers/AdminAttachmentController.js';
import * as QuestionController from '../controllers/QuestionController.js';
import * as AdminController from '../controllers/AdminController.js';
import * as TopicController from '../controllers/TopicController.js';
import * as HealthController from '../controllers/HealthController.js';
import * as DebugController from '../controllers/DebugController.js';
import * as ResourcesController from '../controllers/ResourceController.js';

const r = Router();
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// Health
r.get('/healthz', HealthController.healthz);
r.get('/readyz', HealthController.readyz);

// Debug (dev/test only)
if (NODE_ENV === 'development' || NODE_ENV === 'test') {
  r.get('/debug/questions/:id', DebugController.previewQuestion);
}

// Public read
r.get('/questions/batch', QuestionController.getBatchById);
r.get('/questions/topics', TopicController.listPublished);
r.get(
  '/questions/:id/resources',
  ResourcesController.getPublicQuestionResources,
);
r.get('/questions/:id', QuestionController.getById);
r.get('/questions', QuestionController.list);
r.get('/topics', TopicController.list);

// Selection (any authenticated user; keep isUser so USER/ADMIN both pass)
r.post('/select', authenticateToken, isUser, QuestionController.select);

// Admin subtree
r.post(
  '/admin/attachments/sign-upload',
  authenticateToken,
  isAdmin,
  AdminAttachmentController.signUpload,
);
r.post(
  '/admin/attachments/sign-view',
  authenticateToken,
  isAdmin,
  AdminAttachmentController.signView,
);

r.post('/admin/topics', authenticateToken, isAdmin, TopicController.create);

r.get('/admin/questions', authenticateToken, isAdmin, AdminController.list);
r.post('/admin/questions', authenticateToken, isAdmin, AdminController.create);
r.delete(
  '/admin/questions/:id',
  authenticateToken,
  isAdmin,
  AdminController.archive,
);
r.patch(
  '/admin/questions/:id',
  authenticateToken,
  isAdmin,
  AdminController.update,
);
r.get(
  '/admin/questions/:id',
  authenticateToken,
  isAdmin,
  AdminController.getById,
);
r.post(
  '/admin/questions/:id/publish',
  authenticateToken,
  isAdmin,
  AdminController.publish,
);
r.get(
  '/admin/questions/:id/resources',
  authenticateToken,
  isAdmin,
  ResourcesController.getAdminQuestionResources,
);

export default r;

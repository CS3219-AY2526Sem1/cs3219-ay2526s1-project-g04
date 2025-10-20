// app/routes.ts

import { Router } from 'express';
import * as QuestionController from '../controllers/QuestionController';
import * as AdminController from '../controllers/AdminController';
import * as TopicController from '../controllers/TopicController';
import * as HealthController from '../controllers/HealthController';
import { requireRole } from '../middleware/auth';

const r = Router();

r.get('/healthz', HealthController.healthz);
r.get('/readyz', HealthController.readyz);

// Read
r.get('/questions/topics', TopicController.listPublished);
r.get('/questions/:id', QuestionController.getById);
r.get('/questions', QuestionController.list);
r.post('/select', QuestionController.select);
r.get('/topics', TopicController.list);

// admin
r.get('/admin/questions', requireRole('admin'), AdminController.list);
r.post('/admin/questions', requireRole('admin'), AdminController.create);
r.delete('/admin/questions/:id', requireRole('admin'), AdminController.archive);
r.patch('/admin/questions/:id', requireRole('admin'), AdminController.update);
r.get('/admin/questions/:id', requireRole('admin'), AdminController.getById);
r.post(
  '/admin/questions/:id/publish',
  requireRole('admin'),
  AdminController.publish,
);

export default r;

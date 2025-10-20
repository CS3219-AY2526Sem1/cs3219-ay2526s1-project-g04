// app/routes.ts

import { Router } from 'express';
import * as QuestionController from '../controllers/QuestionController';
import * as AdminController from '../controllers/AdminController';
import * as TopicController from '../controllers/TopicController';
import { requireRole } from '../middleware/auth';

const r = Router();

// Read
r.get('/questions/:id', QuestionController.getById);
r.get('/questions', QuestionController.list);
r.post('/select', QuestionController.select);
r.get('/topics', TopicController.list);

// admin
r.post('/admin/questions', requireRole('admin'), AdminController.create);
r.patch('/admin/questions/:id', requireRole('admin'), AdminController.update);
r.post(
  '/admin/questions/:id/publish',
  requireRole('admin'),
  AdminController.publish,
);

export default r;

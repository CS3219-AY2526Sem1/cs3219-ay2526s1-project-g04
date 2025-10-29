// src/app/ExpressApp.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes.js';
import { optionalAuth } from '../middleware/auth.js';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use(optionalAuth());
  app.use(routes);
  return app;
}

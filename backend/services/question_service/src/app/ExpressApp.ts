// src/app/ExpressApp.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes.js';
import { requestLogger } from '../middleware/requestLogger.js';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());

  // parse JSON bodies
  app.use(express.json({ limit: '1mb' }));

  // log every request/response line (method, path, status, ms, role, etc.)
  app.use(requestLogger);

  // actual application routes
  app.use(routes);

  return app;
}

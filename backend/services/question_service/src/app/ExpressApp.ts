import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes.js';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use(routes);
  return app;
}

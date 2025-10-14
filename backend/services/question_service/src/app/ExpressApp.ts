import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  app.use(routes);
  return app;
}

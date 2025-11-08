import express from 'express';
import type { MatchingServiceRedis } from '../clients/redis/redis_client.js';
import { logger } from '../logger/logger.js';
import { registerMatchRoutes } from './routes.js';
import type { Request, Response } from 'express';

export async function initServer(redis: MatchingServiceRedis) {
  const app = express();
  const port: number = Number(process.env['PORT']);

  app.use(express.json());

  app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
  });

  await registerMatchRoutes(app, redis);

  const server = app.listen(port, () =>
    logger.info(`[Server] Matching service running on port ${port}`),
  );

  server.on('error', (err) => {
    logger.error(`[Server] Failed to start: ${err}`);
    process.exit(1);
  });

  return server;
}

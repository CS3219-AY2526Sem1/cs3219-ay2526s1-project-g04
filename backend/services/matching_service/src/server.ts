import express from 'express';
import type { Request, Response } from 'express';
import { logger } from './logger/logger.js';

const app = express();
const port: number = 3003;

export async function initServer() {
  app.use(express.json());

  app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
  });

  const server = app.listen(port, () =>
    logger.info(`[Server] Matching service running on port ${port}`),
  );

  server.on('error', (err) => {
    logger.error(`[Server] Failed to start: ${err}`);
    process.exit(1);
  });

  return server;
}

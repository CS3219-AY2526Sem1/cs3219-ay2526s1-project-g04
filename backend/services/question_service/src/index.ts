// index.ts

import dotenv from 'dotenv';
dotenv.config();

import { buildApp } from './app/ExpressApp.js';
import { log } from './utils/logger.js';
import { prisma } from './repositories/prisma.js';
import http from 'http';

const port = Number(process.env['PORT'] || 3008);

async function main() {
  const app = buildApp();

  const server = http.createServer(app);

  server.on('error', (err) => {
    log.error({ err }, 'HTTP server error');
    process.exit(1);
  });

  server.listen(port, () => {
    log.info(
      {
        port,
        env: process.env['NODE_ENV'] || 'development',
      },
      'Question Service listening',
    );
  });

  const shutdown = async (signal: string) => {
    try {
      log.warn({ signal }, 'Shutting down...');
      server.close();
      await prisma.$disconnect();
    } catch (err) {
      log.error({ err }, 'Error during shutdown');
    }
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => {
    process.on(sig, () => void shutdown(sig));
  });

  process.on('unhandledRejection', (reason: unknown) => {
    log.error({ reason }, 'UNHANDLED REJECTION');
  });
  process.on('uncaughtException', (err: unknown) => {
    log.error({ err }, 'UNCAUGHT EXCEPTION');
    process.exit(1);
  });
}

main().catch((e) => {
  log.error({ e }, 'FATAL: main() threw');
  process.exit(1);
});

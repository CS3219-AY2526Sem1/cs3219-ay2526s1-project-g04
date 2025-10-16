// index.ts

import dotenv from 'dotenv';
dotenv.config();

import { buildApp } from './app/ExpressApp';
import { log } from './utils/logger';

const port = Number(process.env.PORT || 3000);

async function main() {
  const app = buildApp();
  app.listen(port, () => log.info(`Question Service listening on :${port}`));
}

main().catch((e) => {
  log.error(e);
  process.exit(1);
});

// communication_service/src/main.ts
import { MessageListener } from './listener.js';
import { DocManager } from './DocManager.js';
import { PostgresqlPersistence } from 'y-postgresql';

async function main() {
  // mirror collab service persistence setup
  const pgdb = await PostgresqlPersistence.build(
    {
      host: process.env.PG_HOST ?? 'localhost',
      port: parseInt(process.env.PG_PORT ?? '5432', 10),
      database: process.env.PG_DATABASE ?? 'postgres',
      user: process.env.PG_USER ?? 'postgres',
      password: process.env.PG_PASSWORD ?? '',
    },
    {
      tableName: 'yjs_documents',
      useIndex: false,
      flushSize: 200,
    },
  );

  const docs = new DocManager(pgdb);
  const listener = new MessageListener(docs);
  await listener.start();

  console.log('[comm] Communication service is listening for session.created');
}

main().catch((e) => {
  console.error('Communication service failed to start:', e);
  process.exit(1);
});

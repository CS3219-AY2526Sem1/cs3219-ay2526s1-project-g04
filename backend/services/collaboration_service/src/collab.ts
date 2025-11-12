import http from 'http';
import { WebSocketServer } from 'ws';
import { PostgresPrisma } from './data/postgres/postgres.js';
import { CollabRedis } from './data/collab_redis.js';
import { MessageListener } from './listener.js';
import { SessionManager } from './session/session_manager.js';
import { app } from './app.js';
import type { Express } from 'express';
import { PostgresqlPersistence } from 'y-postgresql';
import { setPersistence } from '@y/websocket-server/utils';
import * as Y from 'yjs';

export class Collab {
  public async start() {
    const { postgresDb, redis, pgdb } = await this.initDatabases();
    const server = this.initServer(app, pgdb);
    const webSocketServer = new WebSocketServer({ server });

    const sessionManager = SessionManager.getInstance(
      redis,
      postgresDb,
      webSocketServer,
      pgdb,
    );

    const listener = new MessageListener(sessionManager);
    await listener.start();
  }

  private async initDatabases() {
    const postgresDb = PostgresPrisma.getInstance();
    const redis = await CollabRedis.getInstance();
    const pgdb = await PostgresqlPersistence.build(
      {
        host: process.env['PG_HOST'] ?? 'localhost',
        port: parseInt(process.env['PG_PORT'] ?? '5432', 10),
        database: process.env['PG_DATABASE'] ?? 'postgres',
        user: process.env['PG_USER'] ?? 'postgres',
        password: process.env['PG_PASSWORD'] ?? '',
      },
      {
        tableName: 'yjs_documents',
        useIndex: false,
        flushSize: 200,
      },
    );

    return { postgresDb, redis, pgdb };
  }

  private initServer(app: Express, pgdb: PostgresqlPersistence) {
    const PORT = 3009;
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    setPersistence({
      provider: pgdb,
      bindState: async (docName, ydoc) => {
        console.log(`[y-postgres] Binding state for ${docName}`);

        const persistedYDoc = await pgdb.getYDoc(docName);
        Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYDoc));

        ydoc.on('update', async (update: Uint8Array) => {
          await pgdb.storeUpdate(docName, update);
        });
      },

      writeState: async (docName) => {
        console.log(`[y-postgres] writeState called for ${docName}}`);
        return Promise.resolve();
      },
    });

    return server;
  }
}

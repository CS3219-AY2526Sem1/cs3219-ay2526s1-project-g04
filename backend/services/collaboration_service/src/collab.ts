import http from 'http';
import { WebSocketServer } from 'ws';
import { PostgresPrisma } from './data/postgres/postgres.js';
import { CollabRedis } from './data/collab_redis.js';
import { MessageListener } from './listener.js';
import { SessionManager } from './session/session_manager.js';
import { MessagePublisher } from '@shared/messaging/src/publisher.js';
import { MESSAGE_TYPES } from '@shared/messaging/src/constants.js';
import { app } from './app.js';
import type { Express } from 'express';

export class Collab {
  public async start() {
    const { postgresDb, redis } = await this.initDatabases();
    const server = this.initServer(app);
    const webSockerServer = new WebSocketServer({ server });
    const sessionManager = new SessionManager(
      redis,
      postgresDb,
      webSockerServer,
    );

    const listener = new MessageListener(sessionManager);
    await listener.start();

    this.test_send_msg_to_collab();
  }

  private async initDatabases() {
    const postgresDb = PostgresPrisma.getInstance();
    const redis = await CollabRedis.getInstance();

    return { postgresDb, redis };
  }

  private initServer(app: Express) {
    const PORT = 3000;
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    return server;
  }

  /**
   * Below code is to be deleted
   * Mocks a message to trigger create session workflow
   * for debugging
   */
  private async test_send_msg_to_collab() {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const publisher = new MessagePublisher('mock');
    await publisher.connect();
    publisher.publishMessageWithType(
      MESSAGE_TYPES.CollaborationService,
      JSON.stringify({
        type: 'matched',
        matchedId: '123',
      }),
    );
  }
}

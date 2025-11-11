import http from 'http';
import { WebSocketServer } from 'ws';
import { app } from './app.js';
import type { Express } from 'express';
import { CommunicationRedis } from './data/communication_redis.js';
import { MessageListener } from './listener.js';
import { CommunicationManager } from './communication_manager.js';

export class Commmunication {
  public async start() {
    const server = this.initServer(app);
    const redis = await CommunicationRedis.getInstance();

    const webSocketServer = new WebSocketServer({ server });

    const commManager = new CommunicationManager(redis, webSocketServer);

    const listener = new MessageListener(commManager);
    await listener.start();
  }

  private initServer(app: Express) {
    const PORT = process.env.PORT;
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    return server;
  }
}

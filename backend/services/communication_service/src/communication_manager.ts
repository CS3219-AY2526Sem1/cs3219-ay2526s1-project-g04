import { CommunicationRedis } from './data/communication_redis.js';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/utils';
import * as Y from 'yjs';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';
import { COMMUNICATION_STATE } from './types/enums.js';

type SessionEntry = {
  matchedId: string;
  ydoc: Y.Doc;
};

export class CommunicationManager {
  private redis: CommunicationRedis;
  private wss: WebSocketServer;
  private sessions: Map<string, SessionEntry>; // session id key, match id value

  constructor(redis: CommunicationRedis, wss: WebSocketServer) {
    this.redis = redis;
    this.wss = wss;
    this.sessions = new Map<string, SessionEntry>();

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  // Created when session is formed
  public createDoc(matchedId: string, sessionId: string) {
    if (this.sessions.has(sessionId)) {
      console.log(
        `[CommunicationManager] Comms document already exists for session ${sessionId}`,
      );
      return;
    }

    const ydoc = new Y.Doc();
    ydoc.getArray('messages');
    ydoc.getArray('strokes');

    this.sessions.set(sessionId, { matchedId, ydoc });

    // console.log('sessions: ', this.sessions);

    this.redis.setCommunicationState(matchedId, COMMUNICATION_STATE.active);
    console.log(
      `[CommunicationManager] Created new doc with matchedId: ${matchedId} and sessId: ${sessionId}`,
    );
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    // Get param values
    const fullUrl = `ws://${req.headers.host}${req.url}`;
    const urlObj = new URL(fullUrl ?? '');
    const params = urlObj.searchParams;
    const userId = params.get('userId');
    const sessionId = urlObj.pathname.slice(1);

    if (!userId) {
      console.error('[CommunicationManager] Userid not received');
      return;
    }

    console.log(
      `[CommunicationManager] Handling connection for user ${userId} for session ${sessionId}`,
    );

    // console.log('sessions: ', this.sessions);

    if (!this.sessions.has(sessionId)) {
      console.log(
        '[CommunicationManager] ERROR, create doc is not run after session is created, creating doc entry without match id',
      );
      this.createDoc('', sessionId);
      return;
    }

    const { matchedId, ydoc } = this.sessions.get(sessionId)!;

    if (!this.redis.isUserInSession(matchedId, userId)) {
      console.log(
        `[CommunicationManager] user ${userId} don't belong in ${sessionId}`,
      );
      return;
    }

    // Setup y-websocket
    setupWSConnection(ws, req, { doc: ydoc });
    console.log(
      `[CommunicationManager] Connected user ${userId} to session ${sessionId} in communication service.`,
    );
  }
}

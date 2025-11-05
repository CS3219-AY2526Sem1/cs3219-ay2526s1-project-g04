import { CommunicationRedis } from './data/communication_redis.js';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/utils';
import * as Y from 'yjs';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';

export class CommunicationManager {
  private redis: CommunicationRedis;
  private wss: WebSocketServer;
  private sessionDict: Map<string, string>; // session id key, match id value
  private docs: Map<string, Y.Doc>; // session id -> Y.doc

  constructor(redis: CommunicationRedis, wss: WebSocketServer) {
    this.redis = redis;
    this.wss = wss;
    this.sessionDict = new Map<string, string>();

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  // Created when session is formed
  public createDoc(sessionId: string) {
    if (this.docs.has(sessionId)) {
      console.log(`[Doc] already exists for session ${sessionId}`);
      return this.docs.get(sessionId)!;
    }

    const doc = new Y.Doc();
    doc.getArray('messages');
    doc.getArray('strokes');

    this.docs.set(sessionId, doc);
    console.log(`[Doc] Created in-memory doc for session ${sessionId}`);
    return doc;
  }

  public destroyDoc(sessionId: string) {
    if (this.docs.has(sessionId)) {
      this.docs.delete(sessionId);
      console.log(`[Doc] Destroyed doc for session ${sessionId}`);
    }
    this.sessionDict.delete(sessionId);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    console.log('a client connected');

    // Get param values
    const fullUrl = `ws://${req.headers.host}${req.url}`;
    const urlObj = new URL(fullUrl ?? '');
    const params = urlObj.searchParams;
    const userId = params.get('userId');
    const sessionId = urlObj.pathname.slice(1);

    if (!this.sessionDict.has(sessionId)) {
      console.log(`session id not found in keypair dictionary: ${sessionId}`);
      return;
    }
    const matchId = this.sessionDict.get(sessionId);
    if (!this.redis.isUserInSession(matchId, userId)) {
      console.log(`user ${userId} don't belong in ${sessionId}`);
      return;
    }

    if (this.redis.isSessionDead(matchId)) {
      console.log(`session ${sessionId} has ended`);
      return;
    }

    const doc = this.docs.get(sessionId);
    // Setup y-websocket
    setupWSConnection(ws, req, { doc, docName: sessionId });
    console.log(`[WS] Connected user ${userId} to session ${sessionId}`);
  }
}

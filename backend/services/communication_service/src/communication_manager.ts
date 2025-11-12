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
  userAId: boolean;
  userBId: boolean;
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
      console.log(`[Doc] already exists for session ${sessionId}`);
      return;
    }

    const ydoc = new Y.Doc();
    ydoc.getArray('messages');
    ydoc.getArray('strokes');

    // means not connected yet
    const userAId = false;
    const userBId = false;

    this.sessions.set(sessionId, { matchedId, ydoc, userAId, userBId });

    // console.log('sessions: ', this.sessions);

    this.redis.setCommunicationState(matchedId, COMMUNICATION_STATE.created);
    console.log(
      `Created new doc with matchedId: ${matchedId} and sessId: ${sessionId}; set redis to "${COMMUNICATION_STATE.created}"`,
    );
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    console.log('a client connected in comms service');

    // Get param values
    const fullUrl = `ws://${req.headers.host}${req.url}`;
    const urlObj = new URL(fullUrl ?? '');
    const params = urlObj.searchParams;
    const userId = params.get('userId');
    const sessionId = urlObj.pathname.slice(1);

    console.log(
      `Handling connection for user ${userId} for session ${sessionId}`,
    );

    if (!this.sessions.has(sessionId)) {
      console.log(
        'ERROR: createDoc was not run after session was created — creating doc entry without match id',
      );
      this.createDoc('', sessionId);
      return;
    }

    const sessionEntry = this.sessions.get(sessionId)!;
    const { matchedId, ydoc } = sessionEntry;

    const { isUserAInSession, isUserBInSession } =
      await this.redis.isUserInSession(matchedId, userId);

    if (isUserAInSession) {
      sessionEntry.userAId = true;
      console.log(`User ${userId} set as userA in session ${sessionId}`);
    } else if (isUserBInSession) {
      sessionEntry.userBId = true;
      console.log(`User ${userId} set as userB in session ${sessionId}`);
    } else {
      console.log(`User ${userId} does not belong to matchedId ${matchedId}`);
      return;
    }

    // Update the session entry in the Map
    this.sessions.set(sessionId, sessionEntry);

    // Setup Yjs WebSocket connection
    setupWSConnection(ws, req, { doc: ydoc });
    console.log(
      `Connected user ${userId} to session ${sessionId} in communication service.`,
    );

    if (sessionEntry.userAId && sessionEntry.userBId) {
      await this.redis.setCommunicationState(
        matchedId,
        COMMUNICATION_STATE.active,
      );
      console.log(
        `Both users connected — set state to "${COMMUNICATION_STATE.active}" for matchedId ${matchedId}`,
      );
    } else {
      console.log(
        `Waiting for both users to connect... (A: ${sessionEntry.userAId}, B: ${sessionEntry.userBId})`,
      );
    }
  }
}

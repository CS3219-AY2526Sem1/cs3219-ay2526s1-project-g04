import { CollabRedis } from '../data/collab_redis.js';
import { PostgresPrisma } from '../data/postgres/postgres.js';
import { Session } from './session.js';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/utils';
import { PostgresqlPersistence } from 'y-postgresql';
import { MessagePublisher } from '@shared/messaging/src/publisher.js';
import * as Y from 'yjs';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';
import { MESSAGE_TYPES } from '@shared/messaging/src/constants.js';

export enum SESSIONSTATE {
  notCreated = 'notCreated',
  created = 'created',
  active = 'active',
  end = 'end',
}

type SessionEntry = {
  session: Session;
  matchedId: string;
};

export enum SessionTerminations {
  endByUser = 0,
  timeout = 1,
}
interface QuestionResponse {
  starter_code?: string;
}

export class SessionManager {
  private sessions: Record<string, SessionEntry>;
  private redis: CollabRedis;
  private db: PostgresPrisma;
  private wss: WebSocketServer;
  private pgdb: PostgresqlPersistence;
  private static instance: SessionManager;

  private constructor(
    redis: CollabRedis,
    db: PostgresPrisma,
    wss: WebSocketServer,
    pgdb: PostgresqlPersistence,
  ) {
    this.redis = redis;
    this.db = db;
    this.wss = wss;
    this.sessions = {};
    this.pgdb = pgdb;

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  public static getInstance(
    redis?: CollabRedis,
    db?: PostgresPrisma,
    wss?: WebSocketServer,
    pgdb?: PostgresqlPersistence,
  ) {
    if (!SessionManager.instance) {
      if (!redis || !db || !wss || !pgdb) {
        throw new Error('SessionManager not initialized yet.');
      }
      SessionManager.instance = new SessionManager(redis, db, wss, pgdb);
    }
    return SessionManager.instance;
  }

  // Creates a new session from match data and initializes Yjs persistence
  public async createSession(matchedId: string) {
    //Get data from redis
    const matchedData: Record<string, string> =
      await this.redis.getMatchedData(matchedId);

    //Create session id
    const sessionId: number = await this.db.createSessionDataModel(
      Number(matchedData['userAId']),
      Number(matchedData['userBId']),
      matchedData['questionId'] ?? '',
    );

    // create session object
    const session = new Session(
      sessionId,
      Number(matchedData['userAId']),
      Number(matchedData['userBId']),
      matchedData['questionId'] ?? '',
    );
    this.sessions[sessionId] = {
      session: session,
      matchedId: matchedId,
    };

    //Set in redis
    this.redis.addSessionDataToUser(
      sessionId.toString(),
      matchedId,
      SESSIONSTATE.created,
    );

    // Initialize Yjs document and load starter code from Question Service
    const ydoc = new Y.Doc();
    const yText = ydoc.getText('monaco');
    try {
      const questionUrl = process.env['QUESTIONURL'];
      const res = await fetch(
        `${questionUrl}/questions/${matchedData['questionId']}`,
      );
      const resJson: QuestionResponse = await res.json();
      if (resJson['starter_code']) yText.insert(0, resJson['starter_code']);
    } catch (error) {
      console.log(`[SessionManager] Unable to fetch:`, error);
    }

    const docName = sessionId.toString();

    this.pgdb.storeUpdate(docName, Y.encodeStateAsUpdate(ydoc));
    console.log(`[SessionManager] Document initialized for session ${docName}`);

    // Initialize communication service documents
    const broker = new MessagePublisher('CollaborationService');
    await broker.connect();

    const payload = JSON.stringify({
      type: 'create',
      matchedId,
      sessionId,
    });

    await broker.publishMessageWithType(
      MESSAGE_TYPES.CommunicationService,
      payload,
    );
    console.log(
      `[SessionManager] Sent session creation for ${sessionId} (match ${matchedId}) to communication service`,
    );
  }

  public endSession(sessionId: string) {
    const matchingId = this.sessions[sessionId]?.matchedId;
    if (!matchingId) {
      return;
    }
    this.db.setTerminationSession(
      Number(sessionId),
      SessionTerminations.endByUser,
    );

    this.redis.setSessionState(sessionId, matchingId, SESSIONSTATE.end);
    delete this.sessions[sessionId];
  }

  // Retrieves the session and communication state for a given matchedId
  public async getSessionStateByMatchedId(
    matchedId: string,
  ): Promise<Record<string, string>> {
    const sessionData = await this.redis.getSessionState(matchedId);
    if (
      sessionData &&
      sessionData['session_state'] &&
      sessionData['session_id']
    ) {
      if (sessionData['communication_state']) {
        return {
          session_state: sessionData['session_state'],
          session_id: sessionData['session_id'],
          communication_state: sessionData['communication_state'],
        };
      } else {
        return {
          session_state: sessionData['session_state'],
          session_id: sessionData['session_id'],
          communication_state: SESSIONSTATE.notCreated.valueOf(),
        };
      }
    } else {
      return {
        session_state: SESSIONSTATE.notCreated.valueOf(),
        session_id: SESSIONSTATE.notCreated.valueOf(),
        communication_state: SESSIONSTATE.notCreated.valueOf(),
      };
    }
  }

  // Retrieves the session state for a specific sessionId from Redis
  public async getSessionState(
    session_id: string,
  ): Promise<Record<string, string>> {
    const matchedId = this.sessions[session_id]?.matchedId;
    if (!matchedId) {
      throw new Error(
        `session cannot be found during state retrieval" ${session_id}`,
      );
    }
    const sessionData = await this.redis.getSessionState(matchedId);
    const toRet = {
      session_state: sessionData['session_state']
        ? sessionData['session_state']
        : 'NOTFOUND',
    };
    return toRet;
  }

  // Finds and returns an active session ID for a specific user
  public getActiveSessionForUser(userId: number): number | undefined {
    const sessionItem = Object.values(this.sessions).find((item) =>
      item.session.getUsers().includes(userId.toString()),
    );

    if (sessionItem) {
      return sessionItem.session.getId();
    }
  }

  // Retrieves the question ID associated with a given session
  public getSessionsQuestion(sessionId: number): string | undefined {
    const session = this.getSessionById(sessionId);
    return session?.getQuestionId();
  }

  // Returns the other user's ID in the session (besides the current user)
  public getSessionsOtherUser(
    sessionId: number,
    userId: number,
  ): number | undefined {
    const session = this.getSessionById(sessionId);
    const users = session?.getUsers();
    if (users) {
      if (Number(users[0]) !== userId) {
        return Number(users[0]);
      } else {
        return Number(users[1]);
      }
    }
  }

  // Marks a session as having passed code validation
  public setCodePassedSession(sessionId: number): void {
    this.db.setCodePassedBySession(sessionId);
  }

  // Handles incoming WebSocket client connections and attaches them to Yjs docs
  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    // console.log('a client connected');

    // Get param values
    const fullUrl = `ws://${req.headers.host}${req.url}`;
    const urlObj = new URL(fullUrl ?? '');
    const params = urlObj.searchParams;
    const userId = Number(params.get('userId'));
    const sessionId = Number(urlObj.pathname.slice(1));
    const session = this.getSessionById(sessionId);
    // console.log(fullUrl);

    console.log(`[SessionManager] Client ${userId} connected`);

    if (!session) {
      console.log(
        `[SessionManager] Session id not found in session manager: ${sessionId}`,
      );
      return;
    }

    // Setup y-websocket
    setupWSConnection(ws, req, { docName: sessionId.toString() });

    // Ensures only correct user's client are added into session
    if (sessionId === session?.getId()) {
      if (session?.userNotReady(userId)) {
        session?.readyUser(userId);
      }
    }

    if (session?.allReady()) {
      console.log(`[SessionManager] All users are ready in ${sessionId}`);
      this.setSessionToReady(session);
    }
  }

  // Updates a session’s state to 'active' once all users are connected
  private setSessionToReady(session: Session) {
    const sessionMetaData = this.sessions[session.getId()];
    this.redis.setSessionState(
      session.getId().toString(),
      sessionMetaData!.matchedId,
      SESSIONSTATE.active,
    );
  }

  // Retrieves a session object by its session ID from the local memory map
  private getSessionById(sessionId: number): Session | undefined {
    return this.sessions[sessionId]?.session;
  }
}

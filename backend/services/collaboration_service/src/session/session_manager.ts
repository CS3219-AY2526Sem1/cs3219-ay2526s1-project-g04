import { CollabRedis } from '../data/collab_redis.js';
import { PostgresPrisma } from '../data/postgres/postgres.js';
import { Session } from './session.js';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/utils';
import { PostgresqlPersistence } from 'y-postgresql';
import * as Y from 'yjs';
import type { IncomingMessage } from 'http';
import type WebSocket from 'ws';

export enum SESSIONSTATE {
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
    this.sessions = {
      40: {
        session: new Session(40, 1, 2, 'two_sum'),
        matchedId: '123',
      },
    };
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

  public async createSession(matchedId: string) {
    //Get data from redis
    const matchedData: Record<string, string> =
      await this.redis.getMatchedData(matchedId);

    //Create session id
    const sessionId: number = await this.db.createSessionDataModel(
      Number(matchedData['user_a']),
      Number(matchedData['user_b']),
      matchedData['question_id'] ?? '',
    );

    // create session object
    const session = new Session(
      sessionId,
      Number(matchedData['user_a']),
      Number(matchedData['user_b']),
      matchedData['question_id'] ?? '',
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

    // const sessionId = await this.db.createSessionDataModel(...);
    const ydoc = new Y.Doc();
    const docName = sessionId.toString();

    const yText = ydoc.getText('monaco');
    yText.insert(
      0,
      `def twoSum(nums, target):
    # Write your solution here
    pass
    `,
    );

    this.pgdb.storeUpdate(docName, Y.encodeStateAsUpdate(ydoc));
    console.log(`[y-postgres] Document initialized for session ${docName}`);

    async function logPersistedDoc(
      pgdb: PostgresqlPersistence,
      docName: string,
    ) {
      setInterval(async () => {
        try {
          const ydoc = await pgdb.getYDoc(docName);

          const yText = ydoc.getText('monaco');

          console.log(
            `\n[Y.PostgreSQL Snapshot @${new Date().toLocaleTimeString()}]`,
          );
          console.log(`Document: ${docName}`);
          console.log(yText.toString() || '(empty)');
        } catch (err) {
          console.error(`Failed to load persisted doc ${docName}:`, err);
        }
      }, 20_000); // every 20 seconds
    }

    logPersistedDoc(this.pgdb, sessionId.toString());
  }

  public saveSession(sessionId: string) {
    this.sessions[sessionId]?.session?.save();
  }

  public endSession(sessionId: string, userId: string) {
    this.sessions[sessionId]?.session.end(userId);
    this.db.setTerminationSession(
      Number(sessionId),
      SessionTerminations.endByUser,
    );
  }

  public async getSessionState(
    session_id: string,
  ): Promise<Record<string, string>> {
    const matchedId = this.sessions[session_id]?.matchedId;
    if (!matchedId) {
      throw new Error(
        `session cannot be found during state retrieval" ${session_id}`,
      );
    }
    const session_state = await this.redis.getSessionState(matchedId);
    const toRet = {
      session_state: session_state ? session_state : 'NOTFOUND',
    };
    return toRet;
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    console.log('a client connected');

    // Get param values
    const fullUrl = `ws://${req.headers.host}${req.url}`;
    const urlObj = new URL(fullUrl ?? '');
    const params = urlObj.searchParams;
    const userId = Number(params.get('userId'));
    const sessionId = Number(urlObj.pathname.slice(1));
    const session = this.getSessionById(sessionId);
    console.log(fullUrl);

    if (!session) {
      console.log(`session id not found in session manager: ${sessionId}`);
      return;
    }
    console.log(`sessionId in ws url : ${sessionId}`);
    console.log(`sessionId in created session obj ${session?.getId()}`);

    // Setup y-websocket
    setupWSConnection(ws, req, { docName: sessionId.toString() });

    // Ensures only correct user's client are added into session
    if (sessionId === session?.getId()) {
      if (session?.userNotReady(userId)) {
        session?.readyUser(userId);
      }
    }

    if (session?.allReady()) {
      console.log(`all ready in ${sessionId}`);
      this.setSessionToReady(session);
    }
  }

  private setSessionToReady(session: Session) {
    const sessionMetaData = this.sessions[session.getId()];
    this.redis.setSessionState(
      session.getId().toString(),
      sessionMetaData!.matchedId,
      SESSIONSTATE.active,
    );
  }

  private getSessionById(sessionId: number): Session | undefined {
    return this.sessions[sessionId]?.session;
  }
}

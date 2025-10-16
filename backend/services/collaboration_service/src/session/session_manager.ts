import { CollabRedis } from '../data/collab_redis.js';
import { PostgresPrisma } from '../data/postgres/postgres.js';
import { Session } from './session.js';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server/utils';

export enum SESSIONSTATE {
  created = 'created',
  active = 'active',
  end = 'end',
}

type SessionEntry = {
  session: Session;
  matchedId: string;
};

export class SessionManager {
  private sessions: Record<string, SessionEntry>;
  private redis: CollabRedis; 
  private db: PostgresPrisma;
  private wss: WebSocketServer;

  constructor(redis: CollabRedis, db: PostgresPrisma, wss: WebSocketServer) {
    this.redis = redis;
    this.db = db;
    this.wss = wss;
    this.sessions = {};
  }

  public async createSession(matchedId: string) {
    //Get data from redis
    const matchedData: Record<string, any> =
      await this.redis.getMatchedUser(matchedId);

    //Create session id
    const sessionId: number = await this.db.createSessionDataModel(
      Number(matchedData['user_a']),
      Number(matchedData['user_b']),
    );

    // create session object
    const session = new Session(
      sessionId,
      Number(matchedData['user_a']),
      Number(matchedData['user_b']),
    );
    this.sessions[sessionId] = {
      session: session,
      matchedId: matchedId,
    };

    this.handleConnection(session);

    //Set in redis
    this.redis.addSessionDataToUser(
      sessionId.toString(),
      matchedId,
      SESSIONSTATE.created,
    );
  }

  public saveSession(sessionId: string) {
    this.sessions[sessionId]?.session?.save();
  }

  public endSession(sessionId: string) {
    this.sessions[sessionId]?.session.end();
  }

  private handleConnection(session: Session) {
    this.wss.on('connection', (ws, req) => {
      console.log('a client connected');

      // Get param values
      const fullUrl = `ws://${req.headers.host}${req.url}`;
      const urlObj = new URL(fullUrl ?? '');
      const params = urlObj.searchParams;
      const userId = Number(params.get('userId'));
      const sessionId = Number(urlObj.pathname.slice(1));
      console.log(`sessionId in ws url :${sessionId}`);
      console.log(`sessionId in created session obj ${session.getId()}`);

      // Setup y-websocket
      setupWSConnection(ws, req);

      // Ensures only correct user's client are added into session
      if (sessionId === session.getId()) {
        if (session.userNotReady(userId)) {
          session.readyUser(userId);
        }
      }

      if (session.allReady()) {
        console.log(`all ready in ${sessionId}`);
        this.setSessionToReady(session);
      }
    });
  }

  private setSessionToReady(session: Session) {
    const sessionMetaData = this.sessions[session.getId()];
    this.redis.setSessionState(
      session.getId().toString(),
      sessionMetaData!.matchedId,
      SESSIONSTATE.active,
    );
  }
}

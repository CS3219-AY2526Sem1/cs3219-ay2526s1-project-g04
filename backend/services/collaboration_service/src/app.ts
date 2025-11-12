import express, { type Response } from 'express';
import cors from 'cors';
import { PostgresPrisma } from './data/postgres/postgres.js';
import { PostgresqlPersistence } from 'y-postgresql';
import { error } from 'console';
import { SessionManager } from './session/session_manager.js';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';

export const app = express();
const db = PostgresPrisma.getInstance();
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

app.use(cors());
app.use(express.json());

app.get('/healthz', (req, res) => {
  res.status(200).send('Collab service is alive');
});

app.get(
  '/sessions/me',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(400).json({ error: 'Invalid userId' });
      }
      const sessions = await db.getPastSessionsByUser(Number(userId));
      const toRet = sessions.map((session) => {
        const userAId = session.users?.UserAId ?? null;
        const userBId = session.users?.UserBId ?? null;

        return {
          id: session.id,
          questionId: session.questionId,
          solved: session.solved,
          endedAt: session.endedAt,
          UserAId: userAId,
          UserBId: userBId,
        };
      });
      res.json(toRet);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

app.get(
  '/sessions/me/active',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(400).json({ error: 'Invalid userId' });
      }
      const sessionManager = SessionManager.getInstance();
      const activeSessionId =
        sessionManager.getActiveSessionForUser(Number(userId)) ?? 1;
      if (!activeSessionId) {
        res.send({
          sessionId: '',
          questionId: '',
          partnerId: '',
        });
      }
      const questionId = sessionManager.getSessionsQuestion(activeSessionId);
      const buddyId = sessionManager.getSessionsOtherUser(
        activeSessionId,
        Number(userId),
      );
      const activeSession = {
        sessionId: activeSessionId,
        questionId: questionId,
        partnerId: buddyId,
      };
      res.json(activeSession);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

app.post(
  '/sessions/passed/:sessionId',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const sessionId = Number(req.params['sessionId']);
      if (!sessionId) {
        return res.status(400).json({ error: 'Invalid sessionId' });
      }
      const sessionManager = SessionManager.getInstance();
      sessionManager.setCodePassedSession(sessionId);
      res.status(204).end();
    } catch (error) {
      console.error('Error saving code in sessions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

app.get('/sessions/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params['userId']);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const sessions = await db.getPastSessionsByUser(userId);
    res.json(sessions);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/sessions/status/matched/:matchedId', async (req, res) => {
  try {
    const matchedId = req.params.matchedId;
    const sessionManager = SessionManager.getInstance();
    const sessionData =
      await sessionManager.getSessionStateByMatchedId(matchedId);
    // console.log('states for: ', matchedId, sessionData);
    res.json({
      sessionState: sessionData['session_state'],
      sessionId: sessionData['session_id'],
      communicationState: sessionData['communication_state'],
    });
  } catch (err) {
    console.error('Error getting sessionstate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/sessions/status/session/:sessionId', async (req, res) => {
  try {
    const matchedId = req.params.sessionId;
    const sessionManager = SessionManager.getInstance();
    const sessionData = await sessionManager.getSessionState(matchedId);
    // console.log(sessionData);
    res.json({
      sessionState: sessionData['session_state'],
    });
  } catch (err) {
    console.error('Error getting sessionstate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/sessions/:sessionId/user/:userId', async (req, res) => {
  try {
    const sessionManager = SessionManager.getInstance();
    const sessionId = req.params.sessionId;
    sessionManager.endSession(sessionId);
    res.status(204).send();
  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/document/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    // console.log(`[GET /document] Fetching Y.Doc for session ${sessionId}`);

    const ydoc = await pgdb.getYDoc(sessionId);
    const yText = ydoc.getText('monaco');
    const content = yText.toString() || '';

    res.json({
      sessionId,
      content,
      length: content.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Failed to load persisted doc ${req.params.sessionId}:`, err);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

app.get('/question/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  // console.log(sessionId);
  try {
    const questionId = await db.getQuestionIdBySessionId(Number(sessionId));
    if (!questionId) {
      throw error;
    }

    res.status(200).json({
      question_id: questionId,
    });
  } catch (err) {
    console.error(`Error fetching questionId for sesssion: ${sessionId}`, err);
  }
});

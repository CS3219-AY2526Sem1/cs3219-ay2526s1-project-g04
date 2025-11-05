import express from 'express';
import cors from 'cors';
import { PostgresPrisma } from './data/postgres/postgres.js';
import { PostgresqlPersistence } from 'y-postgresql';
import { error } from 'console';
import { SessionManager } from './session/session_manager.js';
import { CollabRedis } from './data/collab_redis.js';

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

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Collab service is alive');
});

app.get('/sessions/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
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

app.get('/sessions/status/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const sessionManager = SessionManager.getInstance();
    const session_state = await sessionManager.getSessionState(sessionId);
    console.log(session_state);
    res.json(session_state);
  } catch (err) {
    console.error('Error getting sessionstate:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/sessions/:sessionId/user/:userId', async (req, res) => {
  try {
    const sessionManager = SessionManager.getInstance();
    const sessionId = req.params.sessionId;
    const userId = req.params.userId;
    sessionManager.endSession(sessionId, userId);
    res.status(204).send();
  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/document/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    console.log(`[GET /document] Fetching Y.Doc for session ${sessionId}`);

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
  console.log(sessionId);
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

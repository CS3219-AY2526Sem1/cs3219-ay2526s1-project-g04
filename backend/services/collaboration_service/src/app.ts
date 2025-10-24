import express from 'express';
import { PostgresPrisma } from './data/postgres/postgres.js';
/**
 * This file handles all the endpoints
 * Routing will be used if endpoints get too large
 */

export const app = express();
const db = PostgresPrisma.getInstance();
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

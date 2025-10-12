import express from 'express';

/**
 * This file handles all the endpoints
 * Routing will be used if endpoints get too large
 */

export const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Collab service is alive');
});

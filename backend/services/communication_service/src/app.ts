import express from 'express';
import cors from 'cors';
import { error } from 'console';

export const app = express();

app.use(cors({ origin: 'http://localhost:3013' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Communication service is alive');
});

import express from 'express';
import cors from 'cors';

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/healthz', (req, res) => {
  res.status(200).send('Communication service is alive');
});

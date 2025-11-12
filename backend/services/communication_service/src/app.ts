import express from 'express';
import cors from 'cors';

export const app = express();
const PORT = process.env.PORT;
app.use(cors({ origin: `http://localhost:${PORT}` }));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Communication service is alive');
});

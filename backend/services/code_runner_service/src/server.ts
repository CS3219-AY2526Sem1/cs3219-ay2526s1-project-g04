// backend/services/code_runner_service/src/server.ts
import express from 'express';
import { exec } from 'child_process';

const app = express();
app.use(express.json());

app.post('/run', (req, res) => {
  const { language, code } = req.body;

  // Simple safety: only JS for now
  if (language !== 'javascript') {
    return res.status(400).json({ error: 'Only JavaScript supported' });
  }

  // Run using Node locally
  exec(`node -e "${code.replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
    res.json({
      stdout,
      stderr,
      exitCode: err?.code ?? 0,
    });
  });
});

app.listen(5000, () => {
  console.log('Code runner service listening on http://localhost:5000');
});

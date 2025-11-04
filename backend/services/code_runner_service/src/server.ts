import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * POST /run
 * Runs a single Python code snippet
 */
app.post('/run', (req, res) => {
  const { code, input } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code.' });

  console.log(`[RUNNER] Executing Python code:\n${code}`);

  const args = [
    'run',
    '--rm',
    '--network=none',
    '--cpus=1',
    '--memory=256m',
    'python:3.11-alpine',
    'sh',
    '-c',
    `echo "${escapeForShell(code)}" > /tmp/main.py && python3 /tmp/main.py`,
  ];

  const child = spawn('docker', args, { shell: false });
  let stdout = '',
    stderr = '';

  if (input) {
    child.stdin.write(input);
    child.stdin.end();
  }

  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));

  const timeout = setTimeout(() => {
    stderr += '\nTimeout: execution exceeded 3s.\n';
    child.kill('SIGKILL');
  }, 5000);

  child.on('error', (err) => {
    clearTimeout(timeout);
    console.error('[Runner] spawn error:', err);
    if (!res.headersSent)
      res.status(500).json({ error: 'Failed to start container.' });
  });

  child.on('close', (code) => {
    clearTimeout(timeout);
    if (!res.headersSent)
      res.json({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code,
      });
  });
});

/**
 * POST /batch-run
 * Runs the same Python function for multiple input cases and logs results.
 */
app.post('/batch-run', async (req, res) => {
  const { code, inputs } = req.body;
  if (!code || !Array.isArray(inputs))
    return res.status(400).json({ error: 'Missing code or inputs array.' });

  // Extract function name
  const funcNameMatch = code.match(/def\s+(\w+)\s*\(/);
  const funcName = funcNameMatch ? funcNameMatch[1] : 'user_function';

  // Wrap code
  const wrapper = `
${code}

if __name__ == "__main__":
    import sys, json
    inputs = json.loads(sys.argv[1])
    for case in inputs:
        try:
            result = ${funcName}(*case)
            print(json.dumps(result))  # JSON-encoded output for easy parsing
        except Exception as e:
            print(json.dumps(f"Error: {e}"))
`;

  // Docker args
  const args = [
    'run',
    '--rm',
    '--network=none',
    '--cpus=1',
    '--memory=256m',
    'python:3.11-alpine',
    'sh',
    '-c',
    `echo "${escapeForShell(wrapper)}" > /tmp/main.py && python3 /tmp/main.py '${JSON.stringify(
      inputs,
    )}'`,
  ];

  console.log(
    `[BATCH-RUN] Running Python function "${funcName}" on ${inputs.length} inputs...`,
  );
  console.log(`[INPUTS]`, JSON.stringify(inputs, null, 2));

  const child = spawn('docker', args, { shell: false });
  let stdout = '',
    stderr = '';

  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));

  const timeout = setTimeout(() => {
    stderr += '\nTimeout: execution exceeded 3s.\n';
    child.kill('SIGKILL');
  }, 5000);

  child.on('error', (err) => {
    clearTimeout(timeout);
    console.error('[Runner] spawn error:', err);
    if (!res.headersSent)
      res.status(500).json({ error: 'Failed to start container.' });
  });

  child.on('close', (code) => {
    clearTimeout(timeout);

    const rawOutputs = stdout.trim().split('\n').filter(Boolean);
    const parsedOutputs = rawOutputs.map((o) => {
      try {
        return JSON.parse(o);
      } catch {
        return o;
      }
    });

    // Log inputs/outputs in aligned format
    console.log(`\n[RESULTS for ${funcName}]`);
    inputs.forEach((inp: any, i: number) => {
      console.log(`  Input ${i + 1}:`, JSON.stringify(inp));
      console.log(`  Output ${i + 1}:`, parsedOutputs[i]);
    });

    if (!res.headersSent)
      res.json({
        inputs,
        outputs: parsedOutputs,
        stderr: stderr.trim(),
        exitCode: code,
      });
  });
});

function escapeForShell(input: string): string {
  return input.replace(/(["\\$`])/g, '\\$1');
}

app.listen(5000, () => console.log('Python Runner ready on :5000'));

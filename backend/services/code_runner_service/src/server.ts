import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Ping
 */
app.get('/healthz', (req, res) => {
  res.status(200).send('Comms service is alive');
});

/**
 * Executes a single Python code snippet inside a sandboxed Docker container
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

  // Provide optional user input to the process
  if (input) {
    child.stdin.write(input);
    child.stdin.end();
  }

  // Collect standard output and error streams
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));

  // Timeout guard to prevent long code execution or infinite loops
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

  // Return final result once the Python process exits
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
 * Executes a Python solution across multiple input test cases (used for auto-grading)
 */
app.post('/batch-run', async (req, res) => {
  const { code, inputs, entryPoint } = req.body;

  if (!code || !entryPoint)
    return res.status(400).json({ error: 'Missing code or entryPoint.' });

  if (!Array.isArray(inputs))
    return res.status(400).json({ error: 'Inputs must be an array.' });

  const [className, methodName] = entryPoint.split('.');
  console.log(`\n[BATCH-RUN] Entry: ${entryPoint}`);
  console.log(`[BATCH-RUN] Inputs: ${JSON.stringify(inputs, null, 2)}`);

  // Wraps user code to execute against test cases. Note that structure TreeNode is added along with the helper function only for development purposes.
  const wrapper = `
${code}

if __name__ == "__main__":
    import sys, json, ast

    try:
        inputs = json.loads(sys.argv[1])
    except Exception:
        inputs = []

    solver = ${className}()
    method = getattr(solver, "${methodName}")

    # No inputs (e.g., SQL or static-return problems)
    if not inputs:
        try:
            result = method()
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps(f"Error: {e}"))
    else:
        for case in inputs:
            try:
                args = ast.literal_eval(case)
                if not isinstance(args, (tuple, list)):
                    args = [args]

                # Special handling for tree-based problems (LeetCode-style)
                if method.__name__ in ("isValidBST", "maxDepth", "invertTree", "sortedArrayToBST"):
                    class TreeNode:
                        def __init__(self, val=0, left=None, right=None):
                            self.val = val
                            self.left = left
                            self.right = right

                    from collections import deque
                    def build_tree(nodes):
                        if not nodes:
                            return None
                        root = TreeNode(nodes[0])
                        q = deque([root])
                        i = 1
                        while q and i < len(nodes):
                            node = q.popleft()
                            if i < len(nodes) and nodes[i] is not None:
                                node.left = TreeNode(nodes[i])
                                q.append(node.left)
                            i += 1
                            if i < len(nodes) and nodes[i] is not None:
                                node.right = TreeNode(nodes[i])
                                q.append(node.right)
                            i += 1
                        return root

                    # convert first arg (list) → TreeNode
                    args = [build_tree(args[0])]

                result = method(*args)
                print(json.dumps(result))
            except Exception as e:
                print(json.dumps(f"Error: {e}"))
`;

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

  console.log(`[BATCH-RUN] Executing Docker sandbox...`);
  const child = spawn('docker', args, { shell: false });
  let stdout = '',
    stderr = '';

  // Capture process output streams
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));

  // 30-second timeout for large test batches
  const timeout = setTimeout(() => {
    stderr += '\nTimeout: execution exceeded 30s.\n';
    child.kill('SIGKILL');
  }, 30000);

  child.on('error', (err) => {
    clearTimeout(timeout);
    console.error('[Runner] spawn error:', err);
    if (!res.headersSent)
      res.status(500).json({ error: 'Failed to start container.' });
  });

  // Parse and return all test outputs once the batch completes
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

    console.log(`\n[RESULTS for ${entryPoint}]`);
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

/**
 * Escapes special shell characters to prevent injection in Docker command
 */
function escapeForShell(input: string): string {
  // Escape quotes, $, backslashes, and backticks safely
  return input.replace(/(["\\$`])/g, '\\$1');
}

/**
 * Start server on port 3010
 */
app.listen(3010, () => console.log('Code runner service ready on :3010'));

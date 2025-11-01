// src/utils/logger.ts
import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type LogArgs = ReadonlyArray<unknown>;
type Level = 'INFO' | 'WARN' | 'ERROR';

const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// single shared append stream
let fileStream: ReturnType<typeof createWriteStream> | null = null;

function initFileStream() {
  if (fileStream) return fileStream;

  const logDir = join(process.cwd(), 'logs');
  const logFile = join(logDir, 'app.log');

  try {
    mkdirSync(logDir, { recursive: true });

    fileStream = createWriteStream(logFile, {
      flags: 'a', // append mode
      encoding: 'utf8',
    });

    fileStream.on('error', (err) => {
      process.stderr.write(
        `[LOGGER-ERROR] Failed to write to log file: ${String(
          (err as Error)?.message ?? err,
        )}\n`,
      );
      fileStream = null;
    });
  } catch (e) {
    process.stderr.write(
      `[LOGGER-ERROR] Failed to init log dir/stream: ${String(
        (e as Error)?.message ?? e,
      )}\n`,
    );
    fileStream = null;
  }

  return fileStream;
}

function serialize(value: unknown): string {
  if (value instanceof Error) {
    return value.stack
      ? `${value.name}: ${value.message}\n${value.stack}`
      : `${value.name}: ${value.message}`;
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }

  return String(value);
}

function fmtArgs(args: LogArgs): string {
  return args.map(serialize).join(' ');
}

function ts() {
  return new Date().toISOString();
}

function write(level: Level, ...a: LogArgs) {
  const line = `[${ts()}] [${level}] ${fmtArgs(a)}\n`;

  // always print to console for live debugging / docker logs
  if (level === 'ERROR' || level === 'WARN') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }

  // mirror to file in ALL envs except test
  if (NODE_ENV !== 'test') {
    const stream = initFileStream();
    if (stream) {
      stream.write(line);
    }
  }
}

export const log = {
  info: (...a: unknown[]) => {
    write('INFO', ...a);
  },
  warn: (...a: unknown[]) => {
    write('WARN', ...a);
  },
  error: (...a: unknown[]) => {
    write('ERROR', ...a);
  },
};

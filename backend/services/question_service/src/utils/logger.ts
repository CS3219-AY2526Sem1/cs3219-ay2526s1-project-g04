// src/utils/logger

type LogArgs = ReadonlyArray<unknown>;

function serialize(value: unknown): string {
  if (value instanceof Error) {
    // include stack if available
    return value.stack
      ? `${value.name}: ${value.message}\n${value.stack}`
      : `${value.name}: ${value.message}`;
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      // fallback for circular objects
      return '[Object]';
    }
  }
  return String(value);
}

function fmt(args: LogArgs): string {
  return args.map(serialize).join(' ');
}

export const log = {
  info: (...a: unknown[]) => {
    process.stdout.write(`[INFO] ${fmt(a)}\n`);
  },
  warn: (...a: unknown[]) => {
    process.stderr.write(`[WARN] ${fmt(a)}\n`);
  },
  error: (...a: unknown[]) => {
    process.stderr.write(`[ERROR] ${fmt(a)}\n`);
  },
};

// src/utils/env.ts
// Load .env ASAP and validate required variables.
import 'dotenv/config';

function must(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env: ${name}`);
  return v.trim();
}

export const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
export const AWS_REGION = process.env['AWS_REGION'] ?? 'ap-southeast-1';
export const S3_BUCKET = must('S3_BUCKET'); // <- will throw if not set
export const AWS_ACCESS_KEY_ID =
  process.env['AWS_ACCESS_KEY_ID'] || process.env['ACCESS_KEY'] || '';
export const AWS_SECRET_ACCESS_KEY =
  process.env['AWS_SECRET_ACCESS_KEY'] || process.env['SECRET_KEY'] || '';
export const S3_ENDPOINT = process.env['S3_ENDPOINT'] || '';
export const S3_FORCE_PATH_STYLE =
  (process.env['S3_FORCE_PATH_STYLE'] || '').toLowerCase() === 'true';
export const SIGNED_URL_TTL_SECONDS = Number(
  process.env['SIGNED_URL_TTL_SECONDS'] || 900,
);

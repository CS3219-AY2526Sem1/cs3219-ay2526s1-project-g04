// src/utils/s3.ts

import { S3Client } from '@aws-sdk/client-s3';

const region = process.env['AWS_REGION'] || 'ap-southeast-1';

export const s3 = new S3Client({ region });
export const S3_BUCKET = process.env['S3_BUCKET']!;
export const SIGNED_URL_TTL_SECONDS = Number(
  process.env['SIGNED_URL_TTL_SECONDS'] || 900,
);

// src/utils/s3.ts
import { S3Client } from '@aws-sdk/client-s3';
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  S3_BUCKET as BUCKET,
  S3_ENDPOINT,
  S3_FORCE_PATH_STYLE,
  SIGNED_URL_TTL_SECONDS,
} from './env.js';

export { SIGNED_URL_TTL_SECONDS };
export const S3_BUCKET = BUCKET;

export const s3 = new S3Client({
  region: AWS_REGION,
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT } : {}),
  ...(S3_FORCE_PATH_STYLE ? { forcePathStyle: true } : {}),
  ...(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

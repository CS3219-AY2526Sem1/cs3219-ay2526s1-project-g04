// src/services/AttachmentService.ts

import { ulid } from 'ulid';
import {
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, S3_BUCKET, SIGNED_URL_TTL_SECONDS } from '../utils/s3.js';

const SAFE_NAME_RE = /[^\w.-]+/g;

/**
 * Sanitizes a filename by removing any characters that are not alphanumeric, hyphens, periods, or underscores, and then truncates the result to 150 characters.
 * @param {string} name - The filename to sanitize.
 * @returns {string} The sanitized filename.
 */
function sanitizeFilename(name: string) {
  return name.replace(SAFE_NAME_RE, '-').slice(0, 150);
}

/**
 * Returns a string in the format "YYYYMMDD" representing the current date.
 * @returns {string} The current date in the format "YYYYMMDD".
 */
function todayYmd() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Checks if the given MIME type is allowed for attachment uploads.
 * @param {string} mime - The MIME type to check.
 * @returns {boolean} True if the MIME type is allowed, false otherwise.
 */
function isAllowedContentType(mime: string) {
  return (
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    mime === 'text/plain' ||
    mime === 'application/octet-stream'
  );
}

export type SignUploadInput = {
  content_type: string;
  filename: string;
  // optional; when present we place the object under this prefix (e.g., "questions/two-sum")
  suggested_prefix?: string;
  // optional; default 5MB
  max_bytes?: number;
};

export type SignUploadResponse = {
  object_key: string; // where the object will live once uploaded
  upload_url: string; // presigned PUT URL
  expires_at: string; // ISO timestamp
  max_bytes: number; // soft limit (PUT can't strictly enforce; front-end should)
};

/**
 * Builds an object key for attachment uploads to S3.
 * @param {string} adminUserId - The ID of the admin user uploading the attachment.
 * @param {string} filename - The name of the file being uploaded.
 * @param {string} contentType - The MIME type of the file being uploaded.
 * @param {string} suggestedPrefix - An optional prefix to use when building the object key.
 * If present, the object key will be built in the format `<prefix>/<date>/<token>-<safe>`.
 * If not present, the object key will be built in the format `staging/<userId>/<sessionUlid>/<date>/<token>-<safe>`.
 * @param {string} sessionUlid - An optional session UUID to use when building the object key.
 * If present, the object key will include this value.
 * If not present, a randomly generated UUID will be used instead.
 * @returns {string} The object key to use when uploading the attachment to S3.
 */
export function buildObjectKey(args: {
  adminUserId: string;
  filename: string;
  contentType: string;
  suggestedPrefix?: string;
  sessionUlid?: string;
}) {
  const safe = sanitizeFilename(args.filename);
  const token = ulid().toLowerCase();
  const date = todayYmd();

  if (args.suggestedPrefix) {
    // editing existing question
    // e.g. 'questions/two-sum/20251010/ulid-diagram.png'
    return `${args.suggestedPrefix}/${date}/${token}-${safe}`;
  }

  // creating (no slug yet) -> staging
  // e.g. "staging/<userId>/<sessionUlid>/20251010/ulid-diagram.png"
  const sess = args.sessionUlid || ulid().toLowerCase();
  return `staging/${args.adminUserId}/${sess}/${date}/${token}-${safe}`;
}

/**
 * Signs a URL for uploading a file to S3.
 * @param {string} adminUserId - The ID of the admin user uploading the attachment.
 * @param {SignUploadInput} body - An object containing the required fields for signing the URL.
 * @param {string} sessionUlid - An optional session UUID to use when building the object key.
 * If present, the object key will include this value.
 * If not present, a randomly generated UUID will be used instead.
 * @returns {Promise<SignUploadResponse>} A promise that resolves with an object containing the signed upload URL, the object key, the maximum allowed bytes, and the expiration time of the signed URL.
 */
export async function signUploadUrl(
  adminUserId: string,
  body: SignUploadInput,
  sessionUlid?: string,
): Promise<SignUploadResponse> {
  const { content_type, filename, suggested_prefix, max_bytes } = body;

  if (!content_type || !filename) {
    throw new Error('content_type and filename are required');
  }

  if (!isAllowedContentType(content_type)) {
    throw new Error(`unsupported content type: ${content_type}`);
  }

  const objectKey = buildObjectKey({
    adminUserId,
    filename,
    contentType: content_type,
    suggestedPrefix: suggested_prefix,
    sessionUlid,
  });

  const put = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: objectKey,
    ContentType: content_type,
  });

  const upload_url = await getSignedUrl(s3, put, {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });

  const expires_at = new Date(
    Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();

  return {
    object_key: objectKey,
    upload_url,
    expires_at,
    max_bytes: max_bytes ?? 5 * 1024 * 1024,
  };
}

/**
 * Finalize staged attachments for a question.
 * This function takes an array of attachments with object keys starting with 'staging/' and copies them to their final location under 'questions/<questionId>'.
 * Attachments with object keys not starting with 'staging/' are assumed to be already in their final location and are left untouched.
 * The function returns a promise that resolves with an array of attachments with their final object keys and MIME types.
 * @param {string} questionId - The ID of the question.
 * @param {Array<{ object_key: string; mime: string; alt?: string }>} attachments - The array of attachments to finalize.
 * @returns {Promise<Array<{ object_key: string; mime: string; alt?: string }>>} A promise that resolves with an array of attachments with their final object keys and MIME types.
 */
export async function finalizeStagedAttachments(
  questionId: string,
  attachments: Array<{ object_key: string; mime: string; alt?: string }>,
): Promise<Array<{ object_key: string; mime: string; alt?: string }>> {
  const out: Array<{ object_key: string; mime: string; alt?: string }> = [];

  for (const att of attachments) {
    const srcKey = att.object_key;
    if (!srcKey.startsWith('staging/')) {
      // alr a final key (e.g. uploaded under questions/<id>)
      out.push(att);
      continue;
    }

    const baseName = srcKey.split('/').pop() || 'file';
    const destKey = buildObjectKey({
      adminUserId: 'finalise', // ignored in this path
      filename: baseName.replace(/^\w+-/, ''), // discard previous ulid
      contentType: att.mime,
      suggestedPrefix: `questions/${questionId}`,
    });

    // verify if object exists (HeadObject), skip if not found
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: srcKey }));

    // copy then delete
    await s3.send(
      new CopyObjectCommand({
        Bucket: S3_BUCKET,
        CopySource: `/${S3_BUCKET}/${encodeURIComponent(srcKey)}`,
        Key: destKey,
        ContentType: att.mime,
        MetadataDirective: 'REPLACE',
      }),
    );

    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: srcKey }));

    out.push({ object_key: destKey, mime: att.mime, alt: att.alt });
  }

  return out;
}

// src/services/AttachmentService.ts
import { ulid } from 'ulid';
import {
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  type GetObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, S3_BUCKET, SIGNED_URL_TTL_SECONDS } from '../utils/s3.js';

const SAFE_NAME_RE = /[^\w.-]+/g;

function sanitizeFilename(name: string) {
  return name.replace(SAFE_NAME_RE, '-').slice(0, 150);
}

function todayYmd() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

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
  suggested_prefix?: string;
  max_bytes?: number;
};

export type SignUploadResponse = {
  object_key: string;
  upload_url: string;
  expires_at: string;
  max_bytes: number;
};

export type SignViewOptions = {
  asAttachment?: boolean;
  filename?: string;
  contentTypeHint?: string;
};

export type SignViewResponse = {
  object_key: string;
  view_url: string;
  expires_at: string;
};

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
    return `${args.suggestedPrefix}/${date}/${token}-${safe}`;
  }

  const sess = args.sessionUlid || ulid().toLowerCase();
  return `staging/${args.adminUserId}/${sess}/${date}/${token}-${safe}`;
}

export async function signUploadUrl(
  adminUserId: string,
  body: SignUploadInput,
  sessionUlid?: string,
): Promise<SignUploadResponse> {
  const { content_type, filename, suggested_prefix, max_bytes } = body;
  if (!content_type || !filename)
    throw new Error('content_type and filename are required');
  if (!isAllowedContentType(content_type))
    throw new Error(`unsupported content type: ${content_type}`);

  const objectKey = buildObjectKey({
    adminUserId,
    filename,
    contentType: content_type,
    ...(suggested_prefix !== undefined
      ? { suggestedPrefix: suggested_prefix }
      : {}),
    ...(sessionUlid !== undefined ? { sessionUlid } : {}),
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
 * Finalize staged attachments to questions/<id>/...
 * Skips missing staging objects gracefully (logs + keeps original key).
 * If you prefer to fail the request instead, collect `missing[]` and throw a 400.
 */
export async function finalizeStagedAttachments(
  questionId: string,
  attachments: Array<{
    filename: string;
    object_key: string;
    mime: string;
    alt?: string;
  }>,
): Promise<
  Array<{ filename: string; object_key: string; mime: string; alt?: string }>
> {
  if (!attachments?.length) return [];

  const out: Array<{
    filename: string;
    object_key: string;
    mime: string;
    alt?: string;
  }> = [];
  // const missing: string[] = []; // enable if you want to fail on missing objects

  for (const att of attachments) {
    const srcKey = att.object_key;

    if (!srcKey.startsWith('staging/')) {
      out.push(att);
      continue;
    }

    // Ensure source exists; skip if not found
    let exists = true;
    try {
      await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: srcKey }));
    } catch (err: unknown) {
      exists = false;
      // missing.push(srcKey); // enable to aggregate and throw
      console.warn(
        `[attachments] staging object missing, skipping: s3://${S3_BUCKET}/${srcKey}`,
      );
    }

    if (!exists) {
      // Keep original to avoid crashing the create flow
      out.push(att);
      continue;
    }

    const baseName = srcKey.split('/').pop() || 'file';
    const destKey = buildObjectKey({
      adminUserId: 'finalize',
      filename: baseName.replace(/^\w+-/, ''), // drop old ULID
      contentType: att.mime,
      suggestedPrefix: `questions/${questionId}`,
    });

    await s3.send(
      new CopyObjectCommand({
        Bucket: S3_BUCKET,
        Key: destKey,
        CopySource: `${S3_BUCKET}/${srcKey}`, // no leading slash
        ContentType: att.mime,
        MetadataDirective: 'REPLACE',
      }),
    );

    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: srcKey }));

    out.push(
      att.alt !== undefined
        ? {
            filename: att.filename,
            object_key: destKey,
            mime: att.mime,
            alt: att.alt,
          }
        : { filename: att.filename, object_key: destKey, mime: att.mime },
    );
  }

  // If you want strict behavior:
  // if (missing.length) {
  //   const e = new Error(`Some attachments were not uploaded to staging: ${missing.join(', ')}`);
  //   (e as any).status = 400;
  //   throw e;
  // }

  return out;
}

export async function signViewUrl(
  objectKey: string,
  opts?: SignViewOptions,
): Promise<SignViewResponse> {
  await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }));

  const dispositionType = opts?.asAttachment ? 'attachment' : 'inline';
  const contentDisposition =
    opts?.filename && opts.filename.trim()
      ? `${dispositionType}; filename="${opts.filename.replace(/"/g, '')}"`
      : dispositionType;

  const getParams: GetObjectCommandInput = {
    Bucket: S3_BUCKET,
    Key: objectKey,
    ...(opts?.contentTypeHint
      ? { ResponseContentType: opts.contentTypeHint }
      : {}),
    ResponseContentDisposition: contentDisposition,
  };

  const view_url = await getSignedUrl(s3, new GetObjectCommand(getParams), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });

  const expires_at = new Date(
    Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();
  return { object_key: objectKey, view_url, expires_at };
}

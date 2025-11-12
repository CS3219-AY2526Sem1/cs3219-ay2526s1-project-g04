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
import { log } from '../utils/logger.js';

const SAFE_NAME_RE = /[^\w.-]+/g;

function diffMs(startNs: bigint, endNs: bigint): string {
  const nsDiff = endNs - startNs;
  const ms = Number(nsDiff) / 1_000_000;
  return ms.toFixed(2);
}

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

// Optional per-request context, e.g. correlation id from middleware
type Ctx = { correlation_id?: string };

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
  ctx?: Ctx,
): Promise<SignUploadResponse> {
  const started = process.hrtime.bigint();
  const { content_type, filename, suggested_prefix, max_bytes } = body;

  log.info({
    msg: 'attachments.sign_upload.begin',
    admin_user_id: adminUserId,
    filename,
    content_type,
    suggested_prefix: suggested_prefix ?? '',
    correlation_id: ctx?.correlation_id ?? '',
  });

  if (!content_type || !filename) {
    const e = new Error('content_type and filename are required');
    log.error({
      msg: 'attachments.sign_upload.error',
      error: String(e),
      correlation_id: ctx?.correlation_id ?? '',
    });
    throw e;
  }
  if (!isAllowedContentType(content_type)) {
    const e = new Error(`unsupported content type: ${content_type}`);
    log.error({
      msg: 'attachments.sign_upload.error',
      error: String(e),
      correlation_id: ctx?.correlation_id ?? '',
    });
    throw e;
  }

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

  let upload_url: string;
  try {
    upload_url = await getSignedUrl(s3, put, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  } catch (err: unknown) {
    log.error({
      msg: 'attachments.sign_upload.error',
      bucket: S3_BUCKET,
      key: objectKey,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      correlation_id: ctx?.correlation_id ?? '',
    });
    throw err;
  }

  const expires_at = new Date(
    Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();

  log.info({
    msg: 'attachments.sign_upload.success',
    bucket: S3_BUCKET,
    key: objectKey,
    ttl_seconds: SIGNED_URL_TTL_SECONDS,
    expires_at,
    max_bytes: max_bytes ?? 5 * 1024 * 1024,
    ms: diffMs(started, process.hrtime.bigint()),
    correlation_id: ctx?.correlation_id ?? '',
  });

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
  ctx?: Ctx,
): Promise<
  Array<{ filename: string; object_key: string; mime: string; alt?: string }>
> {
  const started = process.hrtime.bigint();
  log.info({
    msg: 'attachments.finalize.begin',
    question_id: questionId,
    count: attachments?.length ?? 0,
    correlation_id: ctx?.correlation_id ?? '',
  });

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
      log.info({
        msg: 'attachments.finalize.skip_non_staging',
        key: srcKey,
        correlation_id: ctx?.correlation_id ?? '',
      });
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
      log.warn({
        msg: 'attachments.finalize.head.missing',
        bucket: S3_BUCKET,
        key: srcKey,
        error:
          err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        correlation_id: ctx?.correlation_id ?? '',
      });
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

    try {
      await s3.send(
        new CopyObjectCommand({
          Bucket: S3_BUCKET,
          Key: destKey,
          CopySource: `${S3_BUCKET}/${srcKey}`, // no leading slash
          ContentType: att.mime,
          MetadataDirective: 'REPLACE',
        }),
      );
      log.info({
        msg: 'attachments.finalize.copy.ok',
        src: srcKey,
        dest: destKey,
        mime: att.mime,
        correlation_id: ctx?.correlation_id ?? '',
      });
    } catch (err: unknown) {
      log.error({
        msg: 'attachments.finalize.copy.error',
        src: srcKey,
        dest: destKey,
        error:
          err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        correlation_id: ctx?.correlation_id ?? '',
      });
      throw err;
    }

    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: srcKey }),
      );
      log.info({
        msg: 'attachments.finalize.delete.ok',
        key: srcKey,
        correlation_id: ctx?.correlation_id ?? '',
      });
    } catch (err: unknown) {
      // non-fatal: object already copied; log and proceed
      log.warn({
        msg: 'attachments.finalize.delete.warn',
        key: srcKey,
        error:
          err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        correlation_id: ctx?.correlation_id ?? '',
      });
    }

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

  log.info({
    msg: 'attachments.finalize.done',
    question_id: questionId,
    finalized_count: out.length,
    ms: diffMs(started, process.hrtime.bigint()),
    correlation_id: ctx?.correlation_id ?? '',
  });
  return out;
}

export async function signViewUrl(
  objectKey: string,
  opts?: SignViewOptions,
  ctx?: Ctx,
): Promise<SignViewResponse> {
  const started = process.hrtime.bigint();
  log.info({
    msg: 'attachments.sign_view.begin',
    key: objectKey,
    as_attachment: !!opts?.asAttachment,
    filename: opts?.filename ?? '',
    content_type_hint: opts?.contentTypeHint ?? '',
    correlation_id: ctx?.correlation_id ?? '',
  });

  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: objectKey }));
  } catch (err: unknown) {
    log.error({
      msg: 'attachments.sign_view.head.error',
      bucket: S3_BUCKET,
      key: objectKey,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      correlation_id: ctx?.correlation_id ?? '',
    });
    throw err;
  }

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

  let view_url: string;
  try {
    view_url = await getSignedUrl(s3, new GetObjectCommand(getParams), {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  } catch (err: unknown) {
    log.error({
      msg: 'attachments.sign_view.error',
      bucket: S3_BUCKET,
      key: objectKey,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      correlation_id: ctx?.correlation_id ?? '',
    });
    throw err;
  }

  const expires_at = new Date(
    Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  ).toISOString();

  log.info({
    msg: 'attachments.sign_view.success',
    bucket: S3_BUCKET,
    key: objectKey,
    ttl_seconds: SIGNED_URL_TTL_SECONDS,
    expires_at,
    ms: diffMs(started, process.hrtime.bigint()),
    correlation_id: ctx?.correlation_id ?? '',
  });

  return { object_key: objectKey, view_url, expires_at };
}

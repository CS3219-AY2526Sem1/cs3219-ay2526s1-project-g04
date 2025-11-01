// src/controllers/AdminAttachmentController.ts
import type { Request, Response } from 'express';
import { signUploadUrl, signViewUrl } from '../services/AttachmentService.js';
import { log } from '../utils/logger.js';

/**
 * Checks if the given key is allowed for the admin user.
 * A key is allowed if it is in the published questions area (i.e. `questions/...`)
 * or in the admin user's own staging area (i.e. `staging/<adminUserId>/...`).
 */
function isAllowedKeyForAdmin(
  userId: string | undefined,
  key: string,
): boolean {
  // allow published questions/*
  if (key.startsWith('questions/')) return true;

  // allow your own staging area
  if (userId && key.startsWith(`staging/${userId}/`)) return true;

  return false;
}

/**
 * POST /admin/attachments/sign-upload
 *
 * Signs a URL for uploading a file to S3.
 * The signed URL is restricted to either:
 *   - the admin user's own staging area: staging/<adminUserId>/...
 *   - or questions/... (publishing flow)
 *
 * Body:
 *   - content_type: string (required)
 *   - filename: string (required)
 *   - suggested_prefix?: string
 *
 * Headers:
 *   - x-upload-session?: string (ulid to group uploads)
 */
export async function signUpload(req: Request, res: Response) {
  // req.user is typed via module augmentation
  const user = req.user;

  if (!user || user.role !== 'admin') {
    log.warn(
      '[signUpload] forbidden: missing/invalid user role',
      user ? user.role : 'no-user',
    );
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    // Extract and validate body fields safely
    const body = req.body ?? {};
    const contentType =
      typeof body.content_type === 'string' ? body.content_type : undefined;
    const filename =
      typeof body.filename === 'string' ? body.filename : undefined;
    const suggestedPrefix =
      typeof body.suggested_prefix === 'string'
        ? body.suggested_prefix
        : undefined;

    if (!contentType || !filename) {
      log.warn('[signUpload] bad request: missing fields', {
        admin: user.sub ?? user.userId,
        contentTypePresent: !!contentType,
        filenamePresent: !!filename,
      });
      return res.status(400).json({
        error: 'content_type and filename are required (strings)',
      });
    }

    // optional header used to bucket uploads
    const sessionUlid = req.get('x-upload-session') || undefined;

    log.info('[signUpload] request', {
      admin: user.sub ?? user.userId,
      filename,
      contentType,
      suggestedPrefix,
      sessionUlid,
    });

    const payload = await signUploadUrl(
      user.sub ?? user.userId ?? 'admin',
      {
        content_type: contentType,
        filename,
        suggested_prefix: suggestedPrefix,
      },
      sessionUlid,
    );

    log.info('[signUpload] success', {
      admin: user.sub ?? user.userId,
      object_key: payload.object_key,
      max_bytes: payload.max_bytes,
      expires_at: payload.expires_at,
    });

    return res.json(payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    log.error('[signUpload] failed', {
      admin: user?.sub ?? user?.userId,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });

    return res.status(400).json({ error: 'unknown_error' });
  }
}

/**
 * POST /admin/attachments/sign-view
 *
 * Signs a URL for viewing/downloading an attachment.
 *
 * Body:
 *   - object_key: string (required)
 *   - as_attachment: boolean (optional)
 *   - filename: string (optional download filename)
 *   - content_type_hint: string (optional)
 *
 * Behavior:
 *   - Only allows signing:
 *       questions/*  OR
 *       staging/<this-admin>/*
 */
export async function signView(req: Request, res: Response) {
  const user = req.user;
  if (!user || user.role !== 'admin') {
    log.warn(
      '[signView] forbidden: missing/invalid user role',
      user ? user.role : 'no-user',
    );
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const body = req.body ?? {};
    const objectKey =
      typeof body.object_key === 'string' ? body.object_key : undefined;
    const asAttachment =
      typeof body.as_attachment === 'boolean' ? body.as_attachment : false;
    const filename =
      typeof body.filename === 'string' ? body.filename : undefined;
    const contentTypeHint =
      typeof body.content_type_hint === 'string'
        ? body.content_type_hint
        : undefined;

    if (!objectKey) {
      log.warn('[signView] bad request: missing object_key', {
        admin: user.sub ?? user.userId,
      });
      return res.status(400).json({ error: 'object_key is required (string)' });
    }

    // enforce prefix policy
    const adminId = user.sub ?? user.userId;
    if (!isAllowedKeyForAdmin(adminId, objectKey)) {
      log.warn('[signView] key_not_allowed', {
        admin: adminId,
        attempted_key: objectKey,
      });
      return res.status(403).json({ error: 'key_not_allowed' });
    }

    log.info('[signView] request', {
      admin: adminId,
      object_key: objectKey,
      as_attachment: asAttachment,
      filename,
      contentTypeHint,
    });

    const payload = await signViewUrl(objectKey, {
      ...(asAttachment ? { asAttachment } : {}),
      ...(filename !== undefined ? { filename } : {}),
      ...(contentTypeHint !== undefined ? { contentTypeHint } : {}),
    });

    log.info('[signView] success', {
      admin: adminId,
      object_key: payload.object_key,
      expires_at: payload.expires_at,
    });

    return res.json(payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    // Map common S3-ish "not found" to 404, and log appropriately
    if (msg.includes('NotFound') || msg.includes('404')) {
      log.warn('[signView] object_not_found', {
        admin: user.sub ?? user.userId,
        error: msg,
      });
      return res.status(404).json({ error: 'object_not_found' });
    }

    log.error('[signView] failed', {
      admin: user.sub ?? user.userId,
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
    });

    return res.status(400).json({ error: msg || 'unknown_error' });
  }
}

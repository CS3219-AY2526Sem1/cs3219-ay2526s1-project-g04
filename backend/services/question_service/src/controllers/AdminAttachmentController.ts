// src/controllers/AdminAttachmentController.ts
import type { Request, Response } from 'express';
import { signUploadUrl, signViewUrl } from '../services/AttachmentService.js';

/**
 * Checks if the given key is allowed for the admin user.
 * A key is allowed if it is in the published questions area (i.e. `questions/...`) or in the admin user's own staging area (i.e. `staging/<adminUserId>/...`).
 * @param userId The ID of the admin user or undefined.
 * @param key The key to check.
 * @returns True if the key is allowed, false otherwise.
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
 * Signs a URL for uploading a file to S3.
 * The signed URL is restricted to the admin user's own staging area (i.e. `staging/<adminUserId>/...`).
 * The signed URL is also restricted to the published questions area (i.e. `questions/...`).
 * @param req Request object
 * @param res Response object
 * @returns Promise that resolves with a JSON object containing the signed upload URL, object key, maximum allowed bytes, and expiration time of the signed URL.
 */
export async function signUpload(req: Request, res: Response) {
  try {
    // req.user is now typed via module augmentation
    const user = req.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }

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
      return res
        .status(400)
        .json({ error: 'content_type and filename are required (strings)' });
    }

    // optional header
    const sessionUlid = req.get('x-upload-session') || undefined;

    const payload = await signUploadUrl(
      user.sub ?? user.userId ?? 'admin',
      {
        content_type: contentType,
        filename,
        suggested_prefix: suggestedPrefix,
      },
      sessionUlid,
    );

    return res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return res.status(400).json({ error: message });
  }
}

/**
 * Signs a URL for viewing an attachment.
 * - `object_key` (string): The S3 object key to sign.
 * - `as_attachment` (boolean): If true, the object will be signed as an attachment.
 * - `filename` (string): An optional filename to include in the signed URL's Content-Disposition header.
 * - `content_type_hint` (string): An optional MIME type to include in the signed URL's Content-Type header.
 * - Returns a JSON response with the signed URL, object key, and expiration time.
 * - Throws a 400 on invalid requests, a 404 if the object is not found, and a 403 if the user is not an admin.
 */
export async function signView(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }

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
      return res.status(400).json({ error: 'object_key is required (string)' });
    }

    // Basic containment check — keeps presigns inside known prefixes
    const userId = user.sub ?? user.userId;
    if (!isAllowedKeyForAdmin(userId, objectKey)) {
      return res.status(403).json({ error: 'key_not_allowed' });
    }

    const payload = await signViewUrl(objectKey, {
      ...(asAttachment ? { asAttachment } : {}),
      ...(filename !== undefined ? { filename } : {}),
      ...(contentTypeHint !== undefined ? { contentTypeHint } : {}),
    });

    return res.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    // Map common S3 errors to nicer responses
    if (message.includes('NotFound') || message.includes('404')) {
      return res.status(404).json({ error: 'object_not_found' });
    }
    return res.status(400).json({ error: message });
  }
}

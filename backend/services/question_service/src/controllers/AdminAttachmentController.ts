// src/controllers/AdminAttachmentController.ts
import type { Request, Response } from 'express';
import { signUploadUrl } from '../services/AttachmentService.js';

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

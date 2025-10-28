// src/controllers/AdminAttachmentController.ts
import type { Request, Response } from 'express';
import { signUploadUrl } from '../services/AttachmentService.js';

export async function signUpload(req: Request, res: Response) {
  try {
    // assumes your auth middleware added req.user = { sub: string, role: 'admin' | ... }
    const user = (req as any).user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { content_type, filename, suggested_prefix } = req.body ?? {};
    const sessionUlid = req.headers['x-upload-session'] as string | undefined; // optional hint

    const payload = await signUploadUrl(
      user.sub || user.userId || 'admin',
      { content_type, filename, suggested_prefix },
      sessionUlid,
    );

    return res.json(payload);
  } catch (err: any) {
    return res.status(400).json({ error: String(err.message || err) });
  }
}

// src/middleware/auth.ts (mvp gate for admin)

import { Request, Response, NextFunction } from 'express';

export function requireRole(role: 'admin' | 'service') {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = (req.headers['x-role'] || '').toString();

    if (r === role) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

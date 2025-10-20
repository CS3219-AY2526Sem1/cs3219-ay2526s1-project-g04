import { Request, Response } from 'express';
import { prisma } from '../repositories/prisma';
import { resolve } from 'path';

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (x) => {
        clearTimeout(t);
        resolve(x);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function healthz(_req: Request, res: Response) {
  // liveness: process is running
  res.json({ ok: true });
}

export async function readyz(_req: Request, res: Response) {
  const checks: Record<string, { ok: boolean; error?: string }> = {
    db: { ok: false },
    // objectStorage: {ok: false},
  };

  // db check
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 1000);
    checks.db.ok = true;
  } catch (e: any) {
    checks.db.ok = false;
    checks.db.error = e?.message ?? 'unknown';
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;
  res.status(status).json({ ok: allOk, checks });
}

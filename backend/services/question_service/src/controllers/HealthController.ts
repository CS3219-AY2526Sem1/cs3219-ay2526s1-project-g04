// src/controllers/health.ts
import type { Request, Response } from 'express';
import { prisma } from '../repositories/prisma.js';

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

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

type Check = { ok: boolean; error?: string };

type Checks = { db: Check } & Record<string, Check>;

export async function healthz(_req: Request, res: Response) {
  // Liveness: process is up
  res.json({ ok: true });
}

export async function readyz(_req: Request, res: Response) {
  // Readiness: dependencies reachable
  const checks: Checks = {
    db: { ok: false },
    // s3: {ok: false}
  };

  try {
    // Using executeRaw since we don't care about rows
    await withTimeout(prisma.$executeRaw`SELECT 1`, 1000);
    checks.db.ok = true;
  } catch (e) {
    checks.db.ok = false;
    const message = errMsg(e);
    // Don’t leak internals in production
    if (process.env['NODE_ENV'] !== 'production') checks.db.error = message;
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({ ok: allOk, checks });
}

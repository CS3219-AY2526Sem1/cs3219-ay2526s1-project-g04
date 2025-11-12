// src/controllers/HealthController.ts
import type { Request, Response } from 'express';
import { prisma } from '../repositories/prisma.js';
import { log } from '../utils/logger.js';
import { s3, S3_BUCKET } from '../utils/s3.js';
import { HeadBucketCommand } from '@aws-sdk/client-s3';

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
type Checks = { db: Check; s3: Check } & Record<string, Check>;

export async function healthz(req: Request, res: Response) {
  // Liveness: process is up
  log.info('[healthz] liveness probe', {
    ip: req.ip,
    ua: req.get('user-agent'),
  });

  res.json({ ok: true });
}

export async function readyz(req: Request, res: Response) {
  const startMs = Date.now();

  // Readiness: dependencies reachable
  const checks: Checks = {
    db: { ok: false },
    s3: { ok: false },
  };

  // DB readiness
  try {
    // Using executeRaw since we don't care about rows
    await withTimeout(prisma.$executeRaw`SELECT 1`, 1000);
    checks.db.ok = true;
  } catch (e) {
    checks.db.ok = false;
    const message = errMsg(e);
    // Don't leak internals in production
    if (process.env['NODE_ENV'] !== 'production') {
      checks.db.error = message;
    }
    log.warn('[readyz] db check failed', {
      ip: req.ip,
      ua: req.get('user-agent'),
      error: message,
    });
  }

  try {
    if (!S3_BUCKET) {
      throw new Error('S3_BUCKET not configured');
    }

    await withTimeout(
      s3.send(
        new HeadBucketCommand({
          Bucket: S3_BUCKET,
        }),
      ),
      1500,
    );

    checks.s3.ok = true;
  } catch (e) {
    checks.s3.ok = false;
    const message = errMsg(e);

    if (process.env['NODE_ENV'] !== 'production') {
      checks.s3.error = message;
    }

    log.warn('[readyz] s3 check failed', {
      ip: req.ip,
      ua: req.get('user-agent'),
      bucket: S3_BUCKET,
      error: message,
    });
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const statusCode = allOk ? 200 : 503;
  const durationMs = Date.now() - startMs;

  // Log final readiness result
  if (allOk) {
    log.info('[readyz] ready', {
      ip: req.ip,
      ua: req.get('user-agent'),
      statusCode,
      durationMs,
      checks,
    });
  } else {
    log.warn('[readyz] not ready', {
      ip: req.ip,
      ua: req.get('user-agent'),
      statusCode,
      durationMs,
      checks,
    });
  }

  res.status(statusCode).json({ ok: allOk, checks });
}

// src/middleware/requestLogger.ts
import type { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';

// convert hrtime diff to ms string with 2 decimals
function diffMs(startNs: bigint, endNs: bigint): string {
  const nsDiff = endNs - startNs;
  const ms = Number(nsDiff) / 1_000_000;
  return ms.toFixed(2);
}

/**
 * logs every completed HTTP request:
 * - method, path
 * - status code
 * - response time (ms)
 * - client ip
 * - role (from req.user if optionalAuth set it)
 * - correlation_id (best effort from headers / locals)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const endNs = process.hrtime.bigint();
    const durationMs = diffMs(startNs, endNs);

    // best-effort correlation id
    const correlationId =
      (res.locals && (res.locals['correlation_id'] as string)) ||
      (req.headers['x-correlation-id'] as string | undefined) ||
      (req.headers['x-request-id'] as string | undefined) ||
      '';

    // role from auth (set by optionalAuth)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = (req as any).user?.role ?? '';

    // prefer x-forwarded-for if behind proxy; fall back to req.ip
    const ipHeader = req.headers['x-forwarded-for'];
    const remoteIp = Array.isArray(ipHeader)
      ? ipHeader[0]
      : (ipHeader ?? req.ip ?? '');

    // structured log object → goes to console + file via logger.ts
    log.info({
      msg: 'http_request',
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ms: durationMs,
      ip: remoteIp,
      role,
      correlation_id: correlationId,
    });
  });

  next();
}

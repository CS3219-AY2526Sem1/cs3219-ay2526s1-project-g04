// src/middleware/auth.ts
// Auth0 JWT verification (RS256 via JWKS) + role/permission gates

import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { log } from '../utils/logger.js';

type UserRole = 'admin' | 'service' | 'anonymous';

const ISSUER = process.env['JWT_ISSUER'] ?? '';
const JWKS_URL = process.env['JWKS_URL'] ?? '';
const AUDIENCE = process.env['JWT_AUDIENCE']; // recommended for Auth0 APIs
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// ---- JWKS (cached) ----
const getJWKS = (() => {
  let set: ReturnType<typeof createRemoteJWKSet> | null = null;
  return () => {
    if (!set) {
      if (!JWKS_URL) throw new Error('JWKS_URL not configured');
      set = createRemoteJWKSet(new URL(JWKS_URL), { cacheMaxAge: 10 * 60_000 }); // 10m
    }
    return set;
  };
})();

/** Extract role from common claim shapes (Auth0-first) */
function resolveRole(payload: JWTPayload): UserRole {
  // Auth0 RBAC: permissions[] claim (when API has RBAC + "Add Permissions in the Access Token")
  const perms = Array.isArray((payload as any).permissions)
    ? ((payload as any).permissions as string[])
    : [];

  if (perms.includes('question:admin')) return 'admin';
  if (perms.includes('question:service') || perms.includes('question:select'))
    return 'service';

  // Scopes (string or array) — fallback
  const scopeStr =
    typeof (payload as any).scope === 'string'
      ? (payload as any).scope
      : undefined;
  const scopeArr = Array.isArray((payload as any).scopes)
    ? ((payload as any).scopes as string[])
    : (scopeStr?.split(' ') ?? []);
  if (scopeArr.includes('question:admin')) return 'admin';
  if (
    scopeArr.includes('question:service') ||
    scopeArr.includes('question:select')
  )
    return 'service';

  // Explicit role / roles array — generic fallback
  const r = (payload as any).role;
  if (r === 'admin' || r === 'service') return r;
  const roles = (payload as any).roles;
  if (Array.isArray(roles)) {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('service')) return 'service';
  }

  // Client Credentials hint (Auth0 sets gty=client-credentials, azp=<client_id>)
  if ((payload as any).gty === 'client-credentials' || (payload as any).azp) {
    // treat as service if no stronger signal is present
    return 'service';
  }

  return 'anonymous';
}

function devFallbackFromHeaders(req: Request) {
  // For local/dev convenience: X-Role and X-User headers
  const roleRaw = (req.headers['x-role'] ?? '').toString().toLowerCase();
  const role: UserRole =
    roleRaw === 'admin'
      ? 'admin'
      : roleRaw === 'service'
        ? 'service'
        : 'anonymous';

  const sub = (req.headers['x-user'] ?? 'dev-user').toString();
  return { sub, role } as const;
}

async function verifyToken(token: string) {
  return jwtVerify(token, getJWKS(), {
    issuer: ISSUER || undefined, // require exact match if provided
    audience: AUDIENCE, // require audience if provided
    clockTolerance: 5, // small skew
  });
}

/** Attach req.user if a valid Bearer JWT is present (no errors thrown). */
export function optionalAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        if (
          NODE_ENV !== 'production' &&
          (req.headers['x-role'] || req.headers['x-user'])
        ) {
          const { sub, role } = devFallbackFromHeaders(req);
          (req as any).user = { sub, role, raw: { dev: true } };
        }
        return next();
      }

      const token = auth.slice('Bearer '.length);
      const { payload } = await verifyToken(token);

      const role = resolveRole(payload);
      const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
      (req as any).user = {
        sub,
        userId: sub,
        role,
        permissions: Array.isArray((payload as any).permissions)
          ? ((payload as any).permissions as string[])
          : undefined,
        scopes:
          typeof (payload as any).scope === 'string'
            ? (payload as any).scope.split(' ')
            : undefined,
        raw: payload as Record<string, unknown>,
      };
      return next();
    } catch {
      // swallow errors for optional auth
      return next();
    }
  };
}

/** Require a valid JWT; attach req.user or 401 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        if (
          NODE_ENV !== 'production' &&
          (req.headers['x-role'] || req.headers['x-user'])
        ) {
          const { sub, role } = devFallbackFromHeaders(req);
          (req as any).user = { sub, role, raw: { dev: true } };
          return next();
        }
        return res.status(401).json({ error: 'unauthorized' });
      }

      const token = auth.slice('Bearer '.length);
      const { payload } = await verifyToken(token);

      const role = resolveRole(payload);
      const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
      (req as any).user = {
        sub,
        userId: sub,
        role,
        permissions: Array.isArray((payload as any).permissions)
          ? ((payload as any).permissions as string[])
          : undefined,
        scopes:
          typeof (payload as any).scope === 'string'
            ? (payload as any).scope.split(' ')
            : undefined,
        raw: payload as Record<string, unknown>,
      };
      return next();
    } catch (err) {
      log.error(err);
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

/** Require a specific role (admin OR service) */
export function requireRole(role: Exclude<UserRole, 'anonymous'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = (req as any).user?.role as UserRole | undefined;
    if (r === role) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

/** Require any role from a set (e.g., ['admin','service']) */
export function requireAnyRole(roles: Exclude<UserRole, 'anonymous'>[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = (req as any).user?.role as UserRole | undefined;
    if (r && roles.includes(r as any)) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

/** Require an Auth0 permission (e.g., 'question:select' or 'question:admin') */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms: string[] | undefined = (req as any).user?.permissions;
    const scopes: string[] | undefined = (req as any).user?.scopes;
    if (
      (perms && perms.includes(permission)) ||
      (scopes && scopes.includes(permission))
    ) {
      return next();
    }
    return res.status(403).json({ error: 'forbidden' });
  };
}

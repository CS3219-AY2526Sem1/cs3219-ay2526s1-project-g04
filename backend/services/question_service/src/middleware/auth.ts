// src/middleware/auth.ts (mvp gate for admin)

import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

type UserRole = 'admin' | 'service' | 'anonymous';

const ISSUER = process.env['JWT_ISSUER'] ?? '';
const JWKS_URL = process.env['JWKS_URL'] ?? '';
const AUDIENCE = process.env['JWT_AUDIENCE']; // optional
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

// Cache the JWKS client
const getJWKS = (() => {
  let set: ReturnType<typeof createRemoteJWKSet> | null = null;
  return () => {
    if (!set) {
      if (!JWKS_URL) throw new Error('JWKS_URL not configured');
      set = createRemoteJWKSet(new URL(JWKS_URL));
    }
    return set;
  };
})();

/** Extract a role from common claim shapes */
function resolveRole(payload: JWTPayload): UserRole {
  // 1) explicit `role`
  const r = payload['role'];
  if (r === 'admin' || r === 'service') return r;

  // 2) `roles` array
  const roles = payload['roles'];
  if (Array.isArray(roles)) {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('service')) return 'service';
  }

  // 3) `scope` / `scopes`
  const scope =
    typeof payload['scope'] === 'string' ? payload['scope'] : undefined;
  const scopes = Array.isArray(payload['scopes'])
    ? (payload['scopes'] as string[])
    : scope?.split(' ');
  if (scopes?.includes('question:admin')) return 'admin';
  if (scopes?.includes('question:service')) return 'service';

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

/** Verify Authorization: Bearer <jwt> if present; attach req.user */
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
          req.user = { sub, role, raw: { dev: true } };
        }
        return next();
      }

      const token = auth.slice('Bearer '.length);
      const { payload } = await jwtVerify(token, getJWKS(), {
        issuer: ISSUER || undefined,
        audience: AUDIENCE,
        // allow small clock skew
        clockTolerance: 5,
      });

      const role = resolveRole(payload);
      const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
      req.user = {
        sub,
        userId: sub,
        role,
        scopes:
          typeof payload.scope === 'string'
            ? payload.scope.split(' ')
            : undefined,
        raw: payload as Record<string, unknown>,
      };
      return next();
    } catch {
      // On optional auth, just proceed unauthenticated
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
          req.user = { sub, role, raw: { dev: true } };
          return next();
        }
        return res.status(401).json({ error: 'unauthorized' });
      }

      const token = auth.slice('Bearer '.length);
      const { payload } = await jwtVerify(token, getJWKS(), {
        issuer: ISSUER || undefined,
        audience: AUDIENCE,
        clockTolerance: 5,
      });

      const role = resolveRole(payload);
      const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
      req.user = {
        sub,
        userId: sub,
        role,
        scopes:
          typeof payload.scope === 'string'
            ? payload.scope.split(' ')
            : undefined,
        raw: payload as Record<string, unknown>,
      };
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  };
}

/** Require a specific role (admin OR service) */
export function requireRole(role: Exclude<UserRole, 'anonymous'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = req.user?.role;
    if (r === role) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

/** Require any role from the set (e.g., ['admin','service']) */
export function requireAnyRole(roles: Exclude<UserRole, 'anonymous'>[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = req.user?.role;
    if (r && roles.includes(r)) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}
